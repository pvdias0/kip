/**
 * Diagnostico do canal WhatsApp (somente leitura).
 *
 * Uso:   npm run whatsapp:diagnose -- [numero_do_usuario]
 * Docker: docker compose exec app npm run whatsapp:diagnose -- 86999999999
 *
 * Verifica: variaveis de ambiente, token (debug_token), registro do numero na
 * Cloud API, assinatura do app na WABA, endpoint de verificacao do webhook e o
 * que chegou/saiu no banco. Nao envia mensagens nem altera dados.
 */
import "../config/env.js";
import pool from "../config/database.js";
import { getWhatsAppConfig } from "../config/whatsapp.js";
import { getWhatsAppContactByPhoneNumber, normalizeWhatsAppPhoneNumber } from "../utils/whatsapp.js";

const config = getWhatsAppConfig();
const problems = [];

const ok = (msg) => console.log(`  ✅ ${msg}`);
const warn = (msg) => console.log(`  ⚠️  ${msg}`);
const fail = (msg) => {
  console.log(`  ❌ ${msg}`);
  problems.push(msg);
};
const section = (title) => console.log(`\n== ${title}`);

function mask(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length > 6 ? `${digits.slice(0, 4)}****${digits.slice(-3)}` : String(value || "-");
}

async function graphGet(pathAndQuery, token = config.accessToken) {
  const url = `${config.apiBaseUrl}/${pathAndQuery}${pathAndQuery.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, body };
}

function graphError(body) {
  const e = body?.error || {};
  return `${e.message || "erro desconhecido"} (code ${e.code ?? "?"}${e.error_subcode ? `/${e.error_subcode}` : ""})`;
}

async function checkEnv() {
  section("Variaveis de ambiente");
  const required = {
    WHATSAPP_PHONE_NUMBER_ID: config.phoneNumberId,
    WHATSAPP_WABA_ID: config.wabaId,
    WHATSAPP_ACCESS_TOKEN: config.accessToken,
    WHATSAPP_APP_ID: config.appId,
    WHATSAPP_APP_SECRET: config.appSecret,
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: config.webhookVerifyToken,
    WHATSAPP_BUSINESS_PHONE_NUMBER: config.businessPhoneNumber,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim(),
  };

  for (const [name, value] of Object.entries(required)) {
    if (!value) fail(`${name} vazio`);
    else if (/^COLE_AQUI/i.test(value)) fail(`${name} ainda esta com o valor de exemplo`);
    else ok(`${name} definido`);
  }

  if (!config.assistantEnabled) fail("WHATSAPP_ASSISTANT_ENABLED=false: o assistente nunca responde");
  else ok("assistente habilitado");
}

async function checkToken() {
  section("Token de acesso (debug_token)");
  if (!config.accessToken || !config.appId || !config.appSecret) {
    warn("pulado: faltam token, app id ou app secret");
    return;
  }

  const { ok: success, body } = await graphGet(
    `debug_token?input_token=${encodeURIComponent(config.accessToken)}`,
    `${config.appId}|${config.appSecret}`,
  );

  if (!success) {
    fail(`debug_token falhou: ${graphError(body)}. App ID/App Secret podem estar errados (o secret foi rotacionado?)`);
    return;
  }

  const data = body.data || {};
  if (!data.is_valid) fail(`token INVALIDO: ${data.error?.message || "sem detalhe"}`);
  else ok("token valido");

  if (data.expires_at && data.expires_at !== 0) {
    const expires = new Date(data.expires_at * 1000);
    if (expires < new Date()) fail(`token expirou em ${expires.toISOString()}`);
    else warn(`token expira em ${expires.toISOString()} (use token de System User, sem expiracao)`);
  } else {
    ok("token sem data de expiracao");
  }

  const scopes = data.scopes || [];
  for (const scope of ["whatsapp_business_messaging", "whatsapp_business_management"]) {
    if (scopes.includes(scope)) ok(`permissao ${scope}`);
    else fail(`token sem a permissao ${scope}`);
  }

  if (String(data.app_id || "") && String(data.app_id) !== config.appId) {
    fail(`token pertence ao app ${data.app_id}, mas WHATSAPP_APP_ID=${config.appId}`);
  }
}

async function checkPhoneNumber() {
  section("Numero do KIP na Cloud API");
  if (!config.phoneNumberId || !config.accessToken) {
    warn("pulado: faltam phone number id ou token");
    return;
  }

  const { ok: success, body } = await graphGet(
    `${config.phoneNumberId}?fields=display_phone_number,verified_name,name_status,code_verification_status,quality_rating,platform_type,status,messaging_limit_tier,account_mode`,
  );

  if (!success) {
    fail(`consulta do numero falhou: ${graphError(body)}`);
    return;
  }

  console.log(`  numero: ${body.display_phone_number} | nome: ${body.verified_name} (${body.name_status})`);
  console.log(`  status: ${body.status} | plataforma: ${body.platform_type} | qualidade: ${body.quality_rating} | modo: ${body.account_mode || "-"}`);

  if (body.platform_type !== "CLOUD_API") {
    fail("numero NAO registrado na Cloud API (platform_type != CLOUD_API). Registre com POST /{phone_number_id}/register usando o PIN");
  } else ok("registrado na Cloud API");

  if (body.status && body.status !== "CONNECTED") fail(`status do numero: ${body.status}`);
  if (body.account_mode === "SANDBOX") {
    warn("numero de teste (SANDBOX): so responde para numeros da lista de destinatarios permitidos");
  }

  const configured = String(config.businessPhoneNumber).replace(/\D/g, "");
  const actual = String(body.display_phone_number || "").replace(/\D/g, "");
  const withoutNinthDigit = (digits) =>
    digits.length === 13 && digits.startsWith("55") && digits[4] === "9"
      ? `${digits.slice(0, 4)}${digits.slice(5)}`
      : digits;

  if (configured && actual && configured !== actual && withoutNinthDigit(configured) === withoutNinthDigit(actual)) {
    warn(`WHATSAPP_BUSINESS_PHONE_NUMBER (${configured}) difere so pelo nono digito do numero registrado (${actual}); prefira ${actual}`);
  } else if (configured && actual && configured !== actual) {
    fail(`WHATSAPP_BUSINESS_PHONE_NUMBER (${configured}) difere do numero do PHONE_NUMBER_ID (${actual}): o botao "falar com o KIP" abre outro numero`);
  }
}

async function checkSubscription() {
  section("Assinatura do app na WABA (webhooks)");
  if (!config.wabaId || !config.accessToken) {
    warn("pulado: faltam WABA id ou token");
    return;
  }

  const { ok: success, body } = await graphGet(`${config.wabaId}/subscribed_apps`);

  if (!success) {
    fail(`consulta de subscribed_apps falhou: ${graphError(body)}`);
    return;
  }

  const apps = (body.data || []).map((item) => item.whatsapp_business_api_data || item);
  const subscribed = apps.some((app) => String(app.id) === config.appId);

  if (subscribed) ok("app assinado na WABA");
  else fail(`app ${config.appId} NAO esta assinado na WABA: a Meta nao envia webhooks. Faça POST /${config.wabaId}/subscribed_apps`);

  warn('confira tambem no App Dashboard > WhatsApp > Configuracao: campo "messages" assinado e app em modo Live');
}

async function checkWebhookEndpoint() {
  section("Endpoint do webhook");
  if (!config.webhookCallbackUrl || !config.webhookVerifyToken) {
    warn("pulado: faltam callback url ou verify token");
    return;
  }

  const url = new URL(config.webhookCallbackUrl);
  url.searchParams.set("hub.mode", "subscribe");
  url.searchParams.set("hub.verify_token", config.webhookVerifyToken);
  url.searchParams.set("hub.challenge", "kip-diagnose");

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    const text = await response.text();
    if (response.ok && text === "kip-diagnose") ok(`${config.webhookCallbackUrl} responde a verificacao`);
    else fail(`verificacao do webhook retornou HTTP ${response.status}: ${text.slice(0, 120)}`);
  } catch (error) {
    fail(`nao foi possivel acessar ${config.webhookCallbackUrl}: ${error.message}`);
  }
}

async function checkDatabase(userPhone) {
  section("Banco de dados (ultimos eventos)");

  const events = await pool.query(
    `SELECT received_at, event_type FROM whatsapp_webhook_events ORDER BY id DESC LIMIT 5`,
  );
  if (events.rows.length === 0) {
    fail("nenhum webhook registrado: a Meta nunca entregou (ou o servidor recusou) eventos");
  } else {
    ok(`ultimo webhook em ${events.rows[0].received_at.toISOString()}`);
    events.rows.forEach((row) => console.log(`     ${row.received_at.toISOString()}  ${row.event_type}`));
  }

  const incoming = await pool.query(
    `SELECT created_at, phone_number, user_id, status, error_message
     FROM whatsapp_messages WHERE direction = 'incoming' ORDER BY id DESC LIMIT 5`,
  );
  console.log("  mensagens recebidas:");
  incoming.rows.forEach((row) =>
    console.log(
      `     ${row.created_at.toISOString()}  ${mask(row.phone_number)}  usuario=${row.user_id ?? "NAO VINCULADO"}  ${row.status}${row.error_message ? `  (${row.error_message})` : ""}`,
    ),
  );

  const outgoing = await pool.query(
    `SELECT created_at, phone_number, status, error_message
     FROM whatsapp_messages WHERE direction = 'outgoing' ORDER BY id DESC LIMIT 5`,
  );
  console.log("  mensagens enviadas:");
  outgoing.rows.forEach((row) =>
    console.log(
      `     ${row.created_at.toISOString()}  ${mask(row.phone_number)}  ${row.status}${row.error_message ? `  (${row.error_message})` : ""}`,
    ),
  );

  if (incoming.rows.length > 0 && outgoing.rows.length === 0) {
    fail("chegam mensagens mas nenhuma resposta foi aceita pela Meta: veja nos logs 'WhatsApp assistant error' e 'fallback reply error'");
  }

  if (userPhone) {
    section(`Contato para ${mask(userPhone)}`);
    const normalized = normalizeWhatsAppPhoneNumber(userPhone);
    console.log(`  normalizado como ${mask(normalized)}`);
    const contact = normalized ? await getWhatsAppContactByPhoneNumber(normalized, pool) : null;
    if (!contact) fail("nenhum usuario do KIP encontrado para esse numero");
    else {
      ok(`vinculado ao usuario ${contact.user_id} (e164 salvo ${mask(contact.phone_number_e164)})`);
      if (!contact.opted_in) fail("contato com opted_in = false");
    }
  }
}

async function main() {
  const userPhone = process.argv[2] || null;
  console.log("Diagnostico do WhatsApp do KIP (somente leitura)");

  for (const step of [checkEnv, checkToken, checkPhoneNumber, checkSubscription, checkWebhookEndpoint]) {
    try {
      await step();
    } catch (error) {
      fail(`${step.name}: ${error.message}`);
    }
  }

  try {
    await checkDatabase(userPhone);
  } catch (error) {
    fail(`banco: ${error.message}`);
  }

  section("Resumo");
  if (problems.length === 0) console.log("  Nenhum problema encontrado nas verificacoes automaticas.");
  else problems.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));

  await pool.end();
}

main();
