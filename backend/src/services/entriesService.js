import pool from "../config/database.js";
import { validatePaymentSelection } from "../utils/paymentMethods.js";

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeEntryDateValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value.includes("T") ? value.slice(0, 10) : value;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return null;
}

export function sanitizeEntryDate(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return null;
  }

  const parsedDate = new Date(`${trimmedValue}T00:00:00`);

  return Number.isNaN(parsedDate.getTime()) ? null : trimmedValue;
}

function normalizeEntry(entry) {
  const normalizedDate = normalizeEntryDateValue(entry.date);

  return {
    ...entry,
    amount: parseFloat(entry.amount),
    date: normalizedDate ?? entry.date,
  };
}

export async function getCategoryForUser(userId, categoryId, client = pool) {
  const result = await client.query(
    `
      SELECT id, user_id, name
      FROM categories
      WHERE id = $1
        AND (user_id IS NULL OR user_id = $2)
    `,
    [categoryId, userId],
  );

  return result.rows[0] || null;
}

export async function getCategoriesForUser(userId, client = pool) {
  const result = await client.query(
    `
      SELECT id, user_id, name
      FROM categories
      WHERE user_id IS NULL OR user_id = $1
      ORDER BY LOWER(name)
    `,
    [userId],
  );

  return result.rows;
}

export async function getEntryWithRelations(userId, entryId, client = pool) {
  const result = await client.query(
    `
      SELECT
        e.*,
        pm.name AS payment_method_name,
        pa.name AS payment_account_name
      FROM entries e
      LEFT JOIN payment_methods pm
        ON pm.id = e.payment_method_id
        AND pm.user_id = e.user_id
        AND pm.deleted_at IS NULL
      LEFT JOIN payment_accounts pa
        ON pa.id = e.payment_account_id
        AND pa.user_id = e.user_id
        AND pa.deleted_at IS NULL
      WHERE e.id = $1 AND e.user_id = $2
    `,
    [entryId, userId],
  );

  return result.rows.length > 0 ? normalizeEntry(result.rows[0]) : null;
}

export async function createEntryForUser(
  userId,
  {
    type,
    amount,
    description,
    category_id,
    payment_method_id,
    payment_account_id,
    date,
  },
  client = pool,
) {
  if (!type || !amount || !description || !date) {
    throw new Error("type, amount, description e date sao obrigatorios");
  }

  if (!["income", "expense"].includes(type)) {
    throw new Error('Tipo invalido. Deve ser "income" ou "expense"');
  }

  if (amount <= 0) {
    throw new Error("Valor deve ser maior que zero");
  }

  const normalizedDate = sanitizeEntryDate(date);

  if (!normalizedDate) {
    throw new Error("Data invalida. Use o formato YYYY-MM-DD");
  }

  const normalizedCategoryId = category_id ? parsePositiveInt(category_id) : null;
  const normalizedPaymentMethodId = parsePositiveInt(payment_method_id);
  const normalizedPaymentAccountId = payment_account_id
    ? parsePositiveInt(payment_account_id)
    : null;

  if (category_id && !normalizedCategoryId) {
    throw new Error("Categoria invalida");
  }

  if (normalizedCategoryId) {
    const category = await getCategoryForUser(userId, normalizedCategoryId, client);

    if (!category) {
      throw new Error("Categoria nao encontrada");
    }
  }

  const paymentValidation = await validatePaymentSelection({
    userId,
    paymentMethodId: normalizedPaymentMethodId,
    paymentAccountId: normalizedPaymentAccountId,
    client,
  });

  if (!paymentValidation.ok) {
    throw new Error(paymentValidation.message);
  }

  const result = await client.query(
    `
      INSERT INTO entries (
        user_id,
        category_id,
        payment_method_id,
        payment_account_id,
        type,
        amount,
        description,
        date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `,
    [
      userId,
      normalizedCategoryId,
      normalizedPaymentMethodId,
      paymentValidation.normalizedPaymentAccountId,
      type,
      amount,
      description,
      normalizedDate,
    ],
  );

  return getEntryWithRelations(userId, result.rows[0].id, client);
}

function buildEntriesDateCondition(params, startDate, endDate) {
  let query = "";

  if (startDate) {
    query += ` AND e.date >= $${params.length + 1}::date`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND e.date <= $${params.length + 1}::date`;
    params.push(endDate);
  }

  return query;
}

export async function listEntriesForUser(
  userId,
  { type, startDate, endDate, limit = 10 },
  client = pool,
) {
  const params = [userId];
  let query = `
    SELECT
      e.*,
      pm.name AS payment_method_name,
      pa.name AS payment_account_name,
      c.name AS category_name
    FROM entries e
    LEFT JOIN payment_methods pm
      ON pm.id = e.payment_method_id
      AND pm.user_id = e.user_id
      AND pm.deleted_at IS NULL
    LEFT JOIN payment_accounts pa
      ON pa.id = e.payment_account_id
      AND pa.user_id = e.user_id
      AND pa.deleted_at IS NULL
    LEFT JOIN categories c
      ON c.id = e.category_id
    WHERE e.user_id = $1
  `;

  if (type && ["income", "expense"].includes(type)) {
    query += ` AND e.type = $${params.length + 1}::entry_type`;
    params.push(type);
  }

  query += buildEntriesDateCondition(params, startDate, endDate);
  query += ` ORDER BY e.date DESC, e.created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await client.query(query, params);
  return result.rows.map(normalizeEntry);
}

export async function summarizeEntriesForUser(
  userId,
  { type, startDate, endDate },
  client = pool,
) {
  const params = [userId];
  let query = `
    SELECT
      e.type,
      COUNT(*) AS count,
      COALESCE(SUM(e.amount), 0) AS total
    FROM entries e
    WHERE e.user_id = $1
  `;

  if (type && ["income", "expense"].includes(type)) {
    query += ` AND e.type = $${params.length + 1}::entry_type`;
    params.push(type);
  }

  query += buildEntriesDateCondition(params, startDate, endDate);
  query += " GROUP BY e.type";

  const result = await client.query(query, params);
  let totalIncome = 0;
  let totalExpense = 0;
  let countIncome = 0;
  let countExpense = 0;

  for (const row of result.rows) {
    if (row.type === "income") {
      totalIncome = parseFloat(row.total);
      countIncome = Number(row.count) || 0;
    } else if (row.type === "expense") {
      totalExpense = parseFloat(row.total);
      countExpense = Number(row.count) || 0;
    }
  }

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    countIncome,
    countExpense,
    totalCount: countIncome + countExpense,
  };
}
