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

export function normalizeWhatsAppPhoneNumber(input) {
  const digits = String(input ?? "").replace(/\D/g, "");

  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return `+${digits}`;
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

  const result = await client.query(
    `
      SELECT id, user_id
      FROM user_whatsapp_contacts
      WHERE phone_number_e164 = $1
      LIMIT 1
    `,
    [phoneNumberE164],
  );

  return result.rows[0] || null;
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
        status = EXCLUDED.status,
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
