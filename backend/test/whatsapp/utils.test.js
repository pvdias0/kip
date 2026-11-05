import { test, describe, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import {
  normalizeWhatsAppPhoneNumber,
  normalizeWhatsAppIdToE164,
  fitWhatsAppTextBody,
  WHATSAPP_TEXT_MAX_LENGTH,
  extractInboundWhatsAppMessages,
  getTextFromWhatsAppMessage,
  sendWhatsAppTextMessage,
  processWhatsAppWebhookPayload,
  recoverStaleProcessingMessages,
} from "../../src/utils/whatsapp.js";

const ENV = {
  WHATSAPP_PHONE_NUMBER_ID: "123",
  WHATSAPP_ACCESS_TOKEN: "token",
  WHATSAPP_REPLY_WINDOW_HOURS: "24",
};

function withEnv() {
  for (const [k, v] of Object.entries(ENV)) process.env[k] = v;
}

/** Cliente pg falso: registra as queries e responde com base em regras. */
function fakeClient(rules = []) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      for (const [pattern, rows] of rules) {
        if (pattern.test(sql)) return { rows: typeof rows === "function" ? rows(params) : rows };
      }
      return { rows: [] };
    },
  };
}

afterEach(() => mock.restoreAll());

describe("normalizeWhatsAppPhoneNumber", () => {
  test("celular BR com DDD, sem DDI", () => {
    assert.equal(normalizeWhatsAppPhoneNumber("(86) 98874-0413"), "+5586988740413");
  });

  test("celular BR com DDI", () => {
    assert.equal(normalizeWhatsAppPhoneNumber("+55 86 98874-0413"), "+5586988740413");
  });

  test("wa_id vindo da Meta sem o nono digito", () => {
    assert.equal(normalizeWhatsAppPhoneNumber("558688740413"), "+558688740413");
  });

  test("entradas invalidas retornam null", () => {
    assert.equal(normalizeWhatsAppPhoneNumber(""), null);
    assert.equal(normalizeWhatsAppPhoneNumber("123"), null);
    assert.equal(normalizeWhatsAppPhoneNumber(null), null);
    assert.equal(normalizeWhatsAppPhoneNumber("1234567890123456"), null);
  });

  test("usuario do DDD 55 (RS) digitando sem DDI nao e lido como DDI 55", () => {
    assert.equal(normalizeWhatsAppPhoneNumber("(55) 99123-4567"), "+5555991234567");
  });

  test("numero estrangeiro digitado com + e mantido", () => {
    assert.equal(normalizeWhatsAppPhoneNumber("+1 415 555 1234"), "+14155551234");
    assert.equal(normalizeWhatsAppPhoneNumber("+351 912 345 678"), "+351912345678");
  });

  test("numero ja em E.164 e idempotente", () => {
    for (const value of ["+5586988740413", "+5555991234567", "+14155551234"]) {
      assert.equal(normalizeWhatsAppPhoneNumber(value), value);
    }
  });
});

describe("normalizeWhatsAppIdToE164 (wa_id do webhook)", () => {
  test("numero internacional de 11 digitos (EUA) nao ganha +55", () => {
    assert.equal(normalizeWhatsAppIdToE164("14155551234"), "+14155551234");
  });

  test("wa_id brasileiro com e sem o nono digito", () => {
    assert.equal(normalizeWhatsAppIdToE164("558688740413"), "+558688740413");
    assert.equal(normalizeWhatsAppIdToE164("5586988740413"), "+5586988740413");
  });

  test("wa_id invalido", () => {
    assert.equal(normalizeWhatsAppIdToE164("123"), null);
    assert.equal(normalizeWhatsAppIdToE164(undefined), null);
  });
});

describe("fitWhatsAppTextBody", () => {
  test("texto curto nao muda", () => {
    assert.equal(fitWhatsAppTextBody("ola"), "ola");
  });

  test("texto longo e cortado em quebra de linha e sinalizado", () => {
    const lines = Array.from({ length: 400 }, (_, i) => `${i + 1}. categoria numero ${i + 1}`);
    const result = fitWhatsAppTextBody(lines.join("\n"));
    assert.ok(result.length <= WHATSAPP_TEXT_MAX_LENGTH);
    assert.match(result, /\n… \(mensagem resumida\)$/);
    const kept = result.split("\n").slice(0, -1);
    assert.ok(kept.every((line, i) => line === lines[i]), "nao corta linha no meio");
  });
});

describe("extractInboundWhatsAppMessages / getTextFromWhatsAppMessage", () => {
  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          { field: "messages", value: { messages: [{ id: "a", type: "text", text: { body: " oi " } }] } },
          { field: "messages", value: { statuses: [{ id: "s1", status: "sent" }] } },
          { field: "account_update", value: {} },
        ],
      },
    ],
  };

  test("extrai apenas mensagens recebidas", () => {
    const msgs = extractInboundWhatsAppMessages(payload);
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].id, "a");
  });

  test("ignora objetos que nao sao whatsapp_business_account", () => {
    assert.deepEqual(extractInboundWhatsAppMessages({ object: "page", entry: [] }), []);
    assert.deepEqual(extractInboundWhatsAppMessages(null), []);
  });

  test("texto, botao e respostas interativas", () => {
    assert.equal(getTextFromWhatsAppMessage({ type: "text", text: { body: "  hoje " } }), "hoje");
    assert.equal(getTextFromWhatsAppMessage({ type: "button", button: { text: "Sim" } }), "Sim");
    assert.equal(
      getTextFromWhatsAppMessage({ type: "interactive", interactive: { type: "button_reply", button_reply: { id: "x", title: "Ok" } } }),
      "Ok",
    );
    assert.equal(
      getTextFromWhatsAppMessage({ type: "interactive", interactive: { type: "list_reply", list_reply: { id: "x", title: "Item" } } }),
      "Item",
    );
    assert.equal(getTextFromWhatsAppMessage({ type: "audio", audio: {} }), "");
    assert.equal(getTextFromWhatsAppMessage(undefined), "");
  });
});

describe("sendWhatsAppTextMessage", () => {
  test("recusa envio fora da janela de 24h sem chamar a Meta", async () => {
    withEnv();
    const fetchMock = mock.method(globalThis, "fetch", async () => {
      throw new Error("nao deveria chamar fetch");
    });
    const old = new Date(Date.now() - 25 * 3600 * 1000);
    const client = fakeClient([[/direction = 'incoming'/, [{ inbound_at: old }]]]);

    await assert.rejects(
      sendWhatsAppTextMessage({ to: "+5586988740413", body: "x", relatedMessageId: "wamid.1", client }),
      /fora da janela/,
    );
    assert.equal(fetchMock.mock.callCount(), 0);
  });

  test("recusa envio quando nao ha mensagem recebida registrada", async () => {
    withEnv();
    mock.method(globalThis, "fetch", async () => {
      throw new Error("nao deveria chamar fetch");
    });
    await assert.rejects(
      sendWhatsAppTextMessage({ to: "+5586988740413", body: "x", client: fakeClient() }),
      /Nao foi possivel confirmar/,
    );
  });

  test("dentro da janela: envia texto livre (mensagem de servico) e grava o outgoing", async () => {
    withEnv();
    const fetchMock = mock.method(globalThis, "fetch", async () =>
      new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] }), { status: 200 }),
    );
    const recent = new Date(Date.now() - 3600 * 1000);
    const client = fakeClient([[/SELECT COALESCE\(sent_at, created_at\)/, [{ inbound_at: recent }]]]);

    const result = await sendWhatsAppTextMessage({
      to: "86988740413",
      body: "ola",
      relatedMessageId: "wamid.in",
      client,
    });

    assert.equal(result.metaMessageId, "wamid.out");
    const [url, init] = fetchMock.mock.calls[0].arguments;
    assert.match(url, /\/123\/messages$/);
    const sent = JSON.parse(init.body);
    assert.equal(sent.type, "text", "so envia texto livre, nunca template");
    assert.equal(sent.to, "+5586988740413");
    assert.ok(client.calls.some((c) => /INSERT INTO whatsapp_messages/.test(c.sql)));
  });

  test("propaga a mensagem de erro da Graph API", async () => {
    withEnv();
    mock.method(globalThis, "fetch", async () =>
      new Response(JSON.stringify({ error: { message: "(#131047) Re-engagement message" } }), { status: 400 }),
    );
    await assert.rejects(
      sendWhatsAppTextMessage({ to: "86988740413", body: "x", enforceReplyWindow: false, client: fakeClient() }),
      /131047/,
    );
  });

  test(
    "corpo acima de 4096 caracteres (limite da Meta) deveria ser truncado/dividido antes do envio",
    async () => {
      withEnv();
      const fetchMock = mock.method(globalThis, "fetch", async () =>
        new Response(JSON.stringify({ messages: [{ id: "w" }] }), { status: 200 }),
      );
      await sendWhatsAppTextMessage({ to: "86988740413", body: "a".repeat(5000), enforceReplyWindow: false, client: fakeClient() });
      const sent = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
      assert.ok(sent.text.body.length <= 4096);
    },
  );
});

describe("processWhatsAppWebhookPayload (status / cobranca)", () => {
  const statusPayload = (status, extra = {}) => ({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              statuses: [
                {
                  id: "wamid.out",
                  status,
                  timestamp: "1762250000",
                  recipient_id: "5586988740413",
                  pricing: { billable: true, pricing_model: "PMP", type: "regular", category: "service" },
                  ...extra,
                },
              ],
            },
          },
        ],
      },
    ],
  });

  test("grava evento e status", async () => {
    const client = fakeClient([[/INSERT INTO whatsapp_webhook_events/, [{ id: 1 }]]]);
    const summary = await processWhatsAppWebhookPayload(statusPayload("delivered"), client);
    assert.deepEqual(summary, { storedEvents: 1, processedMessages: 0, processedStatuses: 1 });
  });

  test(
    "atualizacao de status nao deveria sobrescrever o payload enviado (texto da mensagem)",
    async () => {
      const client = fakeClient();
      await processWhatsAppWebhookPayload(statusPayload("delivered"), client);
      const upsert = client.calls.find((c) => /ON CONFLICT \(meta_message_id\)/.test(c.sql));
      assert.doesNotMatch(upsert.sql, /payload = EXCLUDED\.payload/);
    },
  );

  test(
    "status fora de ordem (read antes de delivered) nao deveria regredir",
    async () => {
      const client = fakeClient();
      await processWhatsAppWebhookPayload(statusPayload("delivered"), client);
      const upsert = client.calls.find((c) => /ON CONFLICT \(meta_message_id\)/.test(c.sql));
      assert.doesNotMatch(upsert.sql, /status = EXCLUDED\.status,/);
    },
  );

  test(
    "dados de cobranca (pricing.billable/category/type) deveriam ser persistidos em colunas",
    async () => {
      const client = fakeClient();
      await processWhatsAppWebhookPayload(statusPayload("delivered"), client);
      const upsert = client.calls.find((c) => /INSERT INTO whatsapp_messages/.test(c.sql));
      assert.match(upsert.sql, /billable|pricing_category/);
    },
  );
});
