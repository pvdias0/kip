import pool from "../config/database.js";
import {
  emitTransactionCreated,
  emitTransactionUpdated,
  emitTransactionDeleted,
  emitStatsUpdated,
} from "../utils/socket.js";

// Create entry
export const createEntry = async (req, res) => {
  try {
    const { type, amount, description, category_id, date } = req.body;
    const userId = req.user.id;

    // Validate inputs
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

    const result = await pool.query(
      "INSERT INTO entries (user_id, category_id, type, amount, description, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [userId, category_id || null, type, amount, description, date],
    );

    const entry = result.rows[0];

    // Converter amount para número
    entry.amount = parseFloat(entry.amount);

    // Emit real-time update via WebSocket
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

// Get entries (with optional filters)
export const getEntries = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, startDate, endDate } = req.query;

    let query = "SELECT * FROM entries WHERE user_id = $1";
    const params = [userId];

    if (type && ["income", "expense"].includes(type)) {
      query += " AND type = $" + (params.length + 1);
      params.push(type);
    }

    if (startDate) {
      query += " AND date >= $" + (params.length + 1);
      params.push(startDate);
    }

    if (endDate) {
      query += " AND date <= $" + (params.length + 1);
      params.push(endDate);
    }

    query += " ORDER BY date DESC, created_at DESC";

    const result = await pool.query(query, params);

    // Converter amounts para número
    const entries = result.rows.map((entry) => ({
      ...entry,
      amount: parseFloat(entry.amount),
    }));

    res.json({
      status: "OK",
      entries,
    });
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
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      "SELECT * FROM entries WHERE id = $1 AND user_id = $2",
      [id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Entrada não encontrada",
      });
    }

    const entry = result.rows[0];
    entry.amount = parseFloat(entry.amount);

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
    const { type, amount, description, category_id, date } = req.body;
    const userId = req.user.id;

    // Validate inputs
    if (amount && amount <= 0) {
      return res.status(400).json({
        status: "ERROR",
        message: "Valor deve ser maior que zero",
      });
    }

    if (type && !["income", "expense"].includes(type)) {
      return res.status(400).json({
        status: "ERROR",
        message: 'Tipo inválido. Deve ser "income" ou "expense"',
      });
    }

    const result = await pool.query(
      "UPDATE entries SET type = COALESCE($1, type), amount = COALESCE($2, amount), description = COALESCE($3, description), category_id = COALESCE($4, category_id), date = COALESCE($5, date) WHERE id = $6 AND user_id = $7 RETURNING *",
      [type, amount, description, category_id, date, id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Entrada não encontrada",
      });
    }

    const entry = result.rows[0];

    // Converter amount para número
    entry.amount = parseFloat(entry.amount);

    // Emit real-time update via WebSocket
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
      "DELETE FROM entries WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Entrada não encontrada",
      });
    }

    const entryId = result.rows[0].id;

    // Emit real-time update via WebSocket
    emitTransactionDeleted(userId, entryId);

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

    let query =
      "SELECT type, SUM(amount) as total FROM entries WHERE user_id = $1";
    const params = [userId];

    if (startDate) {
      query += " AND date >= $" + (params.length + 1);
      params.push(startDate);
    }

    if (endDate) {
      query += " AND date <= $" + (params.length + 1);
      params.push(endDate);
    }

    query += " GROUP BY type";

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

    res.json({
      status: "OK",
      stats: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao buscar estatísticas",
    });
  }
};
