import pool from "../config/database.js";
import {
  emitTransactionCreated,
  emitTransactionUpdated,
  emitTransactionDeleted,
} from "../utils/socket.js";
import { validatePaymentSelection } from "../utils/paymentMethods.js";
import {
  buildEntriesCacheDescriptor,
  buildStatsCacheDescriptor,
  bumpEntryCacheVersions,
  readJsonCache,
  writeJsonCache,
} from "../utils/cache.js";

const CACHE_HEADER_NAME = "X-Kip-Cache";

function setCacheStatus(res, status) {
  res.set(CACHE_HEADER_NAME, status);
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parsePaginationValue(value, fallback, maxValue = 100) {
  const parsedValue = parsePositiveInt(value);

  if (!parsedValue) {
    return fallback;
  }

  return Math.min(parsedValue, maxValue);
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
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

function sanitizeEntryDate(value) {
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

async function getEntryWithRelations(userId, entryId, client = pool) {
  const result = await client.query(
    `
      SELECT
        e.*,
        pm.name AS payment_method_name,
        pa.name AS payment_account_name
      FROM entries e
      LEFT JOIN payment_methods pm ON pm.id = e.payment_method_id
      LEFT JOIN payment_accounts pa ON pa.id = e.payment_account_id
      WHERE e.id = $1 AND e.user_id = $2
    `,
    [entryId, userId],
  );

  return result.rows.length > 0 ? normalizeEntry(result.rows[0]) : null;
}

function buildEntriesQuery(baseQuery, params, type, startDate, endDate) {
  let query = baseQuery;

  if (type && ["income", "expense"].includes(type)) {
    query += " AND e.type = $" + (params.length + 1) + "::entry_type";
    params.push(type);
  }

  if (startDate) {
    query += " AND e.date >= $" + (params.length + 1) + "::date";
    params.push(startDate);
  }

  if (endDate) {
    query += " AND e.date <= $" + (params.length + 1) + "::date";
    params.push(endDate);
  }

  return query;
}

// Create entry
export const createEntry = async (req, res) => {
  try {
    const {
      type,
      amount,
      description,
      category_id,
      payment_method_id,
      payment_account_id,
      date,
    } = req.body;
    const userId = req.user.id;

    if (!type || !amount || !description || !date) {
      return res.status(400).json({
        status: "ERROR",
        message: "type, amount, description e date são obrigatórios",
      });
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({
        status: "ERROR",
        message: 'Tipo inválido. Deve ser "income" ou "expense"',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        status: "ERROR",
        message: "Valor deve ser maior que zero",
      });
    }

    const normalizedDate = sanitizeEntryDate(date);

    if (!normalizedDate) {
      return res.status(400).json({
        status: "ERROR",
        message: "Data invalida. Use o formato YYYY-MM-DD",
      });
    }

    const normalizedCategoryId = category_id ? parsePositiveInt(category_id) : null;
    const normalizedPaymentMethodId = parsePositiveInt(payment_method_id);
    const normalizedPaymentAccountId = payment_account_id
      ? parsePositiveInt(payment_account_id)
      : null;

    const paymentValidation = await validatePaymentSelection({
      userId,
      paymentMethodId: normalizedPaymentMethodId,
      paymentAccountId: normalizedPaymentAccountId,
      client: pool,
    });

    if (!paymentValidation.ok) {
      return res.status(paymentValidation.status).json({
        status: "ERROR",
        message: paymentValidation.message,
      });
    }

    const result = await pool.query(
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

    const entry = await getEntryWithRelations(userId, result.rows[0].id, pool);

    await bumpEntryCacheVersions(userId, normalizedDate);

    emitTransactionCreated(userId, entry);

    res.status(201).json({
      status: "OK",
      message: "Entrada criada com sucesso",
      entry,
    });
  } catch (error) {
    console.error("Create entry error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao criar entrada",
    });
  }
};

// Get entries
export const getEntries = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, startDate, endDate } = req.query;
    const page = parsePaginationValue(req.query.page, 1, Number.MAX_SAFE_INTEGER);
    const limit = parsePaginationValue(req.query.limit, 20);
    const offset = (page - 1) * limit;
    const cacheDescriptor = await buildEntriesCacheDescriptor({
      userId,
      type,
      startDate,
      endDate,
      page,
      limit,
    });

    if (cacheDescriptor) {
      const cachedPayload = await readJsonCache(cacheDescriptor.key);

      if (cachedPayload) {
        setCacheStatus(res, "HIT");
        return res.json(cachedPayload);
      }
    } else {
      setCacheStatus(res, "BYPASS");
    }

    const params = [userId];
    let query = `
      SELECT
        e.*,
        pm.name AS payment_method_name,
        pa.name AS payment_account_name
      FROM entries e
      LEFT JOIN payment_methods pm ON pm.id = e.payment_method_id
      LEFT JOIN payment_accounts pa ON pa.id = e.payment_account_id
      WHERE e.user_id = $1
    `;

    query = buildEntriesQuery(query, params, type, startDate, endDate);
    const countParams = [userId];
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM entries e
      WHERE e.user_id = $1
    `;

    countQuery = buildEntriesQuery(countQuery, countParams, type, startDate, endDate);
    query += ` ORDER BY e.date DESC, e.created_at DESC LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`;
    params.push(limit, offset);

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);
    const totalItems = Number.parseInt(countResult.rows[0]?.total ?? "0", 10);
    const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / limit);

    const payload = {
      status: "OK",
      entries: result.rows.map(normalizeEntry),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };

    if (cacheDescriptor) {
      await writeJsonCache(cacheDescriptor.key, payload, cacheDescriptor.ttl);
      setCacheStatus(res, "MISS");
    }

    res.json(payload);
  } catch (error) {
    console.error("Get entries error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao buscar entradas",
    });
  }
};

// Get entry by ID
export const getEntryById = async (req, res) => {
  try {
    const entry = await getEntryWithRelations(req.user.id, req.params.id, pool);

    if (!entry) {
      return res.status(404).json({
        status: "ERROR",
        message: "Entrada não encontrada",
      });
    }

    res.json({
      status: "OK",
      entry,
    });
  } catch (error) {
    console.error("Get entry error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao buscar entrada",
    });
  }
};

// Update entry
export const updateEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existingResult = await pool.query(
      "SELECT * FROM entries WHERE id = $1 AND user_id = $2",
      [id, userId],
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Entrada não encontrada",
      });
    }

    const existingEntry = existingResult.rows[0];
    const previousEntryDate = normalizeEntryDateValue(existingEntry.date);
    const payload = req.body;

    if (payload.amount && payload.amount <= 0) {
      return res.status(400).json({
        status: "ERROR",
        message: "Valor deve ser maior que zero",
      });
    }

    if (payload.type && !["income", "expense"].includes(payload.type)) {
      return res.status(400).json({
        status: "ERROR",
        message: 'Tipo inválido. Deve ser "income" ou "expense"',
      });
    }

    if (hasOwn(payload, "date")) {
      const normalizedPayloadDate = sanitizeEntryDate(payload.date);

      if (!normalizedPayloadDate) {
        return res.status(400).json({
          status: "ERROR",
          message: "Data invalida. Use o formato YYYY-MM-DD",
        });
      }

      payload.date = normalizedPayloadDate;
    }

    const nextCategoryId = hasOwn(payload, "category_id")
      ? payload.category_id
        ? parsePositiveInt(payload.category_id)
        : null
      : existingEntry.category_id;

    const nextPaymentMethodId = hasOwn(payload, "payment_method_id")
      ? payload.payment_method_id
        ? parsePositiveInt(payload.payment_method_id)
        : null
      : existingEntry.payment_method_id;

    const nextPaymentAccountId = hasOwn(payload, "payment_account_id")
      ? payload.payment_account_id
        ? parsePositiveInt(payload.payment_account_id)
        : null
      : existingEntry.payment_account_id;

    const shouldValidatePayment =
      hasOwn(payload, "payment_method_id") ||
      hasOwn(payload, "payment_account_id") ||
      existingEntry.payment_method_id !== null;

    let normalizedPaymentAccountId = nextPaymentAccountId;

    if (shouldValidatePayment) {
      const paymentValidation = await validatePaymentSelection({
        userId,
        paymentMethodId: nextPaymentMethodId,
        paymentAccountId: nextPaymentAccountId,
        client: pool,
      });

      if (!paymentValidation.ok) {
        return res.status(paymentValidation.status).json({
          status: "ERROR",
          message: paymentValidation.message,
        });
      }

      normalizedPaymentAccountId = paymentValidation.normalizedPaymentAccountId;
    }

    const result = await pool.query(
      `
        UPDATE entries
        SET
          type = $1,
          amount = $2,
          description = $3,
          category_id = $4,
          payment_method_id = $5,
          payment_account_id = $6,
          date = $7
        WHERE id = $8 AND user_id = $9
        RETURNING id
      `,
      [
        payload.type ?? existingEntry.type,
        payload.amount ?? existingEntry.amount,
        payload.description ?? existingEntry.description,
        nextCategoryId,
        nextPaymentMethodId,
        normalizedPaymentAccountId,
        payload.date ?? existingEntry.date,
        id,
        userId,
      ],
    );

    const entry = await getEntryWithRelations(userId, result.rows[0].id, pool);

    await bumpEntryCacheVersions(
      userId,
      previousEntryDate,
      normalizeEntryDateValue(payload.date ?? existingEntry.date),
    );

    emitTransactionUpdated(userId, entry);

    res.json({
      status: "OK",
      message: "Entrada atualizada com sucesso",
      entry,
    });
  } catch (error) {
    console.error("Update entry error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao atualizar entrada",
    });
  }
};

// Delete entry
export const deleteEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      "DELETE FROM entries WHERE id = $1 AND user_id = $2 RETURNING id, date",
      [id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Entrada não encontrada",
      });
    }

    await bumpEntryCacheVersions(userId, normalizeEntryDateValue(result.rows[0].date));

    emitTransactionDeleted(userId, result.rows[0].id);

    res.json({
      status: "OK",
      message: "Entrada deletada com sucesso",
    });
  } catch (error) {
    console.error("Delete entry error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao deletar entrada",
    });
  }
};

// Get statistics
export const getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    const cacheDescriptor = await buildStatsCacheDescriptor({
      userId,
      startDate,
      endDate,
    });

    if (cacheDescriptor) {
      const cachedPayload = await readJsonCache(cacheDescriptor.key);

      if (cachedPayload) {
        setCacheStatus(res, "HIT");
        return res.json(cachedPayload);
      }
    } else {
      setCacheStatus(res, "BYPASS");
    }

    const params = [userId];
    let query =
      "SELECT e.type, SUM(e.amount) as total FROM entries e WHERE e.user_id = $1";

    query = buildEntriesQuery(query, params, null, startDate, endDate);
    query += " GROUP BY e.type";

    const result = await pool.query(query, params);

    let totalIncome = 0;
    let totalExpense = 0;

    result.rows.forEach((row) => {
      if (row.type === "income") {
        totalIncome = parseFloat(row.total);
      } else if (row.type === "expense") {
        totalExpense = parseFloat(row.total);
      }
    });

    const payload = {
      status: "OK",
      stats: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
      },
    };

    if (cacheDescriptor) {
      await writeJsonCache(cacheDescriptor.key, payload, cacheDescriptor.ttl);
      setCacheStatus(res, "MISS");
    }

    res.json(payload);
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao buscar estatísticas",
    });
  }
};
