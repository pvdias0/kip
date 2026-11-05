// Entry usado so no build (vite build --ssr) para gerar o HTML estatico da
// landing. Ver scripts/prerender.mjs.
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import Landing from "./pages/Landing";

export function renderLanding(): string {
  return renderToString(
    <StaticRouter location="/">
      <Landing />
    </StaticRouter>,
  );
}
