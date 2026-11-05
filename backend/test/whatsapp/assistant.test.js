import { test, describe, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/config/database.js";
import {
  __testing as t,
  handleIncomingWhatsAppMessage,
} from "../../src/services/whatsappAssistantService.js";

afterEach(() => mock.restoreAll());

const intentOf = (text, session = null, ref = new Date("2026-11-04T15:00:00-03:00")) =>
  t.buildHeuristicIntent(text, session, ref)?.intent ?? null;

describe("roteamento local (comandos / heuristicas)", () => {
  test("comandos curtos nao chamam o Gemini", () => {
    const ref = new Date("2026-11-04T15:00:00-03:00");
    assert.equal(t.buildCommandIntent("hoje", ref).slots.start_date, "2026-11-04");
    assert.equal(t.buildCommandIntent("/ajuda", ref).intent, "help");
    assert.equal(t.buildCommandIntent("gastei 10", ref), null);
  });

  test("intencoes explicitas", () => {
    assert.equal(intentOf("crie a categoria lazer"), "create_category");
    assert.equal(intentOf("liste minhas categorias"), "list_categories");
    assert.equal(intentOf("delete essa transacao"), "delete_entry");
    assert.equal(intentOf("renomear a categoria lazer para viagem"), "update_category");
  });

  test("passo de valor no fluxo", () => {
    const session = { current_intent: "create_entry", current_step: "amount" };
    const r = t.buildHeuristicIntent("R$ 1.234,56", session, new Date());
    assert.equal(r.intent, "create_entry");
    assert.equal(r.slots.amount, 1234.56);
  });

  test(
    "lancamento com 'verduras' + 'conta' nao pode virar 'listar contas'",
    () => {
      assert.equal(intentOf("gastei 30 em verduras na conta nubank"), null);
    },
  );

  test(
    "lancamento mencionando 'crianca' + 'conta' nao pode criar conta de pagamento",
    () => {
      assert.equal(intentOf("gastei 50 com a crianca na conta nubank"), null);
    },
  );

  test(
    "exemplos da propria mensagem de ajuda devem ser reconhecidos localmente",
    () => {
      assert.equal(intentOf("exclua a conta inter"), "delete_payment_account");
      assert.equal(intentOf("renomeie a forma de pagamento pix para pix pessoal"), "update_payment_method");
    },
  );
});

describe("datas e valores", () => {
  test("parseLocaleAmount", () => {
    assert.equal(t.parseLocaleAmount("1.000,50"), 1000.5);
    assert.equal(t.parseLocaleAmount("R$ 25"), 25);
    assert.equal(t.parseLocaleAmount("10.5"), 10.5);
    assert.equal(t.parseLocaleAmount("abc"), null);
    assert.equal(t.parseLocaleAmount("0"), null);
  });

  test("datas relativas no fuso de Fortaleza", () => {
    // 23h30 em Fortaleza = 02h30 UTC do dia seguinte
    const ref = new Date("2026-10-31T23:30:00-03:00");
    assert.equal(t.parseRelativeDateText("hoje", ref), "2026-10-31");
    assert.equal(t.parseRelativeDateText("15/10/2026", ref), "2026-10-15");
  });

  test(
    "datas impossiveis devem ser rejeitadas",
    () => {
      const ref = new Date("2026-11-04T12:00:00-03:00");
      assert.equal(t.parseRelativeDateText("45", ref), null);
      assert.equal(t.parseRelativeDateText("31/02", ref), null);
    },
  );

  test(
    "'mes' consultado as 23h30 de 31/10 (Fortaleza) com servidor em UTC deve ser outubro",
    () => {
      const previousTz = process.env.TZ;
      process.env.TZ = "UTC";
      try {
        const ref = new Date("2026-10-31T23:30:00-03:00");
        assert.deepEqual(t.getCurrentMonthRange(ref), {
          startDate: "2026-10-01",
          endDate: "2026-10-31",
        });
      } finally {
        process.env.TZ = previousTz;
      }
    },
  );
});

describe("referencias a itens recentes", () => {
  const recent = [{ id: 3, name: "mais recente" }, { id: 2 }, { id: 1, name: "mais antiga" }];

  test("indice numerico", () => {
    assert.equal(t.getRecentItemByReference(recent, { reference_index: 2 }).id, 2);
    assert.equal(t.getRecentItemByReference(recent, { reference_index: 9 }), null);
  });

  test("lista e da mais recente para a mais antiga: 'primeira' e 'ultima' = item 1", () => {
    assert.equal(t.getRecentItemByReference(recent, { reference_text: "primeira" }).id, 3);
    assert.equal(t.getRecentItemByReference(recent, { reference_text: "ultima" }).id, 3);
  });

  test("'ultima da lista' e o ultimo item exibido", () => {
    assert.equal(t.getRecentItemByReference(recent, { reference_text: "ultima da lista" }).id, 1);
  });

  test("findByName ignora acentos e caixa, e cai para busca parcial", () => {
    const items = [{ name: "Cartão Nubank" }, { name: "Pix" }];
    assert.equal(t.findByName(items, "pix").name, "Pix");
    assert.equal(t.findByName(items, "cartao").name, "Cartão Nubank");
  });
});

describe("roteamento local: casos que antes geravam acoes erradas", () => {
  test("lancamentos com 'conta' no texto nao viram CRUD de contas", () => {
    for (const text of [
      "gastei 50 em um tenis novo na conta nubank",
      "paguei a conversa com o contador na conta inter",
      "comprei verduras e paguei na conta nubank",
    ]) {
      assert.equal(intentOf(text), null, text);
    }
  });

  test("nomes preservam acentos e maiusculas", () => {
    const r = t.buildHeuristicIntent("Crie a categoria Educação", null, new Date());
    assert.equal(r.slots.category_name, "Educação");
  });

  test("exclusao com 'conta de pagamento' continua sendo conta", () => {
    assert.equal(intentOf("exclua a conta de pagamento inter"), "delete_payment_account");
  });
});

describe("handleIncomingWhatsAppMessage (impacto de custo)", () => {
  function setupEnv() {
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123";
    process.env.WHATSAPP_ACCESS_TOKEN = "token";
    process.env.WHATSAPP_ASSISTANT_ENABLED = "true";
  }

  function fakeClient() {
    const calls = [];
    return {
      calls,
      release() {},
      async query(sql, params) {
        calls.push({ sql, params });
        if (/SELECT COALESCE\(sent_at, created_at\)/.test(sql)) {
          return { rows: [{ inbound_at: new Date() }] };
        }
        return { rows: [] };
      },
    };
  }

  test("numero NAO cadastrado recebe resposta (mensagem de servico cobravel apos 1.000/mes)", async () => {
    setupEnv();
    const client = fakeClient();
    mock.method(pool, "connect", async () => client);
    const fetchMock = mock.method(globalThis, "fetch", async () =>
      new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] }), { status: 200 }),
    );

    const handled = await handleIncomingWhatsAppMessage({
      id: "wamid.in",
      from: "5511999990000",
      timestamp: String(Math.floor(Date.now() / 1000)),
      type: "text",
      text: { body: "oi" },
    });

    assert.equal(handled, true);
    assert.equal(fetchMock.mock.callCount(), 1, "1 mensagem enviada para um desconhecido");
    assert.match(JSON.parse(fetchMock.mock.calls[0].arguments[1].body).text.body, /Nao encontrei nenhuma conta/);
  });

  test("assistente desligado nao envia nada", async () => {
    process.env.WHATSAPP_ASSISTANT_ENABLED = "false";
    const fetchMock = mock.method(globalThis, "fetch", async () => {
      throw new Error("nao deveria enviar");
    });
    assert.equal(await handleIncomingWhatsAppMessage({ from: "5586988740413" }), true);
    assert.equal(fetchMock.mock.callCount(), 0);
    process.env.WHATSAPP_ASSISTANT_ENABLED = "true";
  });
});
