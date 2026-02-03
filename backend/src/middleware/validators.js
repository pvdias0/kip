import { body, param, query, validationResult } from 'express-validator';

// Middleware para verificar erros de validação
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 'ERROR',
            message: 'Dados inválidos',
            errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
        });
    }
    next();
};

// Validações para autenticação
export const loginValidation = [
    body('username')
        .trim()
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail()
        .isLength({ max: 255 })
        .withMessage('Email muito longo'),
    body('password')
        .isLength({ min: 6, max: 128 })
        .withMessage('Senha deve ter entre 6 e 128 caracteres'),
];

export const registerValidation = [
    body('username')
        .trim()
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail()
        .isLength({ max: 255 })
        .withMessage('Email muito longo'),
    body('password')
        .isLength({ min: 6, max: 128 })
        .withMessage('Senha deve ter entre 6 e 128 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])|(?=.*\d)/)
        .withMessage('Senha muito fraca. Use letras maiúsculas, minúsculas ou números'),
];

// Validações para entries
export const createEntryValidation = [
    body('type')
        .isIn(['income', 'expense'])
        .withMessage('Tipo deve ser "income" ou "expense"'),
    body('amount')
        .isFloat({ min: 0.01, max: 999999999.99 })
        .withMessage('Valor deve ser um número positivo'),
    body('description')
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Descrição deve ter entre 1 e 255 caracteres')
        .escape(), // Previne XSS
    body('category_id')
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage('ID de categoria inválido'),
    body('date')
        .isISO8601()
        .withMessage('Data inválida')
        .toDate(),
];

export const updateEntryValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID inválido'),
    body('type')
        .optional()
        .isIn(['income', 'expense'])
        .withMessage('Tipo deve ser "income" ou "expense"'),
    body('amount')
        .optional()
        .isFloat({ min: 0.01, max: 999999999.99 })
        .withMessage('Valor deve ser um número positivo'),
    body('description')
        .optional()
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Descrição deve ter entre 1 e 255 caracteres')
        .escape(),
    body('category_id')
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage('ID de categoria inválido'),
    body('date')
        .optional()
        .isISO8601()
        .withMessage('Data inválida'),
];

// Validações para categorias
export const createCategoryValidation = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Nome deve ter entre 1 e 50 caracteres')
        .escape(),
];

// Validações para password reset
export const forgotPasswordValidation = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail()
        .isLength({ max: 255 })
        .withMessage('Email muito longo'),
];

export const resetPasswordValidation = [
    body('token')
        .isLength({ min: 64, max: 64 })
        .withMessage('Token inválido')
        .isHexadecimal()
        .withMessage('Token com formato inválido'),
    body('password')
        .isLength({ min: 6, max: 128 })
        .withMessage('Senha deve ter entre 6 e 128 caracteres'),
    body('confirmPassword')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('As senhas não conferem'),
];

// Validação de query params para entries
export const getEntriesValidation = [
    query('type')
        .optional()
        .isIn(['income', 'expense'])
        .withMessage('Tipo deve ser "income" ou "expense"'),
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Data de início inválida'),
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('Data de fim inválida'),
];

// Validação de ID em params
export const idParamValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID inválido'),
];
