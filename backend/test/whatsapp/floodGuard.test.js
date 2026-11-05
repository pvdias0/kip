import { test, describe, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/config/database.js";
import {
  __resetFloodGuardMemory,
  isSilentMessageType,
  registerInboundMessage,
  shouldReplyToUnknownNumber,
  shouldSendOptInNotice,
  shouldSendUnsupportedNotice,
} from "../../src/services/whatsappFloodGuard.js";
import {
  ASSISTANT_RESULT,
  handleIncomingWhatsAppMessage,
} from "../../src/services/whatsappAssistantService.js";

const GUARD_ENV = [
  "WHATSAPP_FLOOD_GUARD_ENABLED",
  "WHATSAPP_RATE_LIMIT_PER_MINUTE",
  "WHATSAPP_RATE_LIMIT_PER_HOUR",
  "WHATSAPP_RATE_LIMIT_PER_DAY",
  "WHATSAPP_RATE_LIMIT_NOTICE_COOLDOWN_MINUTES",
  "WHATSAPP_UNKNOWN_REPLY_COOLDOWN_HOURS",
  "WHATSAPP_UNKNOWN_REPLIES_PER_HOUR",
  "WHATSAPP_UNSUPPORTED_REPLY_COOLDOWN_MINUTES",
  "WHATSAPP_MAX_MESSAGE_LENGTH",
];

const PHONE = "+5586988740413";
// Inicio exato de um minuto/hora/dia para os testes de janela serem deterministicos.
const T0 = Date.UTC(2026, 10, 4, 12, 0, 0);
const MIN = 60_000;

beforeEach(() => {
  for (const name of GUARD_ENV) delete process.env[name];
  __resetFloodGuardMemory();
});

afterEach(() => mock.restoreAll());

describe("registerInboundMessage (limite por numero)", () => {
  test("uso legitimo: um fluxo normal (6 msgs em 1 min) nunca e bloqueado", async () => {
    for (let i = 0; i < 6; i += 1) {
      const r = await registerInboundMessage(PHONE, T0 + i * 5000);
      assert.equal(r.allowed, true);
    }
  });

  test("bloqueia acima do limite por minuto e avisa so uma vez", async () => {
    process.env.WHATSAPP_RATE_LIMIT_PER_MINUTE = "3";
    const results = [];
    for (let i = 0; i < 6; i += 1) {
      results.push(await registerInboundMessage(PHONE, T0 + i * 1000));
    }

    assert.deepEqual(results.map((r) => r.allowed), [true, true, true, false, false, false]);
    assert.deepEqual(results.map((r) => r.notify), [false, false, false, true, false, false]);
    assert.equal(results[3].scope, "minute");
    assert.ok(results[3].retryAfterSeconds > 0 && results[3].retryAfterSeconds <= 60);
  });

  test("libera de novo no minuto seguinte", async () => {
    process.env.WHATSAPP_RATE_LIMIT_PER_MINUTE = "2";
    await registerInboundMessage(PHONE, T0);
    await registerInboundMessage(PHONE, T0 + 1000);
    assert.equal((await registerInboundMessage(PHONE, T0 + 2000)).allowed, false);
    assert.equal((await registerInboundMessage(PHONE, T0 + MIN)).allowed, true);
  });

  test("limite por hora pega flood lento que respeita o limite por minuto", async () => {
    process.env.WHATSAPP_RATE_LIMIT_PER_MINUTE = "5";
    process.env.WHATSAPP_RATE_LIMIT_PER_HOUR = "10";
    let blocked = null;
    for (let i = 0; i < 15 && !blocked; i += 1) {
      const r = await registerInboundMessage(PHONE, T0 + i * MIN);
      if (!r.allowed) blocked = { i, r };
    }
    assert.equal(blocked.i, 10);
    assert.equal(blocked.r.scope, "hour");
  });

  test("limite e por numero: outro usuario nao e afetado", async () => {
    process.env.WHATSAPP_RATE_LIMIT_PER_MINUTE = "1";
    await registerInboundMessage(PHONE, T0);
    assert.equal((await registerInboundMessage(PHONE, T0 + 1)).allowed, false);
    assert.equal((await registerInboundMessage("+5511999990000", T0 + 2)).allowed, true);
  });

  test("formatos diferentes do mesmo numero contam juntos", async () => {
    process.env.WHATSAPP_RATE_LIMIT_PER_MINUTE = "1";
    await registerInboundMessage("+55 86 98874-0413", T0);
    assert.equal((await registerInboundMessage("5586988740413", T0 + 1)).allowed, false);
  });

  test("pode ser desligado por env", async () => {
    process.env.WHATSAPP_FLOOD_GUARD_ENABLED = "false";
    process.env.WHATSAPP_RATE_LIMIT_PER_MINUTE = "1";
    for (let i = 0; i < 5; i += 1) {
      assert.equal((await registerInboundMessage(PHONE, T0 + i)).allowed, true);
    }
  });
});

describe("avisos com cooldown", () => {
  test("numero desconhecido recebe resposta uma vez por cooldown", async () => {
    assert.equal(await shouldReplyToUnknownNumber("+5511900000001", T0), true);
    assert.equal(await shouldReplyToUnknownNumber("+5511900000001", T0 + 60 * MIN), false);
    assert.equal(await shouldReplyToUnknownNumber("+5511900000001", T0 + 25 * 60 * MIN), true);
  });

  test("teto global por hora contra flood de muitos numeros", async () => {
    process.env.WHATSAPP_UNKNOWN_REPLIES_PER_HOUR = "3";
    const replies = [];
    for (let i = 0; i < 5; i += 1) {
      replies.push(await shouldReplyToUnknownNumber(`+551190000000${i}`, T0 + i));
    }
    assert.deepEqual(replies, [true, true, true, false, false]);
  });

  test("aviso de opt-in e de 'so texto' tambem tem cooldown", async () => {
    assert.equal(await shouldSendOptInNotice(PHONE, T0), true);
    assert.equal(await shouldSendOptInNotice(PHONE, T0 + MIN), false);
    assert.equal(await shouldSendUnsupportedNotice(PHONE, T0), true);
    assert.equal(await shouldSendUnsupportedNotice(PHONE, T0 + 30 * MIN), false);
    assert.equal(await shouldSendUnsupportedNotice(PHONE, T0 + 61 * MIN), true);
  });

  test("reacao e silenciosa", () => {
    assert.equal(isSilentMessageType({ type: "reaction" }), true);
    assert.equal(isSilentMessageType({ type: "text" }), false);
  });
});

describe("handleIncomingWhatsAppMessage com flood guard", () => {
  function setup({ contact = null } = {}) {
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123";
    process.env.WHATSAPP_ACCESS_TOKEN = "token";
    process.env.WHATSAPP_ASSISTANT_ENABLED = "true";
    process.env.GEMINI_API_KEY = "fake";

    const client = {
      release() {},
      async query(sql) {
        if (/FROM user_whatsapp_contacts c\s+INNER JOIN users/.test(sql)) {
          return { rows: contact ? [contact] : [] };
        }
        if (/SELECT COALESCE\(sent_at, created_at\)/.test(sql)) {
          return { rows: [{ inbound_at: new Date() }] };
        }
        if (/INSERT INTO whatsapp_conversation_sessions/.test(sql)) {
          return {
            rows: [{
              id: 1,
              user_id: 7,
              slot_state_json: {},
              customer_care_window_expires_at: new Date(Date.now() + 3600_000),
            }],
          };
        }
        return { rows: [] };
      },
    };
    mock.method(pool, "connect", async () => client);

    const sentBodies = [];
    const fetchMock = mock.method(globalThis, "fetch", async (url, init) => {
      if (String(url).includes("graph.facebook.com")) {
        sentBodies.push(JSON.parse(init.body).text.body);
        return new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] }), { status: 200 });
      }
      throw new Error(`chamada inesperada: ${url}`);
    });

    return { sentBodies, fetchMock };
  }

  const textMessage = (from, i = 0, body = "oi") => ({
    id: `wamid.${from}.${i}`,
    from,
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: "text",
    text: { body },
  });

  test("flood de numero desconhecido: 20 mensagens -> 1 resposta", async () => {
    const { sentBodies } = setup();
    const results = [];
    for (let i = 0; i < 20; i += 1) {
      results.push(await handleIncomingWhatsAppMessage(textMessage("5511988887777", i)));
    }
    assert.equal(sentBodies.length, 1);
    assert.equal(results[0], true);
    assert.ok(results.slice(1).every((r) => r === ASSISTANT_RESULT.IGNORED));
  });

  test("reacao nao abre conexao com o banco nem envia nada", async () => {
    const { fetchMock } = setup();
    const r = await handleIncomingWhatsAppMessage({
      id: "wamid.r",
      from: "5586988740413",
      type: "reaction",
      reaction: { emoji: "👍", message_id: "x" },
    });
    assert.equal(r, ASSISTANT_RESULT.IGNORED);
    assert.equal(pool.connect.mock.callCount(), 0);
    assert.equal(fetchMock.mock.callCount(), 0);
  });

  test("usuario cadastrado em flood: para de processar e recebe 1 aviso so", async () => {
    process.env.WHATSAPP_RATE_LIMIT_PER_MINUTE = "2";
    // opted_in = false faz as mensagens permitidas responderem sem Gemini
    // (o aviso de opt-in tem cooldown proprio, entao so a 1a gera resposta).
    const { sentBodies } = setup({
      contact: { contact_id: 1, user_id: 7, phone_number_e164: "+5586988740413", opted_in: false },
    });

    const results = [];
    for (let i = 0; i < 10; i += 1) {
      results.push(await handleIncomingWhatsAppMessage(textMessage("5586988740413", i)));
    }

    assert.deepEqual(results.slice(2), Array(8).fill(ASSISTANT_RESULT.RATE_LIMITED));
    const rateNotices = sentBodies.filter((b) => b.includes("muitas mensagens"));
    assert.equal(rateNotices.length, 1);
    assert.equal(sentBodies.length, 2, "1 aviso de opt-in + 1 aviso de limite");
  });

  test("mensagem longa demais e recusada sem chamar o Gemini", async () => {
    process.env.WHATSAPP_MAX_MESSAGE_LENGTH = "50";
    const { sentBodies, fetchMock } = setup({
      contact: { contact_id: 1, user_id: 7, phone_number_e164: "+5586988740413", opted_in: true },
    });

    const r = await handleIncomingWhatsAppMessage(textMessage("5586988740413", 0, "x".repeat(51)));
    assert.equal(r, true);
    assert.equal(sentBodies.length, 1);
    assert.match(sentBodies[0], /muito longa/);
    assert.ok(fetchMock.mock.calls.every((c) => !String(c.arguments[0]).includes("generativelanguage")));
  });
});
