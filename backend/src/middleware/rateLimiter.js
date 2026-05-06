import rateLimit, { ipKeyGenerator } from "express-rate-limit";

function skipWhatsAppWebhook(req) {
  return req.originalUrl?.startsWith("/api/whatsapp/webhook") === true;
}

// Rate limiter para rotas de autenticação (login/register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 tentativas por janela
  message: {
    status: "ERROR",
    message:
      "Muitas tentativas. Por favor, aguarde 15 minutos antes de tentar novamente.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: ipKeyGenerator, // ✅ Usa o helper correto para IPv4 e IPv6
});

// Rate limiter geral para API
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // 100 requests por minuto
  message: {
    status: "ERROR",
    message:
      "Limite de requisições excedido. Por favor, tente novamente em breve.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipWhatsAppWebhook,
});

// Rate limiter para reset de senha (mais restritivo)
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Máximo 3 tentativas por hora
  message: {
    status: "ERROR",
    message:
      "Muitas solicitações de recuperação de senha. Tente novamente em 1 hora.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
