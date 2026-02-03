import pool from "../config/database.js";

// Get all categories (padrão + do usuário)
export const getCategories = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get default categories + user categories
    const result = await pool.query(
      "SELECT * FROM categories WHERE user_id IS NULL OR user_id = $1 ORDER BY name",
      [userId],
    );

    res.json({
      status: "OK",
      categories: result.rows,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao buscar categorias",
    });
  }
};

// Create category
export const createCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    // Validate input
    if (!name || name.trim() === "") {
      return res.status(400).json({
        status: "ERROR",
        message: "Nome da categoria é obrigatório",
      });
    }

    // Check if category already exists for this user
    const existing = await pool.query(
      "SELECT id FROM categories WHERE user_id = $1 AND LOWER(name) = LOWER($2)",
      [userId, name],
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        status: "ERROR",
        message: "Categoria já existe",
      });
    }

    // Create category
    const result = await pool.query(
      "INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING *",
      [userId, name.trim()],
    );

    res.status(201).json({
      status: "OK",
      message: "Categoria criada com sucesso",
      category: result.rows[0],
    });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao criar categoria",
    });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Validate ID is a number
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId) || categoryId <= 0) {
      return res.status(400).json({
        status: "ERROR",
        message: "ID de categoria inválido",
      });
    }

    // Check if category exists AND belongs to this user (not global categories)
    // Security fix: users can only delete their own categories
    const category = await pool.query(
      "SELECT * FROM categories WHERE id = $1 AND user_id = $2",
      [categoryId, userId],
    );

    if (category.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Categoria não encontrada",
      });
    }

    // Check if category is used in any entries (only for this user's entries)
    const usedInEntries = await pool.query(
      "SELECT COUNT(*) FROM entries WHERE category_id = $1 AND user_id = $2",
      [categoryId, userId],
    );

    if (usedInEntries.rows[0].count > 0) {
      return res.status(400).json({
        status: "ERROR",
        message: "Não é possível deletar uma categoria que está sendo usada",
      });
    }

    // Delete category (with user_id check for extra security)
    await pool.query("DELETE FROM categories WHERE id = $1 AND user_id = $2", [categoryId, userId]);

    res.json({
      status: "OK",
      message: "Categoria deletada com sucesso",
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao deletar categoria",
    });
  }
};

// Get categories by type
export const getCategoriesByType = async (req, res) => {
  try {
    const { type } = req.params;

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({
        status: "ERROR",
        message: 'Tipo inválido. Deve ser "income" ou "expense"',
      });
    }

    const result = await pool.query("SELECT * FROM categories ORDER BY name");

    res.json({
      status: "OK",
      categories: result.rows,
    });
  } catch (error) {
    console.error("Get categories by type error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao buscar categorias",
    });
  }
};
