import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Carregar .env absolutamente PRIMEIRO
dotenv.config({ 
  path: path.join(__dirname, ".env"),
  override: false,
});

console.log("✅ Bootstrap: Environment loaded");
console.log("   PORT:", process.env.PORT);
console.log("   DB_HOST:", process.env.DB_HOST);
console.log("   DB_NAME:", process.env.DB_NAME);

// ✅ Agora importar o app
import("./src/index.js").catch(err => {
  console.error("❌ Error starting app:", err);
  process.exit(1);
});
