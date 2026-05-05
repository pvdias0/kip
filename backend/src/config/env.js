import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "../..");
const projectRoot = path.resolve(backendRoot, "..");

let loaded = false;

export function loadEnvironment() {
  if (loaded) {
    return;
  }

  dotenv.config({
    path: path.join(projectRoot, ".env"),
    override: false,
  });

  dotenv.config({
    path: path.join(backendRoot, ".env"),
    override: false,
  });

  loaded = true;
}

loadEnvironment();
