import { test, describe, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/config/database.js";
import {
  addDaysIso,
  getCardCycle,
  getFinanceOverview,
  getNextMonthlyDate,
} from "../../src/services/financeService.js";
import { createDebt, createTransfer, adjustBalance } from "../../src/controllers/financeController.js";

afterEach(() => mock.restoreAll());

function fakeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("datas de fatura e vencimento", () => {
  test("ciclo do cartao: depois do fechamento, vencimento no mes", () => {
    assert.deepEqual(getCardCycle("2026-11-04", 3, 10), {
      lastClosing: "2026-11-03",
      nextClosing: "2026-12-03",
      nextDue: "2026-11-10",
    });
  });

  test("ciclo do cartao: antes do fechamento usa o mes anterior", () => {
    assert.deepEqual(getCardCycle("2026-11-02", 3, 10), {
      lastClosing: "2026-10-03",
      nextClosing: "2026-11-03",
      nextDue: "2026-10-10",
    });
  });

  test("vencimento antes do dia de fechamento cai no mes seguinte", () => {
    assert.equal(getCardCycle("2026-11-26", 25, 5).nextDue, "2026-12-05");
  });

  test("dia 31 em fevereiro vira o ultimo dia do mes", () => {
    assert.equal(getCardCycle("2027-02-28", 31, null).lastClosing, "2027-02-28");
    assert.equal(getNextMonthlyDate("2027-02-10", 31), "2027-02-28");
  });

  test("sem dia de fechamento nao ha ciclo", () => {
    assert.equal(getCardCycle("2026-11-04", null, 10), null);
  });

  test("proximo vencimento mensal", () => {
    assert.equal(getNextMonthlyDate("2026-11-04", 15), "2026-11-15");
    assert.equal(getNextMonthlyDate("2026-11-20", 15), "2026-12-15");
    assert.equal(getNextMonthlyDate("2026-12-20", 15), "2027-01-15");
    assert.equal(getNextMonthlyDate("2026-11-04", null), null);
  });

  test("addDaysIso atravessa meses e anos", () => {
    assert.equal(addDaysIso("2026-11-01", -1), "2026-10-31");
    assert.equal(addDaysIso("2026-12-31", 1), "2027-01-01");
  });
});

describe("getFinanceOverview", () => {
  test("soma contas, fora das contas, faturas e dividas no patrimonio", async () => {
    const client = {
      async query(sql, params) {
        if (/SELECT opening_balance FROM users/.test(sql)) return { rows: [{ opening_balance: "100" }] };
        if (/FROM payment_accounts pa/.test(sql)) {
          return {
            rows: [
              {
                id: 1,
                name: "Banco",
                initial_balance: "1000",
                credit_limit: "3000",
                closing_day: 3,
                due_day: 10,
                has_card: true,
                has_debit: true,
                payment_method_ids: [1, 2],
              },
            ],
          };
        }
        if (/WITH u AS/.test(sql)) {
          // cutoff atual x fim do mes anterior
          return params[1] === "2026-11-04"
            ? { rows: [{ account_id: 1, cash: "500", card: "800" }, { account_id: null, cash: "-40", card: "0" }] }
            : { rows: [{ account_id: 1, cash: "200", card: "300" }] };
        }
        if (/pm.is_credit\s+JOIN users/.test(sql)) {
          return {
            rows: [
              { account_id: 1, date: "2026-11-04", total: "120" },
              { account_id: 1, date: "2026-11-01", total: "50" },
            ],
          };
        }
        if (/FROM debts d/.test(sql)) {
          return {
            rows: [
              {
                id: 9, name: "Carro", kind: "financing", amount_due: "10000", paid_amount: "1000",
                payments_count: 1, installments_paid_before: 2, installments_total: 12,
                installment_amount: "1000", due_day: 15, closed_at: null, start_date: "2026-10-01",
              },
              {
                id: 10, name: "Quitada", kind: "other", amount_due: "300", paid_amount: "300",
                payments_count: 1, installments_paid_before: 0, installments_total: null,
                installment_amount: null, due_day: null, closed_at: null, start_date: "2026-10-01",
              },
            ],
          };
        }
        if (/GROUP BY type/.test(sql)) {
          return { rows: [{ type: "income", total: "2000" }, { type: "expense", total: "700" }] };
        }
        throw new Error("query inesperada: " + sql.slice(0, 80));
      },
    };

    const o = await getFinanceOverview(7, { today: "2026-11-04" }, client);

    assert.equal(o.accounts[0].balance, 1500);
    assert.equal(o.unassigned.balance, 60);
    assert.equal(o.cash_total, 1560);
    assert.equal(o.cards_owed, 800);
    assert.equal(o.accounts[0].card.open_invoice, 120, "so gastos depois do fechamento (dia 3)");
    assert.equal(o.accounts[0].card.closed_invoice, 680);
    assert.equal(o.accounts[0].card.available_limit, 2200);
    assert.equal(o.debts_total, 9000, "divida quitada nao conta");
    assert.equal(o.debts[0].installments_paid, 3);
    assert.equal(o.debts[0].next_due_date, "2026-11-15");
    assert.equal(o.debts[1].settled, true);
    assert.equal(o.net_worth, 1560 - 800 - 9000);
    assert.equal(o.previous_month_cash, 1300);
    assert.deepEqual(o.month, { start: "2026-11-01", end: "2026-11-30", income: 2000, expense: 700, result: 1300 });
  });
});

describe("validacoes do controller", () => {
  const req = (body, params = {}) => ({ user: { id: 7 }, body, params, query: {} });

  test("divida exige nome e valor positivo", async () => {
    mock.method(pool, "query", async () => {
      throw new Error("nao deveria consultar");
    });
    const res = fakeRes();
    await createDebt(req({ name: "", amount_due: 100 }), res);
    assert.equal(res.statusCode, 400);

    const res2 = fakeRes();
    await createDebt(req({ name: "Carro", amount_due: -5 }), res2);
    assert.equal(res2.statusCode, 400);
  });

  test("parcelas ja pagas precisa ser menor que o total", async () => {
    mock.method(pool, "query", async () => {
      throw new Error("nao deveria consultar");
    });
    const res = fakeRes();
    await createDebt(req({ name: "Carro", amount_due: 100, installments_total: 3, installments_paid_before: 3 }), res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /menor que o total/);
  });

  test("divida valida e gravada aceitando virgula decimal", async () => {
    const queryMock = mock.method(pool, "query", async () => ({ rows: [{ id: 1 }] }));
    const res = fakeRes();
    await createDebt(req({ name: "Notebook", amount_due: "2400,50", kind: "installment" }), res);
    assert.equal(res.statusCode, 201);
    const params = queryMock.mock.calls[0].arguments[1];
    assert.equal(params[0], 7);
    assert.ok(params.includes(2400.5));
  });

  test("transferencia exige origem diferente do destino", async () => {
    mock.method(pool, "query", async () => ({ rows: [{ id: 1 }] }));
    const res = fakeRes();
    await createTransfer(req({ amount: 10, from_account_id: 2, to_account_id: 2 }), res);
    assert.equal(res.statusCode, 400);
  });

  test("pagamento de fatura exige o cartao", async () => {
    const res = fakeRes();
    await createTransfer(req({ kind: "card_payment", amount: 10, from_account_id: 2 }), res);
    assert.equal(res.statusCode, 400);
  });

  test("data invalida e recusada", async () => {
    const res = fakeRes();
    await createTransfer(req({ amount: 10, from_account_id: 1, to_account_id: 2, date: "2026-02-30" }), res);
    assert.equal(res.statusCode, 400);
  });

  test("ajuste de saldo grava o saldo inicial que faz o saldo atual bater", async () => {
    const calls = [];
    mock.method(pool, "query", async (sql, params) => {
      calls.push({ sql, params });
      if (/WITH u AS/.test(sql)) return { rows: [{ account_id: null, cash: "250.50", card: "0" }] };
      return { rows: [] };
    });
    const res = fakeRes();
    await adjustBalance(req({ balance: "1000" }, { id: "unassigned" }), res);
    assert.equal(res.statusCode, 200);
    const update = calls.find((c) => /UPDATE users SET opening_balance/.test(c.sql));
    assert.deepEqual(update.params, [749.5, 7]);
  });
});
