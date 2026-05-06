import "./env.js";
import pkg from "pg";

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
});

console.log("🧩 Database config loaded:", {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
});


// Test connection
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

export const testConnection = async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("✅ Conexão com banco de dados estabelecida com sucesso!");
    console.log("Data/Hora do servidor:", res.rows[0].now);
    return true;
  } catch (err) {
    console.error("❌ Erro ao conectar com o banco de dados:", err.message);
    return false;
  }
};

export default pool;
