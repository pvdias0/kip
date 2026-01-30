import pool from "../config/database.js";

export async function migrateCategories() {
  try {
    console.log("📝 Verificando estrutura da tabela categories...");

    // Check if user_id column is nullable
    const result = await pool.query(`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'categories' AND column_name = 'user_id'
    `);

    if (result.rows.length === 0) {
      console.log("⚠️ Tabela categories não encontrada");
      return false;
    }

    const isNullable = result.rows[0].is_nullable === "YES";

    if (!isNullable) {
      console.log("🔧 Alterando coluna user_id para aceitar NULL...");
      await pool.query(
        "ALTER TABLE categories ALTER COLUMN user_id DROP NOT NULL",
      );
      console.log("✅ Coluna user_id agora aceita NULL");
    } else {
      console.log("✅ Coluna user_id já aceita NULL");
    }

    return true;
  } catch (error) {
    console.error("❌ Erro ao migrar categorias:", error.message);
    return false;
  }
}
