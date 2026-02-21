import rateLimit from 'express-rate-limit';

// Rate limiter para rotas de autenticação (login/register)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo 5 tentativas por janela
    message: {
        status: 'ERROR',
        message: 'Muitas tentativas. Por favor, aguarde 15 minutos antes de tentar novamente.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for successful requests (optional)
    skipSuccessfulRequests: false,
    // Key generator - usar IP do cliente
    keyGenerator: (req) => {
        return req.ip || req.headers['x-forwarded-for'] || 'unknown';
    },
});

// Rate limiter geral para API
export const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 100, // 100 requests por minuto
    message: {
        status: 'ERROR',
        message: 'Limite de requisições excedido. Por favor, tente novamente em breve.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter para reset de senha (mais restritivo)
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // Máximo 3 tentativas por hora
    message: {
        status: 'ERROR',
        message: 'Muitas solicitações de recuperação de senha. Tente novamente em 1 hora.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
