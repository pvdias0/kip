import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import pool from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../../../database/migration");
const advisoryLockKey = 384217501;

async function ensureSchemaMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getMigrationFiles() {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function readAppliedMigrations(client) {
  const result = await client.query(
    "SELECT name FROM public.schema_migrations ORDER BY name",
  );

  return new Set(result.rows.map((row) => row.name));
}

async function applyMigration(client, fileName) {
  const filePath = path.join(migrationsDir, fileName);
  const sql = await fs.readFile(filePath, "utf8");

  console.log(`➡️  Applying migration: ${fileName}`);

  await client.query("BEGIN");

  try {
    await client.query(sql);
    await client.query(
      "INSERT INTO public.schema_migrations (name) VALUES ($1)",
      [fileName],
    );
    await client.query("COMMIT");
    console.log(`✅ Migration applied: ${fileName}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log("🔐 Migration DB credentials:", {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || "kip",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
    });
    console.log("🗃️  Running database migrations...");
    await client.query("SELECT pg_advisory_lock($1)", [advisoryLockKey]);
    await ensureSchemaMigrationsTable(client);

    const files = await getMigrationFiles();
    const appliedMigrations = await readAppliedMigrations(client);
    const pendingMigrations = files.filter((file) => !appliedMigrations.has(file));

    if (pendingMigrations.length === 0) {
      console.log("✅ No pending migrations");
      return true;
    }

    for (const fileName of pendingMigrations) {
      await applyMigration(client, fileName);
    }

    console.log("✅ All pending migrations applied");
    return true;
  } catch (error) {
    console.error("❌ Migration runner failed:", error.message);
    return false;
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [advisoryLockKey]);
    } catch (unlockError) {
      console.error("⚠️  Failed to release migration lock:", unlockError.message);
    }

    client.release();
    await pool.end();
  }
}

const executedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (executedDirectly) {
  runMigrations()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Unexpected migration runner error:", error);
      process.exit(1);
    });
}
