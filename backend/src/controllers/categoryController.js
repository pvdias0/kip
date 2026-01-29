import pool from '../config/database.js';

// Get all categories
export const getCategories = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    
    res.json({
      status: 'OK',
      categories: result.rows,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Erro ao buscar categorias',
    });
  }
};

// Get categories by type
export const getCategoriesByType = async (req, res) => {
  try {
    const { type } = req.params;

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Tipo inválido. Deve ser "income" ou "expense"',
      });
    }

    const result = await pool.query(
      'SELECT * FROM categories WHERE type = $1 ORDER BY name',
      [type]
    );

    res.json({
      status: 'OK',
      categories: result.rows,
    });
  } catch (error) {
    console.error('Get categories by type error:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Erro ao buscar categorias',
    });
  }
};
