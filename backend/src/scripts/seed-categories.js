import pool from "../config/database.js";

const DEFAULT_CATEGORIES = [
  "Salário",
  "Aluguel",
  "Alimentação",
  "Transporte",
  "Outros",
];

export async function seedDefaultCategories() {
  try {
    console.log("🌱 Iniciando seed de categorias padrão...");

    // Check if default categories already exist
    const result = await pool.query(
      "SELECT COUNT(*) FROM categories WHERE user_id IS NULL",
    );

    if (result.rows[0].count > 0) {
      console.log("✅ Categorias padrão já existem");
      return;
    }

    // Insert default categories
    for (const name of DEFAULT_CATEGORIES) {
      await pool.query(
        "INSERT INTO categories (name, user_id) VALUES ($1, NULL)",
        [name],
      );
    }

    console.log("✅ Categorias padrão criadas com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao fazer seed de categorias:", error);
  }
}
