import pool from "../config/database.js";

/**
 * Visao geral financeira ("como um banco").
 *
 * Regras:
 * - Saldo de uma conta = saldo inicial + ganhos - gastos que sairam na hora
 *   - transferencias enviadas + transferencias recebidas - pagamentos de fatura feitos com ela.
 * - Gasto no credito (a partir de users.card_tracking_since) nao sai do saldo:
 *   vai para a fatura do cartao da conta, ate ser pago (account_transfers kind=card_payment).
 * - Lancamentos sem conta ficam no bucket "Fora das contas" (users.opening_balance).
 * - Divida: valor devido no cadastro - parcelas pagas (entries.debt_id).
 * - Patrimonio = saldo total - faturas - dividas.
 * - Lancamentos com data futura nao entram nos saldos.
 */

export const FINANCE_TIME_ZONE = "America/Fortaleza";
export const DEBT_KINDS = ["loan", "financing", "installment", "other"];
export const TRANSFER_KINDS = ["transfer", "card_payment"];

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

export function getLocalToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FINANCE_TIME_ZONE }).format(now);
}

function parseIsoDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function isoOf(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function shiftMonth(y, m, delta) {
  const index = y * 12 + (m - 1) + delta;
  return { y: Math.floor(index / 12), m: (index % 12) + 1 };
}

/** Dia `day` do mes (limitado ao ultimo dia: 31 em fevereiro vira 28/29). */
function clampedDate(y, m, day) {
  return isoOf(y, m, Math.min(day, daysInMonth(y, m)));
}

export function addDaysIso(iso, delta) {
  const { y, m, d } = parseIsoDate(iso);
  const date = new Date(Date.UTC(y, m - 1, d + delta));
  return date.toISOString().slice(0, 10);
}

/** Ultimo fechamento (<= hoje) e proximo vencimento da fatura. */
export function getCardCycle(today, closingDay, dueDay) {
  if (!closingDay) {
    return null;
  }

  const { y, m, d } = parseIsoDate(today);
  const closingThisMonth = clampedDate(y, m, closingDay);
  const lastClosing =
    d >= Number(closingThisMonth.slice(8))
      ? closingThisMonth
      : (() => {
          const prev = shiftMonth(y, m, -1);
          return clampedDate(prev.y, prev.m, closingDay);
        })();
  const closingParts = parseIsoDate(lastClosing);
  const nextClosingMonth = shiftMonth(closingParts.y, closingParts.m, 1);
  const nextClosing = clampedDate(nextClosingMonth.y, nextClosingMonth.m, closingDay);

  let nextDue = null;
  if (dueDay) {
    // vencimento da fatura que fechou em lastClosing: primeiro dueDay depois do fechamento
    const closing = parseIsoDate(lastClosing);
    let candidate = clampedDate(closing.y, closing.m, dueDay);
    if (candidate <= lastClosing) {
      const next = shiftMonth(closing.y, closing.m, 1);
      candidate = clampedDate(next.y, next.m, dueDay);
    }
    nextDue = candidate;
  }

  return { lastClosing, nextClosing, nextDue };
}

/** Proxima data com o dia `dueDay` a partir de hoje (inclusive). */
export function getNextMonthlyDate(today, dueDay) {
  if (!dueDay) {
    return null;
  }
  const { y, m } = parseIsoDate(today);
  const thisMonth = clampedDate(y, m, dueDay);
  if (thisMonth >= today) {
    return thisMonth;
  }
  const next = shiftMonth(y, m, 1);
  return clampedDate(next.y, next.m, dueDay);
}

const BALANCE_SQL = `
  WITH u AS (
    SELECT card_tracking_since AS since FROM users WHERE id = $1
  ),
  live_accounts AS (
    SELECT id FROM payment_accounts WHERE user_id = $1 AND deleted_at IS NULL
  ),
  e AS (
    SELECT
      CASE WHEN e.payment_account_id IN (SELECT id FROM live_accounts)
        THEN e.payment_account_id END AS account_id,
      e.type,
      e.amount,
      (COALESCE(pm.is_credit, FALSE) AND e.date >= u.since) AS on_card
    FROM entries e
    CROSS JOIN u
    LEFT JOIN payment_methods pm ON pm.id = e.payment_method_id
    WHERE e.user_id = $1 AND e.date <= $2::date
  ),
  t AS (
    SELECT kind, amount,
      CASE WHEN from_account_id IN (SELECT id FROM live_accounts) THEN from_account_id END AS from_id,
      CASE WHEN to_account_id IN (SELECT id FROM live_accounts) THEN to_account_id END AS to_id
    FROM account_transfers
    WHERE user_id = $1 AND date <= $2::date
  ),
  movements AS (
    SELECT account_id,
      CASE
        WHEN type = 'income' THEN amount
        WHEN NOT on_card THEN -amount
        ELSE 0
      END AS cash,
      CASE WHEN type = 'expense' AND on_card THEN amount ELSE 0 END AS card
    FROM e
    UNION ALL
    SELECT from_id, -amount, 0 FROM t
    UNION ALL
    SELECT to_id, amount, 0 FROM t WHERE kind = 'transfer'
    UNION ALL
    SELECT to_id, 0, -amount FROM t WHERE kind = 'card_payment'
  )
  SELECT account_id, SUM(cash) AS cash, SUM(card) AS card
  FROM movements
  GROUP BY account_id
`;

/** Movimento acumulado ate `cutoff` por conta (null = fora das contas). */
export async function getBalanceMovements(userId, cutoff, client = pool) {
  const result = await client.query(BALANCE_SQL, [userId, cutoff]);
  const map = new Map();
  for (const row of result.rows) {
    map.set(row.account_id ?? null, { cash: round2(row.cash), card: round2(row.card) });
  }
  return map;
}

async function getAccountsWithFlags(userId, client) {
  const result = await client.query(
    `
      SELECT
        pa.id, pa.name, pa.initial_balance, pa.credit_limit, pa.closing_day, pa.due_day,
        COALESCE(BOOL_OR(pm.is_credit), FALSE) AS has_card,
        COALESCE(BOOL_OR(NOT pm.is_credit), FALSE) AS has_debit,
        COALESCE(
          ARRAY_AGG(pm.id ORDER BY pm.id) FILTER (WHERE pm.id IS NOT NULL),
          '{}'
        ) AS payment_method_ids
      FROM payment_accounts pa
      LEFT JOIN payment_method_accounts pma ON pma.payment_account_id = pa.id
      LEFT JOIN payment_methods pm
        ON pm.id = pma.payment_method_id AND pm.deleted_at IS NULL
      WHERE pa.user_id = $1 AND pa.deleted_at IS NULL
      GROUP BY pa.id
      ORDER BY LOWER(pa.name)
    `,
    [userId],
  );
  return result.rows;
}

async function getOpenCycleCardSpend(userId, sinceDate, client) {
  // gastos no credito por conta e data desde `sinceDate` (para separar fatura aberta x fechada)
  const result = await client.query(
    `
      SELECT e.payment_account_id AS account_id, e.date::text AS date, SUM(e.amount) AS total
      FROM entries e
      JOIN payment_methods pm ON pm.id = e.payment_method_id AND pm.is_credit
      JOIN users u ON u.id = e.user_id
      WHERE e.user_id = $1 AND e.type = 'expense'
        AND e.date >= GREATEST($2::date, u.card_tracking_since)
      GROUP BY e.payment_account_id, e.date
    `,
    [userId, sinceDate],
  );
  return result.rows.map((row) => ({ ...row, total: round2(row.total) }));
}

export async function getDebtsWithProgress(userId, today, client = pool) {
  const result = await client.query(
    `
      SELECT
        d.*,
        COALESCE(SUM(e.amount), 0) AS paid_amount,
        COUNT(e.id)::int AS payments_count,
        MAX(e.date)::text AS last_payment_date
      FROM debts d
      LEFT JOIN entries e ON e.debt_id = d.id AND e.user_id = d.user_id
      WHERE d.user_id = $1
      GROUP BY d.id
      ORDER BY d.closed_at NULLS FIRST, d.created_at DESC
    `,
    [userId],
  );

  return result.rows.map((row) => {
    const amountDue = round2(row.amount_due);
    const paid = round2(row.paid_amount);
    const remaining = Math.max(round2(amountDue - paid), 0);
    const installmentsPaid = Number(row.installments_paid_before || 0) + row.payments_count;
    const installmentsTotal = row.installments_total ? Number(row.installments_total) : null;
    const settled = remaining <= 0 || Boolean(row.closed_at);

    return {
      id: row.id,
      name: row.name,
      kind: row.kind,
      creditor: row.creditor,
      notes: row.notes,
      amount_due: amountDue,
      installment_amount: row.installment_amount === null ? null : round2(row.installment_amount),
      installments_total: installmentsTotal,
      installments_paid_before: Number(row.installments_paid_before || 0),
      installments_paid: installmentsPaid,
      due_day: row.due_day,
      start_date: row.start_date instanceof Date ? row.start_date.toISOString().slice(0, 10) : row.start_date,
      paid_amount: paid,
      remaining,
      last_payment_date: row.last_payment_date,
      next_due_date: settled ? null : getNextMonthlyDate(today, row.due_day),
      settled,
      closed_at: row.closed_at,
    };
  });
}

function buildAccountView(account, movements, today, openCycleSpend) {
  const own = movements.get(account.id) || { cash: 0, card: 0 };
  const balance = round2(Number(account.initial_balance) + own.cash);
  const view = {
    id: account.id,
    name: account.name,
    balance,
    initial_balance: round2(account.initial_balance),
    has_card: account.has_card,
    has_debit: account.has_debit,
    payment_method_ids: account.payment_method_ids,
    card: null,
  };

  if (account.has_card || own.card !== 0) {
    const owed = round2(own.card);
    const cycle = getCardCycle(today, account.closing_day, account.due_day);
    let openInvoice = owed;
    let closedInvoice = 0;

    if (cycle) {
      const spentAfterClosing = round2(
        openCycleSpend
          .filter((row) => row.account_id === account.id && row.date > cycle.lastClosing)
          .reduce((sum, row) => sum + row.total, 0),
      );
      openInvoice = Math.min(owed, spentAfterClosing);
      closedInvoice = round2(Math.max(owed - openInvoice, 0));
    }

    const limit = account.credit_limit === null ? null : round2(account.credit_limit);
    view.card = {
      owed,
      open_invoice: round2(openInvoice),
      closed_invoice: closedInvoice,
      credit_limit: limit,
      available_limit: limit === null ? null : round2(limit - Math.max(owed, 0)),
      closing_day: account.closing_day,
      due_day: account.due_day,
      next_closing_date: cycle?.nextClosing ?? null,
      next_due_date: cycle?.nextDue ?? getNextMonthlyDate(today, account.due_day),
    };
  }

  return view;
}

async function getMonthTotals(userId, start, end, client) {
  const result = await client.query(
    `
      SELECT type, SUM(amount) AS total
      FROM entries
      WHERE user_id = $1 AND date BETWEEN $2::date AND $3::date
      GROUP BY type
    `,
    [userId, start, end],
  );
  const totals = { income: 0, expense: 0 };
  for (const row of result.rows) totals[row.type] = round2(row.total);
  return { ...totals, result: round2(totals.income - totals.expense) };
}

function sumCash(accounts, unassignedBalance) {
  return round2(accounts.reduce((sum, a) => sum + a.balance, 0) + unassignedBalance);
}

export async function getFinanceOverview(userId, { today = getLocalToday() } = {}, client = pool) {
  const { y, m } = parseIsoDate(today);
  const monthStart = isoOf(y, m, 1);
  const monthEnd = isoOf(y, m, daysInMonth(y, m));
  const previousMonthEnd = addDaysIso(monthStart, -1);

  const [userResult, accountsRaw, movements, previousMovements, openCycleSpend, debts, month] =
    await Promise.all([
      client.query("SELECT opening_balance FROM users WHERE id = $1", [userId]),
      getAccountsWithFlags(userId, client),
      getBalanceMovements(userId, today, client),
      getBalanceMovements(userId, previousMonthEnd, client),
      getOpenCycleCardSpend(userId, addDaysIso(today, -62), client),
      getDebtsWithProgress(userId, today, client),
      getMonthTotals(userId, monthStart, monthEnd, client),
    ]);

  const openingBalance = round2(userResult.rows[0]?.opening_balance ?? 0);
  const accounts = accountsRaw.map((account) =>
    buildAccountView(account, movements, today, openCycleSpend),
  );

  const unassignedMovement = movements.get(null) || { cash: 0, card: 0 };
  const unassigned = {
    balance: round2(openingBalance + unassignedMovement.cash),
    opening_balance: openingBalance,
    card_owed: round2(unassignedMovement.card),
  };

  const cashTotal = sumCash(accounts, unassigned.balance);

  const previousAccounts = accountsRaw.map((account) => ({
    balance: round2(Number(account.initial_balance) + (previousMovements.get(account.id)?.cash || 0)),
  }));
  const previousCash = sumCash(
    previousAccounts,
    round2(openingBalance + (previousMovements.get(null)?.cash || 0)),
  );

  const cardsOwed = round2(
    accounts.reduce((sum, a) => sum + Math.max(a.card?.owed || 0, 0), 0) +
      Math.max(unassigned.card_owed, 0),
  );
  const openDebts = debts.filter((debt) => !debt.settled);
  const debtsTotal = round2(openDebts.reduce((sum, debt) => sum + debt.remaining, 0));

  return {
    today,
    cash_total: cashTotal,
    cards_owed: cardsOwed,
    debts_total: debtsTotal,
    net_worth: round2(cashTotal - cardsOwed - debtsTotal),
    previous_month_cash: previousCash,
    accounts,
    unassigned,
    debts,
    month: { start: monthStart, end: monthEnd, ...month },
  };
}

/** Saldo atual (so dinheiro) de uma conta ou do bucket "fora das contas" (accountId null). */
export async function getCurrentCash(userId, accountId, client = pool) {
  const movements = await getBalanceMovements(userId, getLocalToday(), client);
  return movements.get(accountId ?? null)?.cash || 0;
}
