import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { __testing as t } from "../../src/services/whatsappAssistantService.js";
import {
  detectFinanceQuestion,
  formatBalanceReply,
  formatCardsReply,
  formatDebtsReply,
  matchFinanceCommand,
} from "../../src/services/whatsappFinanceReplies.js";

const ref = new Date("2026-11-05T10:00:00-03:00");
const intentOf = (text) => t.buildHeuristicIntent(text, null, ref)?.intent ?? null;

describe("assistente: perguntas sobre saldo, faturas e dividas", () => {
  test("comandos de uma palavra", () => {
    assert.equal(t.buildCommandIntent("saldo", ref).intent, "get_balance");
    assert.equal(t.buildCommandIntent("Faturas", ref).intent, "get_cards");
    assert.equal(t.buildCommandIntent("dívidas", ref).intent, "get_debts");
    assert.equal(matchFinanceCommand("/saldo?"), "get_balance");
    // "mes" continua sendo o resumo do periodo
    assert.equal(t.buildCommandIntent("mes", ref).intent, "get_entries");
  });

  test("perguntas em linguagem natural", () => {
    assert.equal(intentOf("qual meu saldo?"), "get_balance");
    assert.equal(intentOf("quanto eu tenho na conta?"), "get_balance");
    assert.equal(intentOf("quanto devo?"), "get_debts");
    assert.equal(intentOf("quantas parcelas faltam do financiamento"), "get_debts");
    assert.equal(intentOf("como esta a fatura do nubank?"), "get_cards");
    assert.equal(intentOf("qual o limite do cartao"), "get_cards");
  });

  test("lancamentos e acoes NAO viram consulta", () => {
    for (const text of [
      "gastei 50 no cartao nubank",
      "paguei a fatura do nubank",
      "paguei 400 do financiamento",
      "crie a conta nubank",
      "exclua a divida",
    ]) {
      assert.equal(detectFinanceQuestion(text), null, text);
    }
  });

  test("saldo de um periodo continua sendo o resumo do periodo", () => {
    assert.equal(intentOf("qual meu saldo deste mes"), "get_entries");
  });
});

const overview = {
  today: "2026-11-05",
  cash_total: 12927.7,
  cards_owed: 1810.8,
  debts_total: 29840,
  net_worth: -18723.1,
  previous_month_cash: 8620,
  accounts: [
    {
      id: 1,
      name: "Nubank",
      balance: 9000,
      card: {
        owed: 1810.8,
        open_invoice: 610.8,
        closed_invoice: 1200,
        credit_limit: 6000,
        available_limit: 4189.2,
        next_closing_date: "2026-12-03",
        next_due_date: "2026-11-10",
      },
    },
    { id: 2, name: "Inter", balance: 3927.7, card: null },
  ],
  unassigned: { balance: 0, opening_balance: 0, card_owed: 0 },
  debts: [
    {
      id: 1,
      name: "Financiamento do carro",
      kind: "financing",
      creditor: "Banco X",
      remaining: 28000,
      amount_due: 36000,
      paid_amount: 3200,
      installments_total: 36,
      installments_paid: 8,
      installment_amount: 1000,
      next_due_date: "2026-11-15",
      settled: false,
    },
    { id: 2, name: "Antiga", kind: "loan", remaining: 0, settled: true },
  ],
  month: { start: "2026-11-01", end: "2026-11-30", income: 5000, expense: 692.3, result: 4307.7 },
};

describe("formatacao das respostas", () => {
  test("visao geral", () => {
    const text = formatBalanceReply(overview);
    assert.match(text, /Saldo em contas: \*R\$\s12\.927,70\*/);
    assert.match(text, /Nubank: R\$\s9\.000,00/);
    assert.match(text, /Patrimônio líquido: \*-R\$\s18\.723,10\*/);
    assert.match(text, /Em novembro/);
    assert.match(text, /começou o mês com R\$\s8\.620,00/);
    assert.match(text, /10\/11 — Fatura Nubank/);
    assert.match(text, /15\/11 — Financiamento do carro/);
    assert.doesNotMatch(text, /Antiga/);
  });

  test("cartoes", () => {
    const text = formatCardsReply(overview);
    assert.match(text, /Fatura fechada: R\$\s1\.200,00 • vence 10\/11 \(em 5 dias\)/);
    assert.match(text, /Limite disponível: R\$\s4\.189,20 de R\$\s6\.000,00/);
    assert.doesNotMatch(text, /Inter/);
    assert.match(formatCardsReply({ ...overview, accounts: [] }), /ainda não tem cartões/);
  });

  test("dividas", () => {
    const text = formatDebtsReply(overview);
    assert.match(text, /Financiamento do carro\* \(Financiamento • Banco X\)/);
    assert.match(text, /8\/36 parcelas pagas/);
    assert.match(text, /Falta pagar: R\$\s28\.000,00/);
    assert.doesNotMatch(text, /Antiga/);
    assert.match(formatDebtsReply({ ...overview, debts: [] }), /não tem dívidas em aberto/);
  });
});
