import pool from "../config/database.js";

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export async function getWhatsAppSessionByUserId(userId, client = pool) {
  const result = await client.query(
    `
      SELECT *
      FROM whatsapp_conversation_sessions
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rows[0] || null;
}

export async function upsertWhatsAppSession(
  {
    userId,
    contactId,
    currentIntent = null,
    currentStep = null,
    pendingQuestion = null,
    slotState = {},
    lastInboundMessageId = null,
    lastOutboundMessageId = null,
    lastInboundAt = null,
    lastOutboundAt = null,
    windowHours = 24,
    status = "active",
  },
  client = pool,
) {
  const windowExpiresAt = lastInboundAt
    ? addHours(lastInboundAt, windowHours)
    : null;

  const result = await client.query(
    `
      INSERT INTO whatsapp_conversation_sessions (
        user_id,
        contact_id,
        current_intent,
        current_step,
        pending_question,
        slot_state_json,
        last_inbound_message_id,
        last_outbound_message_id,
        last_inbound_at,
        last_outbound_at,
        customer_care_window_expires_at,
        status,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, NOW()
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        contact_id = EXCLUDED.contact_id,
        current_intent = EXCLUDED.current_intent,
        current_step = EXCLUDED.current_step,
        pending_question = EXCLUDED.pending_question,
        slot_state_json = EXCLUDED.slot_state_json,
        last_inbound_message_id = COALESCE(EXCLUDED.last_inbound_message_id, whatsapp_conversation_sessions.last_inbound_message_id),
        last_outbound_message_id = COALESCE(EXCLUDED.last_outbound_message_id, whatsapp_conversation_sessions.last_outbound_message_id),
        last_inbound_at = COALESCE(EXCLUDED.last_inbound_at, whatsapp_conversation_sessions.last_inbound_at),
        last_outbound_at = COALESCE(EXCLUDED.last_outbound_at, whatsapp_conversation_sessions.last_outbound_at),
        customer_care_window_expires_at = COALESCE(EXCLUDED.customer_care_window_expires_at, whatsapp_conversation_sessions.customer_care_window_expires_at),
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *
    `,
    [
      userId,
      contactId,
      currentIntent,
      currentStep,
      pendingQuestion,
      JSON.stringify(slotState || {}),
      lastInboundMessageId,
      lastOutboundMessageId,
      lastInboundAt,
      lastOutboundAt,
      windowExpiresAt,
      status,
    ],
  );

  return result.rows[0] || null;
}

export async function closeWhatsAppSession(
  userId,
  { slotState = {}, status = "completed", lastOutboundMessageId = null, lastOutboundAt = null } = {},
  client = pool,
) {
  const result = await client.query(
    `
      UPDATE whatsapp_conversation_sessions
      SET
        current_intent = NULL,
        current_step = NULL,
        pending_question = NULL,
        slot_state_json = $2::jsonb,
        last_outbound_message_id = COALESCE($3, last_outbound_message_id),
        last_outbound_at = COALESCE($4, last_outbound_at),
        status = $5,
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `,
    [userId, JSON.stringify(slotState || {}), lastOutboundMessageId, lastOutboundAt, status],
  );

  return result.rows[0] || null;
}

export function isWithinCustomerCareWindow(session, referenceDate = new Date()) {
  if (!session?.customer_care_window_expires_at) {
    return false;
  }

  return new Date(session.customer_care_window_expires_at).getTime() >= referenceDate.getTime();
}
