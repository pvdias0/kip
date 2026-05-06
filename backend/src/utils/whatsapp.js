import pool from "../config/database.js";
import { getWhatsAppConfig } from "../config/whatsapp.js";

function toJson(value) {
  return JSON.stringify(value ?? {});
}

function toDateFromUnixTimestamp(value) {
  if (!value) {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return new Date(numericValue * 1000);
}

function parseJsonResponse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function normalizePhoneDigits(input) {
  return String(input ?? "").replace(/\D/g, "");
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildBrazilianPhoneVariants(digits) {
  const variants = [];
  const hasCountryCode = digits.startsWith("55");
  const nationalDigits = hasCountryCode ? digits.slice(2) : digits;

  if (nationalDigits.length === 10) {
    variants.push(`${nationalDigits.slice(0, 2)}9${nationalDigits.slice(2)}`);
  }

  if (nationalDigits.length === 11 && nationalDigits[2] === "9") {
    variants.push(`${nationalDigits.slice(0, 2)}${nationalDigits.slice(3)}`);
  }

  if (hasCountryCode) {
    return variants.map((value) => `55${value}`);
  }

  return variants;
}

function buildWhatsAppPhoneNumberCandidates(input) {
  const digits = normalizePhoneDigits(input);

  if (digits.length < 10 || digits.length > 15) {
    return [];
  }

  const brazilianVariants = buildBrazilianPhoneVariants(digits);

  if (digits.length <= 11 && !digits.startsWith("55")) {
    return uniqueValues(
      [`+55${digits}`, ...brazilianVariants.map((value) => `+55${value}`), `+${digits}`],
    );
  }

  return uniqueValues([`+${digits}`, ...brazilianVariants.map((value) => `+${value}`)]);
}

export function normalizeWhatsAppPhoneNumber(input) {
  return buildWhatsAppPhoneNumberCandidates(input)[0] || null;
}

export async function syncWhatsAppChannelConfig(client = pool) {
  const config = getWhatsAppConfig();

  if (!config.wabaId || !config.phoneNumberId || !config.businessPhoneNumber) {
    return null;
  }

  const result = await client.query(
    `
      INSERT INTO whatsapp_channel_config (
        waba_id,
        phone_number_id,
        business_phone_number,
        app_id,
        webhook_callback_url,
        status,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, 'configured', NOW())
      ON CONFLICT (phone_number_id)
      DO UPDATE SET
        waba_id = EXCLUDED.waba_id,
        business_phone_number = EXCLUDED.business_phone_number,
        app_id = EXCLUDED.app_id,
        webhook_callback_url = EXCLUDED.webhook_callback_url,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *
    `,
    [
      config.wabaId,
      config.phoneNumberId,
      config.businessPhoneNumber,
      config.appId || null,
      config.webhookCallbackUrl || null,
    ],
  );

  return result.rows[0] || null;
}

async function findContactByPhoneNumber(phoneNumberE164, client = pool) {
  if (!phoneNumberE164) {
    return null;
  }

  const e164Candidates = buildWhatsAppPhoneNumberCandidates(phoneNumberE164);
  const digitCandidates = uniqueValues(
    e164Candidates.map((value) => normalizePhoneDigits(value)),
  );

  if (e164Candidates.length === 0 || digitCandidates.length === 0) {
    return null;
  }

  const result = await client.query(
    `
      SELECT id, user_id
      FROM user_whatsapp_contacts
      WHERE phone_number_e164 = ANY($1::text[])
        OR regexp_replace(COALESCE(phone_number_e164, ''), '\\D', '', 'g') = ANY($2::text[])
        OR regexp_replace(COALESCE(phone_number, ''), '\\D', '', 'g') = ANY($2::text[])
      ORDER BY
        CASE
          WHEN phone_number_e164 = $3 THEN 0
          WHEN regexp_replace(COALESCE(phone_number_e164, ''), '\\D', '', 'g') = $4 THEN 1
          ELSE 2
        END,
        id
      LIMIT 1
    `,
    [
      e164Candidates,
      digitCandidates,
      e164Candidates[0],
      digitCandidates[0],
    ],
  );

  return result.rows[0] || null;
}

export async function getWhatsAppContactByPhoneNumber(
  phoneNumberE164,
  client = pool,
) {
  if (!phoneNumberE164) {
    return null;
  }

  const e164Candidates = buildWhatsAppPhoneNumberCandidates(phoneNumberE164);
  const digitCandidates = uniqueValues(
    e164Candidates.map((value) => normalizePhoneDigits(value)),
  );

  if (e164Candidates.length === 0 || digitCandidates.length === 0) {
    return null;
  }

  const result = await client.query(
    `
      SELECT
        c.id AS contact_id,
        c.user_id,
        c.phone_number,
        c.phone_number_e164,
        c.opted_in,
        c.opted_in_at,
        c.opt_in_source,
        c.opt_out_at,
        c.verification_status,
        u.name AS user_name,
        u.email AS user_email,
        p.receive_support_messages,
        p.receive_transactional_messages,
        p.receive_weekly_summary,
        p.receive_budget_alerts
      FROM user_whatsapp_contacts c
      INNER JOIN users u ON u.id = c.user_id
      LEFT JOIN user_whatsapp_preferences p ON p.user_id = c.user_id
      WHERE c.phone_number_e164 = ANY($1::text[])
        OR regexp_replace(COALESCE(c.phone_number_e164, ''), '\\D', '', 'g') = ANY($2::text[])
        OR regexp_replace(COALESCE(c.phone_number, ''), '\\D', '', 'g') = ANY($2::text[])
      ORDER BY
        CASE
          WHEN c.phone_number_e164 = $3 THEN 0
          WHEN regexp_replace(COALESCE(c.phone_number_e164, ''), '\\D', '', 'g') = $4 THEN 1
          ELSE 2
        END,
        c.id
      LIMIT 1
    `,
    [
      e164Candidates,
      digitCandidates,
      e164Candidates[0],
      digitCandidates[0],
    ],
  );

  return result.rows[0] || null;
}

export function extractInboundWhatsAppMessages(payload) {
  if (!payload || payload.object !== "whatsapp_business_account") {
    return [];
  }

  const messages = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages") {
        continue;
      }

      for (const message of change.value?.messages || []) {
        messages.push(message);
      }
    }
  }

  return messages;
}

export function getTextFromWhatsAppMessage(message) {
  if (!message || typeof message !== "object") {
    return "";
  }

  if (message.type === "text") {
    return message.text?.body?.trim() || "";
  }

  if (message.type === "button") {
    return message.button?.text?.trim() || message.button?.payload?.trim() || "";
  }

  if (message.type === "interactive") {
    const interactive = message.interactive || {};

    if (interactive.type === "button_reply") {
      return (
        interactive.button_reply?.title?.trim() ||
        interactive.button_reply?.id?.trim() ||
        ""
      );
    }

    if (interactive.type === "list_reply") {
      return (
        interactive.list_reply?.title?.trim() ||
        interactive.list_reply?.description?.trim() ||
        interactive.list_reply?.id?.trim() ||
        ""
      );
    }

    if (interactive.type === "nfm_reply") {
      return interactive.nfm_reply?.body?.trim() || "";
    }
  }

  return "";
}

async function findLastInboundMessageAt(
  { userId, contactId, phoneNumber, relatedMessageId },
  client = pool,
) {
  if (relatedMessageId) {
    const relatedMessage = await client.query(
      `
        SELECT COALESCE(sent_at, created_at) AS inbound_at
        FROM whatsapp_messages
        WHERE meta_message_id = $1
          AND direction = 'incoming'
        LIMIT 1
      `,
      [relatedMessageId],
    );

    const inboundAt = relatedMessage.rows[0]?.inbound_at;

    if (inboundAt) {
      return new Date(inboundAt);
    }
  }

  if (contactId) {
    const contactMessage = await client.query(
      `
        SELECT COALESCE(sent_at, created_at) AS inbound_at
        FROM whatsapp_messages
        WHERE contact_id = $1
          AND direction = 'incoming'
        ORDER BY COALESCE(sent_at, created_at) DESC
        LIMIT 1
      `,
      [contactId],
    );

    const inboundAt = contactMessage.rows[0]?.inbound_at;

    if (inboundAt) {
      return new Date(inboundAt);
    }
  }

  if (userId) {
    const userMessage = await client.query(
      `
        SELECT COALESCE(sent_at, created_at) AS inbound_at
        FROM whatsapp_messages
        WHERE user_id = $1
          AND direction = 'incoming'
        ORDER BY COALESCE(sent_at, created_at) DESC
        LIMIT 1
      `,
      [userId],
    );

    const inboundAt = userMessage.rows[0]?.inbound_at;

    if (inboundAt) {
      return new Date(inboundAt);
    }
  }

  if (phoneNumber) {
    const phoneMessage = await client.query(
      `
        SELECT COALESCE(sent_at, created_at) AS inbound_at
        FROM whatsapp_messages
        WHERE phone_number = $1
          AND direction = 'incoming'
        ORDER BY COALESCE(sent_at, created_at) DESC
        LIMIT 1
      `,
      [phoneNumber],
    );

    const inboundAt = phoneMessage.rows[0]?.inbound_at;

    if (inboundAt) {
      return new Date(inboundAt);
    }
  }

  return null;
}

export async function claimIncomingMessageForAssistant(
  metaMessageId,
  client = pool,
) {
  if (!metaMessageId) {
    return false;
  }

  const result = await client.query(
    `
      UPDATE whatsapp_messages
      SET
        status = 'processing',
        updated_at = NOW()
      WHERE meta_message_id = $1
        AND direction = 'incoming'
        AND status = 'received'
      RETURNING id
    `,
    [metaMessageId],
  );

  return Boolean(result.rows[0]?.id);
}

export async function markIncomingMessageAssistantStatus(
  metaMessageId,
  status,
  errorMessage = null,
  client = pool,
) {
  if (!metaMessageId) {
    return;
  }

  await client.query(
    `
      UPDATE whatsapp_messages
      SET
        status = $2::varchar,
        error_message = CASE
          WHEN $2::varchar = 'failed' THEN $3::text
          ELSE NULL
        END,
        updated_at = NOW()
      WHERE meta_message_id = $1
        AND direction = 'incoming'
    `,
    [metaMessageId, status, errorMessage],
  );
}

export async function sendWhatsAppTextMessage(
  {
    to,
    body,
    userId = null,
    contactId = null,
    relatedMessageId = null,
    enforceReplyWindow = true,
    client = pool,
  },
) {
  const config = getWhatsAppConfig();

  if (!config.phoneNumberId || !config.accessToken) {
    throw new Error("WhatsApp Cloud API nao configurada para envio");
  }

  const normalizedPhoneNumber = normalizeWhatsAppPhoneNumber(to);

  if (!normalizedPhoneNumber) {
    throw new Error("Numero de WhatsApp invalido para envio");
  }

  if (enforceReplyWindow) {
    const lastInboundAt = await findLastInboundMessageAt(
      {
        userId,
        contactId,
        phoneNumber: normalizedPhoneNumber,
        relatedMessageId,
      },
      client,
    );

    if (!lastInboundAt) {
      throw new Error(
        "Nao foi possivel confirmar a ultima mensagem do usuario para responder dentro da janela de 24 horas",
      );
    }

    const windowExpiresAt = addHours(lastInboundAt, config.replyWindowHours);

    if (windowExpiresAt.getTime() < Date.now()) {
      throw new Error(
        "Nao e permitido enviar mensagens fora da janela de atendimento de 24 horas",
      );
    }
  }

  const requestPayload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizedPhoneNumber,
    type: "text",
    text: {
      preview_url: false,
      body,
    },
  };

  const response = await fetch(
    `${config.apiBaseUrl}/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    },
  );

  const rawResponseText = await response.text();
  const responseBody = parseJsonResponse(rawResponseText) || {
    raw: rawResponseText,
  };

  if (!response.ok) {
    throw new Error(
      responseBody?.error?.message || "Falha ao enviar mensagem pelo WhatsApp",
    );
  }

  const metaMessageId = responseBody?.messages?.[0]?.id || null;

  await client.query(
    `
      INSERT INTO whatsapp_messages (
        user_id,
        contact_id,
        direction,
        type,
        status,
        phone_number,
        meta_message_id,
        related_message_id,
        payload,
        raw_event,
        sent_at,
        updated_at
      )
      VALUES (
        $1, $2, 'outgoing', 'text', 'accepted', $3, $4, $5, $6::jsonb, $7::jsonb, NOW(), NOW()
      )
      ON CONFLICT (meta_message_id)
      DO UPDATE SET
        user_id = COALESCE(EXCLUDED.user_id, whatsapp_messages.user_id),
        contact_id = COALESCE(EXCLUDED.contact_id, whatsapp_messages.contact_id),
        status = EXCLUDED.status,
        phone_number = EXCLUDED.phone_number,
        related_message_id = COALESCE(EXCLUDED.related_message_id, whatsapp_messages.related_message_id),
        payload = EXCLUDED.payload,
        raw_event = EXCLUDED.raw_event,
        sent_at = COALESCE(whatsapp_messages.sent_at, EXCLUDED.sent_at),
        updated_at = NOW()
    `,
    [
      userId,
      contactId,
      normalizedPhoneNumber,
      metaMessageId,
      relatedMessageId,
      toJson(requestPayload),
      toJson(responseBody),
    ],
  );

  return {
    metaMessageId,
    responseBody,
  };
}

export function getDateFromWhatsAppTimestamp(value) {
  return toDateFromUnixTimestamp(value);
}

async function saveIncomingMessage(message, changeValue, client = pool) {
  const normalizedPhoneNumber = normalizeWhatsAppPhoneNumber(message.from);
  const linkedContact = await findContactByPhoneNumber(normalizedPhoneNumber, client);

  await client.query(
    `
      INSERT INTO whatsapp_messages (
        user_id,
        contact_id,
        direction,
        type,
        status,
        phone_number,
        meta_message_id,
        related_message_id,
        template_name,
        payload,
        raw_event,
        sent_at,
        updated_at
      )
      VALUES (
        $1, $2, 'incoming', $3, 'received', $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, NOW()
      )
      ON CONFLICT (meta_message_id)
      DO UPDATE SET
        user_id = COALESCE(whatsapp_messages.user_id, EXCLUDED.user_id),
        contact_id = COALESCE(whatsapp_messages.contact_id, EXCLUDED.contact_id),
        type = EXCLUDED.type,
        status = CASE
          WHEN whatsapp_messages.direction = 'incoming'
            AND whatsapp_messages.status IN ('processing', 'processed', 'failed')
          THEN whatsapp_messages.status
          ELSE EXCLUDED.status
        END,
        phone_number = EXCLUDED.phone_number,
        related_message_id = EXCLUDED.related_message_id,
        template_name = EXCLUDED.template_name,
        payload = EXCLUDED.payload,
        raw_event = EXCLUDED.raw_event,
        sent_at = COALESCE(whatsapp_messages.sent_at, EXCLUDED.sent_at),
        updated_at = NOW()
    `,
    [
      linkedContact?.user_id || null,
      linkedContact?.id || null,
      message.type || "text",
      normalizedPhoneNumber,
      message.id || null,
      message.context?.id || null,
      message.template?.name || null,
      toJson(message),
      toJson(changeValue),
      toDateFromUnixTimestamp(message.timestamp),
    ],
  );

  if (linkedContact?.id) {
    await client.query(
      `
        UPDATE user_whatsapp_contacts
        SET
          phone_number_e164 = COALESCE($2, phone_number_e164),
          verification_status = 'verified',
          updated_at = NOW()
        WHERE id = $1
          AND (
            verification_status <> 'verified'
            OR COALESCE($2, phone_number_e164) IS DISTINCT FROM phone_number_e164
          )
      `,
      [linkedContact.id, normalizedPhoneNumber],
    );
  }
}

async function saveMessageStatus(status, changeValue, client = pool) {
  const normalizedPhoneNumber = normalizeWhatsAppPhoneNumber(status.recipient_id);
  const linkedContact = await findContactByPhoneNumber(normalizedPhoneNumber, client);
  const deliveredAt = status.status === "delivered"
    ? toDateFromUnixTimestamp(status.timestamp)
    : null;
  const readAt = status.status === "read"
    ? toDateFromUnixTimestamp(status.timestamp)
    : null;
  const failedAt = status.status === "failed"
    ? toDateFromUnixTimestamp(status.timestamp)
    : null;
  const sentAt = status.status === "sent"
    ? toDateFromUnixTimestamp(status.timestamp)
    : null;

  await client.query(
    `
      INSERT INTO whatsapp_messages (
        user_id,
        contact_id,
        direction,
        type,
        status,
        phone_number,
        meta_message_id,
        payload,
        raw_event,
        sent_at,
        delivered_at,
        read_at,
        failed_at,
        error_message,
        updated_at
      )
      VALUES (
        $1, $2, 'outgoing', COALESCE($3, 'text'), $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, NOW()
      )
      ON CONFLICT (meta_message_id)
      DO UPDATE SET
        user_id = COALESCE(whatsapp_messages.user_id, EXCLUDED.user_id),
        contact_id = COALESCE(whatsapp_messages.contact_id, EXCLUDED.contact_id),
        type = COALESCE(EXCLUDED.type, whatsapp_messages.type),
        status = EXCLUDED.status,
        phone_number = COALESCE(EXCLUDED.phone_number, whatsapp_messages.phone_number),
        payload = EXCLUDED.payload,
        raw_event = EXCLUDED.raw_event,
        sent_at = COALESCE(EXCLUDED.sent_at, whatsapp_messages.sent_at),
        delivered_at = COALESCE(EXCLUDED.delivered_at, whatsapp_messages.delivered_at),
        read_at = COALESCE(EXCLUDED.read_at, whatsapp_messages.read_at),
        failed_at = COALESCE(EXCLUDED.failed_at, whatsapp_messages.failed_at),
        error_message = COALESCE(EXCLUDED.error_message, whatsapp_messages.error_message),
        updated_at = NOW()
    `,
    [
      linkedContact?.user_id || null,
      linkedContact?.id || null,
      status.type || "text",
      status.status || "unknown",
      normalizedPhoneNumber,
      status.id || null,
      toJson(status),
      toJson(changeValue),
      sentAt,
      deliveredAt,
      readAt,
      failedAt,
      status.errors?.[0]?.title || status.errors?.[0]?.message || null,
    ],
  );
}

export async function processWhatsAppWebhookPayload(payload, client = pool) {
  if (!payload || payload.object !== "whatsapp_business_account") {
    return {
      storedEvents: 0,
      processedMessages: 0,
      processedStatuses: 0,
    };
  }

  let storedEvents = 0;
  let processedMessages = 0;
  let processedStatuses = 0;

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const eventInsert = await client.query(
        `
          INSERT INTO whatsapp_webhook_events (
            event_type,
            object_type,
            payload,
            processed,
            processed_at
          )
          VALUES ($1, $2, $3::jsonb, TRUE, NOW())
          RETURNING id
        `,
        [change.field || "unknown", payload.object, toJson(change)],
      );

      if (eventInsert.rows[0]?.id) {
        storedEvents += 1;
      }

      if (change.field !== "messages") {
        continue;
      }

      const changeValue = change.value || {};

      for (const message of changeValue.messages || []) {
        await saveIncomingMessage(message, changeValue, client);
        processedMessages += 1;
      }

      for (const status of changeValue.statuses || []) {
        await saveMessageStatus(status, changeValue, client);
        processedStatuses += 1;
      }
    }
  }

  return {
    storedEvents,
    processedMessages,
    processedStatuses,
  };
}
