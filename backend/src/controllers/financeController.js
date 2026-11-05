import pool from "../config/database.js";
import {
  DEBT_KINDS,
  TRANSFER_KINDS,
  getCurrentCash,
  getDebtsWithProgress,
  getFinanceOverview,
  getLocalToday,
} from "../services/financeService.js";
import { validatePaymentSelection } from "../utils/paymentMethods.js";
import { bumpEntryCacheVersions } from "../utils/cache.js";
import { emitToUser, emitTransactionCreated } from "../utils/socket.js";

const MAX_AMOUNT = 9_999_999_999.99;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function fail(status, message) {
  throw new HttpError(status, message);
}

function handle(label, fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ status: "ERROR", message: error.message });
      }
      console.error(`${label} error:`, error);
      res.status(500).json({ status: "ERROR", message: "Erro interno, tente novamente" });
    }
  };
}

function notifyFinanceChanged(userId) {
  emitToUser(userId, "finance:updated", { at: Date.now() });
}

function parseId(value, label = "ID") {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) fail(400, `${label} invalido`);
  return parsed;
}

function optionalId(value, label) {
  return value === undefined || value === null || value === "" ? null : parseId(value, label);
}

function parseMoney(value, label, { allowNegative = false, allowZero = false, optional = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (optional) return null;
    fail(400, `${label} e obrigatorio`);
  }
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed) || Math.abs(parsed) > MAX_AMOUNT) fail(400, `${label} invalido`);
  if (!allowNegative && parsed < 0) fail(400, `${label} nao pode ser negativo`);
  if (!allowZero && !allowNegative && parsed === 0) fail(400, `${label} deve ser maior que zero`);
  return Math.round(parsed * 100) / 100;
}

function parseDay(value, label) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) fail(400, `${label} deve ser entre 1 e 31`);
  return parsed;
}

function parseDate(value, { fallbackToday = true } = {}) {
  if (!value && fallbackToday) return getLocalToday();
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(400, "Data invalida (use AAAA-MM-DD)");
  const [y, m, d] = value.split("-").map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) fail(400, "Data invalida");
  return value;
}

function parseText(value, label, { max = 120, required = false } = {}) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    if (required) fail(400, `${label} e obrigatorio`);
    return null;
  }
  if (text.length > max) fail(400, `${label} pode ter no maximo ${max} caracteres`);
  return text;
}

async function getOwnAccount(userId, accountId, client = pool) {
  const result = await client.query(
    "SELECT * FROM payment_accounts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
    [accountId, userId],
  );
  if (!result.rows[0]) fail(404, "Conta nao encontrada");
  return result.rows[0];
}

/** Define exatamente quais formas de pagamento usam a conta. */
async function setAccountMethods(client, userId, accountId, methodIds) {
  if (!Array.isArray(methodIds)) return;
  const ids = [...new Set(methodIds.map((id) => parseId(id, "Forma de pagamento")))];

  if (ids.length > 0) {
    const valid = await client.query(
      `SELECT id FROM payment_methods
       WHERE user_id = $1 AND deleted_at IS NULL AND accounts_enabled AND id = ANY($2::int[])`,
      [userId, ids],
    );
    if (valid.rows.length !== ids.length) fail(400, "Forma de pagamento invalida para conta");
  }

  await client.query(
    `DELETE FROM payment_method_accounts
     WHERE payment_account_id = $1 AND NOT (payment_method_id = ANY($2::int[]))`,
    [accountId, ids],
  );
  for (const methodId of ids) {
    await client.query(
      `INSERT INTO payment_method_accounts (payment_method_id, payment_account_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [methodId, accountId],
    );
  }
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ---------- visao geral ----------

export const getOverview = handle("Finance overview", async (req, res) => {
  const overview = await getFinanceOverview(req.user.id);
  res.json({ status: "OK", overview });
});

// ---------- contas ----------

export const createAccount = handle("Create account", async (req, res) => {
  const userId = req.user.id;
  const name = parseText(req.body.name, "Nome da conta", { required: true });
  const currentBalance = parseMoney(req.body.current_balance ?? 0, "Saldo atual", { allowNegative: true });
  const creditLimit = parseMoney(req.body.credit_limit, "Limite", { optional: true, allowZero: true });
  const closingDay = parseDay(req.body.closing_day, "Dia de fechamento");
  const dueDay = parseDay(req.body.due_day, "Dia de vencimento");

  const account = await withTransaction(async (client) => {
    const duplicate = await client.query(
      "SELECT 1 FROM payment_accounts WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND deleted_at IS NULL",
      [userId, name],
    );
    if (duplicate.rows.length) fail(409, "Ja existe uma conta com esse nome");

    const inserted = await client.query(
      `INSERT INTO payment_accounts (user_id, name, initial_balance, credit_limit, closing_day, due_day)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, name, currentBalance, creditLimit, closingDay, dueDay],
    );
    await setAccountMethods(client, userId, inserted.rows[0].id, req.body.payment_method_ids ?? []);
    return inserted.rows[0];
  });

  notifyFinanceChanged(userId);
  res.status(201).json({ status: "OK", message: "Conta criada", account });
});

export const updateAccount = handle("Update account", async (req, res) => {
  const userId = req.user.id;
  const accountId = parseId(req.params.id, "Conta");
  const has = (key) => Object.prototype.hasOwnProperty.call(req.body, key);

  const account = await withTransaction(async (client) => {
    const current = await getOwnAccount(userId, accountId, client);
    const name = has("name") ? parseText(req.body.name, "Nome da conta", { required: true }) : current.name;

    if (name.toLowerCase() !== current.name.toLowerCase()) {
      const duplicate = await client.query(
        "SELECT 1 FROM payment_accounts WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id <> $3 AND deleted_at IS NULL",
        [userId, name, accountId],
      );
      if (duplicate.rows.length) fail(409, "Ja existe uma conta com esse nome");
    }

    const updated = await client.query(
      `UPDATE payment_accounts
       SET name = $1, credit_limit = $2, closing_day = $3, due_day = $4
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [
        name,
        has("credit_limit")
          ? parseMoney(req.body.credit_limit, "Limite", { optional: true, allowZero: true })
          : current.credit_limit,
        has("closing_day") ? parseDay(req.body.closing_day, "Dia de fechamento") : current.closing_day,
        has("due_day") ? parseDay(req.body.due_day, "Dia de vencimento") : current.due_day,
        accountId,
        userId,
      ],
    );
    if (has("payment_method_ids")) {
      await setAccountMethods(client, userId, accountId, req.body.payment_method_ids);
    }
    return updated.rows[0];
  });

  notifyFinanceChanged(userId);
  res.json({ status: "OK", message: "Conta atualizada", account });
});

/** "Meu saldo real e X": ajusta o saldo inicial para o saldo atual bater. */
export const adjustBalance = handle("Adjust balance", async (req, res) => {
  const userId = req.user.id;
  const target = parseMoney(req.body.balance, "Saldo", { allowNegative: true });
  const isUnassigned = req.params.id === "unassigned";
  const accountId = isUnassigned ? null : parseId(req.params.id, "Conta");

  if (accountId) await getOwnAccount(userId, accountId);
  const movement = await getCurrentCash(userId, accountId);
  const initial = Math.round((target - movement) * 100) / 100;

  if (isUnassigned) {
    await pool.query("UPDATE users SET opening_balance = $1 WHERE id = $2", [initial, userId]);
  } else {
    await pool.query(
      "UPDATE payment_accounts SET initial_balance = $1 WHERE id = $2 AND user_id = $3",
      [initial, accountId, userId],
    );
  }

  notifyFinanceChanged(userId);
  res.json({ status: "OK", message: "Saldo ajustado", balance: target });
});

// ---------- transferencias e pagamento de fatura ----------

export const listTransfers = handle("List transfers", async (req, res) => {
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 100);
  const result = await pool.query(
    `SELECT t.id, t.kind, t.amount, t.date::text AS date, t.description,
            t.from_account_id, fa.name AS from_account_name,
            t.to_account_id, ta.name AS to_account_name
     FROM account_transfers t
     LEFT JOIN payment_accounts fa ON fa.id = t.from_account_id
     LEFT JOIN payment_accounts ta ON ta.id = t.to_account_id
     WHERE t.user_id = $1
     ORDER BY t.date DESC, t.id DESC
     LIMIT $2`,
    [req.user.id, limit],
  );
  res.json({
    status: "OK",
    transfers: result.rows.map((row) => ({ ...row, amount: Number(row.amount) })),
  });
});

export const createTransfer = handle("Create transfer", async (req, res) => {
  const userId = req.user.id;
  const kind = req.body.kind || "transfer";
  if (!TRANSFER_KINDS.includes(kind)) fail(400, "Tipo de movimentacao invalido");

  const amount = parseMoney(req.body.amount, "Valor");
  const date = parseDate(req.body.date);
  const fromId = optionalId(req.body.from_account_id, "Conta de origem");
  const toId = optionalId(req.body.to_account_id, "Conta de destino");
  const description = parseText(req.body.description, "Descricao", { max: 255 });

  if (kind === "card_payment") {
    if (!toId) fail(400, "Informe o cartao que esta sendo pago");
  } else if (!fromId && !toId) {
    fail(400, "Informe a conta de origem ou de destino");
  } else if (fromId === toId) {
    fail(400, "Origem e destino precisam ser diferentes");
  }

  if (fromId) await getOwnAccount(userId, fromId);
  if (toId) await getOwnAccount(userId, toId);

  const result = await pool.query(
    `INSERT INTO account_transfers (user_id, kind, from_account_id, to_account_id, amount, date, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [userId, kind, fromId, toId, amount, date, description],
  );

  notifyFinanceChanged(userId);
  res.status(201).json({ status: "OK", message: "Movimentacao registrada", id: result.rows[0].id });
});

export const deleteTransfer = handle("Delete transfer", async (req, res) => {
  const result = await pool.query(
    "DELETE FROM account_transfers WHERE id = $1 AND user_id = $2 RETURNING id",
    [parseId(req.params.id), req.user.id],
  );
  if (!result.rows.length) fail(404, "Movimentacao nao encontrada");
  notifyFinanceChanged(req.user.id);
  res.json({ status: "OK", message: "Movimentacao removida" });
});

// ---------- dividas ----------

function readDebtBody(body, current = null) {
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);
  const pick = (key, parse) => (has(key) ? parse(body[key]) : current ? current[key] : parse(undefined));

  const kind = pick("kind", (v) => v ?? "loan");
  if (!DEBT_KINDS.includes(kind)) fail(400, "Tipo de divida invalido");

  const installmentsTotal = pick("installments_total", (v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = Number.parseInt(v, 10);
    if (!Number.isInteger(n) || n < 1 || n > 600) fail(400, "Numero de parcelas invalido");
    return n;
  });
  const paidBefore = pick("installments_paid_before", (v) => {
    const n = v === undefined || v === null || v === "" ? 0 : Number.parseInt(v, 10);
    if (!Number.isInteger(n) || n < 0 || n > 600) fail(400, "Parcelas ja pagas invalido");
    return n;
  });
  if (installmentsTotal !== null && paidBefore >= installmentsTotal) {
    fail(400, "Parcelas ja pagas deve ser menor que o total de parcelas");
  }

  return {
    name: pick("name", (v) => parseText(v, "Nome", { required: true })),
    kind,
    creditor: pick("creditor", (v) => parseText(v, "Credor")),
    amount_due: pick("amount_due", (v) => parseMoney(v, "Valor que falta pagar")),
    installment_amount: pick("installment_amount", (v) => parseMoney(v, "Valor da parcela", { optional: true })),
    installments_total: installmentsTotal,
    installments_paid_before: paidBefore,
    due_day: pick("due_day", (v) => parseDay(v, "Dia de vencimento")),
    notes: pick("notes", (v) => parseText(v, "Observacao", { max: 255 })),
  };
}

const DEBT_COLUMNS = [
  "name", "kind", "creditor", "amount_due", "installment_amount",
  "installments_total", "installments_paid_before", "due_day", "notes",
];

export const listDebts = handle("List debts", async (req, res) => {
  res.json({ status: "OK", debts: await getDebtsWithProgress(req.user.id, getLocalToday()) });
});

export const createDebt = handle("Create debt", async (req, res) => {
  const debt = readDebtBody(req.body);
  const values = DEBT_COLUMNS.map((column) => debt[column]);
  const result = await pool.query(
    `INSERT INTO debts (user_id, ${DEBT_COLUMNS.join(", ")})
     VALUES ($1, ${DEBT_COLUMNS.map((_, i) => `$${i + 2}`).join(", ")}) RETURNING id`,
    [req.user.id, ...values],
  );
  notifyFinanceChanged(req.user.id);
  res.status(201).json({ status: "OK", message: "Divida cadastrada", id: result.rows[0].id });
});

export const updateDebt = handle("Update debt", async (req, res) => {
  const debtId = parseId(req.params.id, "Divida");
  const current = await pool.query("SELECT * FROM debts WHERE id = $1 AND user_id = $2", [debtId, req.user.id]);
  if (!current.rows[0]) fail(404, "Divida nao encontrada");

  const row = current.rows[0];
  const normalized = { ...row, amount_due: Number(row.amount_due), installment_amount: row.installment_amount === null ? null : Number(row.installment_amount) };
  const debt = readDebtBody(req.body, normalized);
  const closedAt = Object.prototype.hasOwnProperty.call(req.body, "closed")
    ? (req.body.closed ? new Date() : null)
    : row.closed_at;

  await pool.query(
    `UPDATE debts SET ${DEBT_COLUMNS.map((c, i) => `${c} = $${i + 1}`).join(", ")}, closed_at = $${DEBT_COLUMNS.length + 1}
     WHERE id = $${DEBT_COLUMNS.length + 2} AND user_id = $${DEBT_COLUMNS.length + 3}`,
    [...DEBT_COLUMNS.map((c) => debt[c]), closedAt, debtId, req.user.id],
  );
  notifyFinanceChanged(req.user.id);
  res.json({ status: "OK", message: "Divida atualizada" });
});

export const deleteDebt = handle("Delete debt", async (req, res) => {
  // parcelas ja pagas continuam como gastos (debt_id vira NULL)
  const result = await pool.query("DELETE FROM debts WHERE id = $1 AND user_id = $2 RETURNING id", [
    parseId(req.params.id, "Divida"),
    req.user.id,
  ]);
  if (!result.rows.length) fail(404, "Divida nao encontrada");
  notifyFinanceChanged(req.user.id);
  res.json({ status: "OK", message: "Divida removida" });
});

/** Paga uma parcela: vira um gasto normal ligado a divida. */
export const payDebt = handle("Pay debt", async (req, res) => {
  const userId = req.user.id;
  const debtId = parseId(req.params.id, "Divida");
  const debts = await getDebtsWithProgress(userId, getLocalToday());
  const debt = debts.find((item) => item.id === debtId);
  if (!debt) fail(404, "Divida nao encontrada");
  if (debt.settled) fail(400, "Essa divida ja esta quitada");

  const amount = parseMoney(req.body.amount ?? debt.installment_amount, "Valor");
  const date = parseDate(req.body.date);
  const paymentMethodId = optionalId(req.body.payment_method_id, "Forma de pagamento");
  const paymentAccountId = optionalId(req.body.payment_account_id, "Conta");
  const categoryId = optionalId(req.body.category_id, "Categoria");

  const payment = await validatePaymentSelection({ userId, paymentMethodId, paymentAccountId });
  if (!payment.ok) fail(payment.status, payment.message);

  if (categoryId) {
    const category = await pool.query(
      "SELECT 1 FROM categories WHERE id = $1 AND (user_id IS NULL OR user_id = $2)",
      [categoryId, userId],
    );
    if (!category.rows.length) fail(404, "Categoria nao encontrada");
  }

  const installmentLabel = debt.installments_total
    ? ` (parcela ${Math.min(debt.installments_paid + 1, debt.installments_total)}/${debt.installments_total})`
    : "";
  const description = `${debt.name}${installmentLabel}`.slice(0, 255);

  const inserted = await pool.query(
    `INSERT INTO entries (user_id, category_id, payment_method_id, payment_account_id, type, amount, description, date, debt_id)
     VALUES ($1, $2, $3, $4, 'expense', $5, $6, $7, $8)
     RETURNING id, user_id, category_id, payment_method_id, payment_account_id, type, amount, description, date::text AS date, created_at, debt_id`,
    [userId, categoryId, paymentMethodId, payment.normalizedPaymentAccountId, amount, description, date, debtId],
  );

  const entry = { ...inserted.rows[0], amount: Number(inserted.rows[0].amount) };
  await bumpEntryCacheVersions(userId, date);
  emitTransactionCreated(userId, entry);
  notifyFinanceChanged(userId);

  res.status(201).json({ status: "OK", message: "Pagamento registrado", entry });
});
