import { test, describe, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/config/database.js";
import { __resetFloodGuardMemory } from "../../src/services/whatsappFloodGuard.js";
import { handleIncomingWhatsAppMessage } from "../../src/services/whatsappAssistantService.js";
import { recoverStaleProcessingMessages } from "../../src/utils/whatsapp.js";

const CONTACT = {
  contact_id: 1,
  user_id: 7,
  // usuario cadastrou com o nono digito; a Meta manda o wa_id sem ele
  phone_number_e164: "+5586988740413",
  opted_in: true,
};

function fakeClient({ contact = CONTACT, onQuery } = {}) {
  const calls = [];
  return {
    calls,
    release() {},
    async query(sql, params) {
      calls.push({ sql, params });
      await onQuery?.(sql, params);
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
      if (/INSERT INTO categories/.test(sql)) {
        return { rows: [{ id: 99, user_id: 7, name: params[1] }] };
      }
      return { rows: [] };
    },
  };
}

const textMessage = (body, i = 0, from = "558688740413") => ({
  id: `wamid.in.${i}`,
  from,
  timestamp: String(Math.floor(Date.now() / 1000)),
  type: "text",
  text: { body },
});

beforeEach(() => {
  process.env.WHATSAPP_PHONE_NUMBER_ID = "123";
  process.env.WHATSAPP_ACCESS_TOKEN = "token";
  process.env.WHATSAPP_ASSISTANT_ENABLED = "true";
  __resetFloodGuardMemory();
});

afterEach(() => mock.restoreAll());

describe("handleIncomingWhatsAppMessage", () => {
  test("responde para o wa_id recebido, nao para o numero digitado no perfil", async () => {
    mock.method(pool, "connect", async () => fakeClient());
    const fetchMock = mock.method(globalThis, "fetch", async () =>
      new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] }), { status: 200 }),
    );

    assert.equal(await handleIncomingWhatsAppMessage(textMessage("ajuda")), true);
    const sent = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
    assert.equal(sent.to, "+558688740413");
  });

  test("acao executada + falha ao responder: reenvia o resultado, nao 'nao consegui'", async () => {
    mock.method(pool, "connect", async () => fakeClient());
    const bodies = [];
    let call = 0;
    mock.method(globalThis, "fetch", async (url, init) => {
      bodies.push(JSON.parse(init.body).text.body);
      call += 1;
      // 1a tentativa (resposta normal) falha; o fallback funciona
      return call === 1
        ? new Response(JSON.stringify({ error: { message: "erro temporario" } }), { status: 500 })
        : new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] }), { status: 200 });
    });

    const result = await handleIncomingWhatsAppMessage(textMessage("crie a categoria Lazer"));

    assert.equal(result, false);
    assert.equal(bodies.length, 2);
    assert.equal(bodies[1], bodies[0], "fallback repete a confirmacao da acao");
    assert.doesNotMatch(bodies[1], /Nao consegui concluir/);
  });

  test("resposta ja enviada + erro depois (ex.: banco): nao manda segunda mensagem", async () => {
    let failSessionClose = false;
    mock.method(pool, "connect", async () =>
      fakeClient({
        onQuery: async (sql) => {
          if (failSessionClose && /UPDATE whatsapp_conversation_sessions/.test(sql)) {
            throw new Error("banco caiu");
          }
        },
      }),
    );
    const fetchMock = mock.method(globalThis, "fetch", async () => {
      failSessionClose = true;
      return new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] }), { status: 200 });
    });

    const result = await handleIncomingWhatsAppMessage(textMessage("ajuda"));

    assert.equal(result, false);
    assert.equal(fetchMock.mock.callCount(), 1);
  });

  test("mensagens do mesmo numero sao processadas uma de cada vez", async () => {
    let active = 0;
    let maxActive = 0;
    mock.method(pool, "connect", async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      const client = fakeClient({ onQuery: () => new Promise((r) => setTimeout(r, 1)) });
      const release = client.release;
      client.release = () => {
        active -= 1;
        release();
      };
      return client;
    });
    mock.method(globalThis, "fetch", async () =>
      new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] }), { status: 200 }),
    );

    await Promise.all([
      handleIncomingWhatsAppMessage(textMessage("ajuda", 1)),
      handleIncomingWhatsAppMessage(textMessage("ajuda", 2)),
      handleIncomingWhatsAppMessage(textMessage("ajuda", 3)),
    ]);

    assert.equal(maxActive, 1);
  });

  test("uma falha nao trava a fila do numero", async () => {
    let first = true;
    mock.method(pool, "connect", async () => {
      if (first) {
        first = false;
        throw new Error("pool esgotado");
      }
      return fakeClient();
    });
    mock.method(globalThis, "fetch", async () =>
      new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] }), { status: 200 }),
    );

    await assert.rejects(handleIncomingWhatsAppMessage(textMessage("ajuda", 1)));
    assert.equal(await handleIncomingWhatsAppMessage(textMessage("ajuda", 2)), true);
  });
});

describe("recoverStaleProcessingMessages", () => {
  test("marca como failed apenas mensagens antigas em processing", async () => {
    const calls = [];
    const client = {
      async query(sql, params) {
        calls.push({ sql, params });
        return { rows: [{ id: 1 }, { id: 2 }] };
      },
    };

    assert.equal(await recoverStaleProcessingMessages({ olderThanMinutes: 10 }, client), 2);
    assert.match(calls[0].sql, /status = 'processing'/);
    assert.match(calls[0].sql, /direction = 'incoming'/);
    assert.deepEqual(calls[0].params, [10]);
  });
});
