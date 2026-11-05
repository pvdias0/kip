// Injeta o HTML estatico da landing no dist/index.html, entre os marcadores
// <!--shell:start--> e <!--shell:end-->. O navegador pinta o hero assim que o
// HTML chega (sem esperar o JS) e o Google le o conteudo da pagina sem
// precisar executar JavaScript. O backend (backend/src/utils/spa.js) remove o
// shell em todas as rotas que nao sao "/". O React substitui esse conteudo ao
// montar (createRoot), entao nao ha hidratacao.
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ssrDir = path.join(root, "dist-prerender");
const indexPath = path.join(root, "dist", "index.html");

const { renderLanding } = await import(
  pathToFileURL(path.join(ssrDir, "entry-prerender.js")).href
);

const appHtml = renderLanding();
const placeholder = "<!--app-shell-->";
const html = readFileSync(indexPath, "utf8");

if (!html.includes(placeholder)) {
  throw new Error(`Marcador ${placeholder} nao encontrado em dist/index.html`);
}

writeFileSync(
  indexPath,
  html.replace(
    placeholder,
    `<!--shell:start--><div data-app-shell>${appHtml}</div><!--shell:end-->`,
  ),
);
rmSync(ssrDir, { recursive: true, force: true });

console.log(`Landing pre-renderizada (${(appHtml.length / 1024).toFixed(1)} KB de HTML).`);
