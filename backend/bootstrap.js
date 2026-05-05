import "./src/config/env.js";

console.log("✅ Bootstrap: Environment loaded");
console.log("   PORT:", process.env.PORT);
console.log("   DB_HOST:", process.env.DB_HOST);
console.log("   DB_NAME:", process.env.DB_NAME);

// ✅ Agora importar o app
import("./src/index.js").catch((err) => {
  console.error("❌ Error starting app:", err);
  process.exit(1);
});
