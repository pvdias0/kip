import pool from "../config/database.js";
import {
  getWhatsAppConfig,
  isWhatsAppConfigured,
} from "../config/whatsapp.js";
import {
  normalizeWhatsAppPhoneNumber,
  processWhatsAppWebhookPayload,
  syncWhatsAppChannelConfig,
} from "../utils/whatsapp.js";

async function ensureAdminUser(userId) {
  const result = await pool.query(
    "SELECT is_admin FROM users WHERE id = $1",
    [userId],
  );

  return Boolean(result.rows[0]?.is_admin);
}

async function getWhatsAppProfileRecord(userId, client = pool) {
  const result = await client.query(
    `
      SELECT
        c.id AS contact_id,
        c.phone_number,
        c.phone_number_e164,
        c.opted_in,
        c.opted_in_at,
        c.opt_in_source,
        c.opt_out_at,
        c.verification_status,
        p.receive_support_messages,
        p.receive_transactional_messages,
        p.receive_weekly_summary,
        p.receive_budget_alerts
      FROM users u
      LEFT JOIN user_whatsapp_contacts c ON c.user_id = u.id
      LEFT JOIN user_whatsapp_preferences p ON p.user_id = u.id
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rows[0] || null;
}

export const verifyWhatsAppWebhook = async (req, res) => {
  const mode = req.query["hub.mode"];
  const verifyToken = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const config = getWhatsAppConfig();

  if (mode !== "subscribe" || typeof challenge !== "string") {
    return res.status(400).json({
      status: "ERROR",
      message: "Webhook challenge invalido",
    });
  }

  if (verifyToken !== config.webhookVerifyToken) {
    return res.status(403).json({
      status: "ERROR",
      message: "Webhook verify token invalido",
    });
  }

  return res.status(200).send(challenge);
};

export const receiveWhatsAppWebhook = async (req, res) => {
  try {
    const summary = await processWhatsAppWebhookPayload(req.body, pool);

    return res.status(200).json({
      status: "OK",
      ...summary,
    });
  } catch (error) {
    console.error("WhatsApp webhook receive error:", error);

    return res.status(500).json({
      status: "ERROR",
      message: "Erro ao processar webhook do WhatsApp",
    });
  }
};

export const getWhatsAppChannelStatus = async (req, res) => {
  try {
    const isAdmin = await ensureAdminUser(req.user.id);

    if (!isAdmin) {
      return res.status(403).json({
        status: "ERROR",
        message: "Apenas administradores podem acessar esta rota",
      });
    }

    const configured = isWhatsAppConfigured();
    const config = getWhatsAppConfig();
    const channelConfig = configured
      ? await syncWhatsAppChannelConfig(pool)
      : null;
    const counts = await pool.query(
      `
        SELECT
          (SELECT COUNT(*) FROM user_whatsapp_contacts) AS contacts_count,
          (SELECT COUNT(*) FROM whatsapp_messages) AS messages_count,
          (SELECT COUNT(*) FROM whatsapp_webhook_events) AS webhook_events_count
      `,
    );

    return res.json({
      status: "OK",
      configured,
      channel: channelConfig,
      runtime: {
        waba_id: config.wabaId || null,
        phone_number_id: config.phoneNumberId || null,
        business_phone_number: config.businessPhoneNumber || null,
        app_id: config.appId || null,
        webhook_callback_url: config.webhookCallbackUrl || null,
      },
      stats: counts.rows[0],
    });
  } catch (error) {
    console.error("Get WhatsApp channel status error:", error);

    return res.status(500).json({
      status: "ERROR",
      message: "Erro ao consultar status do WhatsApp",
    });
  }
};

export const getUserWhatsAppProfile = async (req, res) => {
  try {
    const profile = await getWhatsAppProfileRecord(req.user.id, pool);

    return res.json({
      status: "OK",
      profile: {
        phone_number: profile?.phone_number || null,
        phone_number_e164: profile?.phone_number_e164 || null,
        opted_in: profile?.opted_in || false,
        opted_in_at: profile?.opted_in_at || null,
        opt_in_source: profile?.opt_in_source || null,
        opt_out_at: profile?.opt_out_at || null,
        verification_status: profile?.verification_status || "pending",
        receive_support_messages:
          profile?.receive_support_messages ?? true,
        receive_transactional_messages:
          profile?.receive_transactional_messages ?? true,
        receive_weekly_summary:
          profile?.receive_weekly_summary ?? false,
        receive_budget_alerts:
          profile?.receive_budget_alerts ?? false,
      },
    });
  } catch (error) {
    console.error("Get WhatsApp profile error:", error);

    return res.status(500).json({
      status: "ERROR",
      message: "Erro ao consultar configuracoes do WhatsApp",
    });
  }
};

export const upsertUserWhatsAppProfile = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      phone_number,
      opted_in,
      opt_in_source,
      receive_support_messages = true,
      receive_transactional_messages = true,
      receive_weekly_summary = false,
      receive_budget_alerts = false,
    } = req.body;

    await client.query("BEGIN");

    const existingProfile = await getWhatsAppProfileRecord(req.user.id, client);
    const normalizedPhoneNumber = phone_number
      ? normalizeWhatsAppPhoneNumber(phone_number)
      : existingProfile?.phone_number_e164 || null;
    const displayPhoneNumber = phone_number?.trim() || existingProfile?.phone_number || null;

    if (opted_in && !normalizedPhoneNumber) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        status: "ERROR",
        message: "Informe um numero de WhatsApp valido para ativar o recebimento.",
      });
    }

    if (existingProfile?.contact_id) {
      await client.query(
        `
          UPDATE user_whatsapp_contacts
          SET
            phone_number = COALESCE($1, phone_number),
            phone_number_e164 = COALESCE($2, phone_number_e164),
            opted_in = $3,
            opted_in_at = CASE
              WHEN $3 = TRUE AND opted_in_at IS NULL THEN NOW()
              WHEN $3 = TRUE THEN opted_in_at
              ELSE opted_in_at
            END,
            opt_in_source = COALESCE($4, opt_in_source),
            opt_out_at = CASE
              WHEN $3 = FALSE THEN NOW()
              ELSE NULL
            END,
            verification_status = CASE
              WHEN COALESCE($2, phone_number_e164) IS NOT NULL THEN 'registered'
              ELSE verification_status
            END,
            updated_at = NOW()
          WHERE user_id = $5
        `,
        [
          displayPhoneNumber,
          normalizedPhoneNumber,
          opted_in,
          opt_in_source?.trim() || null,
          req.user.id,
        ],
      );
    } else if (normalizedPhoneNumber) {
      await client.query(
        `
          INSERT INTO user_whatsapp_contacts (
            user_id,
            phone_number,
            phone_number_e164,
            opted_in,
            opted_in_at,
            opt_in_source,
            opt_out_at,
            verification_status,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4,
            CASE WHEN $4 = TRUE THEN NOW() ELSE NULL END,
            $5,
            CASE WHEN $4 = FALSE THEN NOW() ELSE NULL END,
            'registered',
            NOW()
          )
        `,
        [
          req.user.id,
          displayPhoneNumber,
          normalizedPhoneNumber,
          opted_in,
          opt_in_source?.trim() || null,
        ],
      );
    }

    await client.query(
      `
        INSERT INTO user_whatsapp_preferences (
          user_id,
          receive_support_messages,
          receive_transactional_messages,
          receive_weekly_summary,
          receive_budget_alerts,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          receive_support_messages = EXCLUDED.receive_support_messages,
          receive_transactional_messages = EXCLUDED.receive_transactional_messages,
          receive_weekly_summary = EXCLUDED.receive_weekly_summary,
          receive_budget_alerts = EXCLUDED.receive_budget_alerts,
          updated_at = NOW()
      `,
      [
        req.user.id,
        Boolean(receive_support_messages),
        Boolean(receive_transactional_messages),
        Boolean(receive_weekly_summary),
        Boolean(receive_budget_alerts),
      ],
    );

    await client.query("COMMIT");

    const updatedProfile = await getWhatsAppProfileRecord(req.user.id, pool);

    return res.json({
      status: "OK",
      message: "Configuracoes de WhatsApp atualizadas com sucesso.",
      profile: {
        phone_number: updatedProfile?.phone_number || null,
        phone_number_e164: updatedProfile?.phone_number_e164 || null,
        opted_in: updatedProfile?.opted_in || false,
        opted_in_at: updatedProfile?.opted_in_at || null,
        opt_in_source: updatedProfile?.opt_in_source || null,
        opt_out_at: updatedProfile?.opt_out_at || null,
        verification_status: updatedProfile?.verification_status || "pending",
        receive_support_messages:
          updatedProfile?.receive_support_messages ?? true,
        receive_transactional_messages:
          updatedProfile?.receive_transactional_messages ?? true,
        receive_weekly_summary:
          updatedProfile?.receive_weekly_summary ?? false,
        receive_budget_alerts:
          updatedProfile?.receive_budget_alerts ?? false,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Upsert WhatsApp profile error:", error);

    if (error?.code === "23505") {
      return res.status(409).json({
        status: "ERROR",
        message: "Este numero de WhatsApp ja esta vinculado a outra conta.",
      });
    }

    return res.status(500).json({
      status: "ERROR",
      message: "Erro ao atualizar configuracoes do WhatsApp",
    });
  } finally {
    client.release();
  }
};
