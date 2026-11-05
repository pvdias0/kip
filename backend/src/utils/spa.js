import express from "express";
import { readFileSync } from "fs";
import path from "path";

const SITE_URL = "https://kip.pvapps.com.br";

// Metadados por rota publica (indexavel). O index.html gerado pelo Vite traz os
// valores da home; para estas rotas o servidor troca title/description/canonical
// antes de enviar, para o Google ler o valor certo sem depender do JavaScript.
const PUBLIC_ROUTES = {
  "/": null, // usa o que ja esta no index.html
  "/register": {
    title: "Criar conta grátis - KIP Organizador Financeiro",
    description:
      "Crie sua conta grátis no KIP e comece a organizar receitas, despesas e categorias financeiras em poucos segundos.",
  },
  "/login": {
    title: "Entrar - KIP Organizador Financeiro",
    description:
      "Acesse sua conta KIP para acompanhar suas receitas, despesas e relatórios financeiros.",
  },
  "/privacy-policy": {
    title: "Política de Privacidade - KIP",
    description:
      "Saiba como o KIP coleta, usa e protege seus dados pessoais e financeiros.",
  },
  "/terms-of-service": {
    title: "Termos de Serviço - KIP",
    description: "Termos e condições de uso do KIP, organizador financeiro pessoal.",
  },
};

// Rotas do app que existem mas nao devem aparecer no Google (area logada,
// fluxos de token). Recebem 200 + X-Robots-Tag: noindex.
// IMPORTANTE: ao criar uma rota nova em frontend/src/App.tsx, adicione-a aqui
// ou em PUBLIC_ROUTES; caso contrario o servidor respondera 404 para ela.
const PRIVATE_ROUTES = new Set([
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/legal/consent",
  "/profile",
  "/whatsapp",
  "/extrato",
  "/carteira",
  "/relatorios",
  "/mais",
  "/categories",
  "/payment-methods",
  "/dashboard",
  "/payment-accounts",
]);

const ONE_YEAR = 60 * 60 * 24 * 365;
const THIRTY_DAYS = 60 * 60 * 24 * 30;

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function renderForRoute(baseHtml, routePath) {
  const meta = PUBLIC_ROUTES[routePath];
  const canonical = `${SITE_URL}${routePath}`;
  let html = baseHtml.replace(
    /<link rel="canonical" href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${canonical}" />`,
  );

  if (meta) {
    const title = escapeHtml(meta.title);
    const description = escapeHtml(meta.description);
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
      .replace(
        /<meta name="description" content="[^"]*"\s*\/>/,
        `<meta name="description" content="${description}" />`,
      )
      .replace(
        /<meta property="og:url" content="[^"]*"\s*\/>/,
        `<meta property="og:url" content="${canonical}" />`,
      );
  }

  return html;
}

const normalizePath = (requestPath) =>
  requestPath.length > 1 ? requestPath.replace(/\/+$/, "") : requestPath;

/**
 * Serve o build do frontend (SPA) com cache adequado, metadados por rota e
 * status 404 real para URLs desconhecidas (evita "soft 404" no Google).
 */
export function serveSpa(app, frontendPath) {
  const entryPoint = path.join(frontendPath, "index.html");
  const baseHtml = readFileSync(entryPoint, "utf8");

  const pages = new Map(
    Object.keys(PUBLIC_ROUTES).map((route) => [route, renderForRoute(baseHtml, route)]),
  );
  const noindexHtml = baseHtml.replace(
    /<link rel="canonical" href="[^"]*"\s*\/>/,
    '<meta name="robots" content="noindex" />',
  );

  // Arquivos com hash no nome (gerados pelo Vite) nunca mudam: cache de 1 ano.
  app.use(
    "/assets",
    express.static(path.join(frontendPath, "assets"), {
      immutable: true,
      maxAge: ONE_YEAR * 1000,
    }),
  );

  // Demais arquivos estaticos (imagens do hero, favicon, robots, sitemap).
  app.use(
    express.static(frontendPath, {
      index: false,
      setHeaders(res, filePath) {
        const ext = path.extname(filePath).toLowerCase();
        if ([".webp", ".jpg", ".jpeg", ".png", ".svg", ".ico", ".woff2"].includes(ext)) {
          res.setHeader("Cache-Control", `public, max-age=${THIRTY_DAYS}`);
        } else {
          res.setHeader("Cache-Control", "public, max-age=3600");
        }
      },
    }),
  );

  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }

    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ status: "ERROR", message: "Not found" });
    }

    const routePath = normalizePath(req.path);
    res.setHeader("Cache-Control", "no-cache");
    res.type("html");

    if (pages.has(routePath)) {
      return res.send(pages.get(routePath));
    }

    res.setHeader("X-Robots-Tag", "noindex");

    if (PRIVATE_ROUTES.has(routePath)) {
      return res.send(noindexHtml);
    }

    // URL inexistente: o React renderiza a pagina NotFound, mas com status 404.
    return res.status(404).send(noindexHtml);
  });
}
