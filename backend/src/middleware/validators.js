import { body, param, query, validationResult } from "express-validator";

export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: "ERROR",
      message: "Dados invalidos",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }

  next();
};

export const loginValidation = [
  body("username")
    .trim()
    .isEmail()
    .withMessage("Email invalido")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email muito longo"),
  body("password")
    .isLength({ min: 6, max: 128 })
    .withMessage("Senha deve ter entre 6 e 128 caracteres"),
];

export const registerValidation = [
  body("username")
    .trim()
    .isEmail()
    .withMessage("Email invalido")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email muito longo"),
  body("password")
    .isLength({ min: 6, max: 128 })
    .withMessage("Senha deve ter entre 6 e 128 caracteres")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])|(?=.*\d)/)
    .withMessage("Senha muito fraca. Use letras maiusculas, minusculas ou numeros"),
];

export const createEntryValidation = [
  body("type")
    .isIn(["income", "expense"])
    .withMessage('Tipo deve ser "income" ou "expense"'),
  body("amount")
    .isFloat({ min: 0.01, max: 999999999.99 })
    .withMessage("Valor deve ser um numero positivo"),
  body("description")
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage("Descricao deve ter entre 1 e 255 caracteres")
    .escape(),
  body("category_id")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("ID de categoria invalido"),
  body("date")
    .isISO8601()
    .withMessage("Data invalida"),
];

export const updateEntryValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID invalido"),
  body("type")
    .optional()
    .isIn(["income", "expense"])
    .withMessage('Tipo deve ser "income" ou "expense"'),
  body("amount")
    .optional()
    .isFloat({ min: 0.01, max: 999999999.99 })
    .withMessage("Valor deve ser um numero positivo"),
  body("description")
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage("Descricao deve ter entre 1 e 255 caracteres")
    .escape(),
  body("category_id")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("ID de categoria invalido"),
  body("date")
    .optional()
    .isISO8601()
    .withMessage("Data invalida"),
];

export const createCategoryValidation = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Nome deve ter entre 1 e 50 caracteres")
    .escape(),
];

export const forgotPasswordValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Email invalido")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email muito longo"),
];

export const resetPasswordValidation = [
  body("token")
    .isLength({ min: 64, max: 64 })
    .withMessage("Token invalido")
    .isHexadecimal()
    .withMessage("Token com formato invalido"),
  body("password")
    .isLength({ min: 6, max: 128 })
    .withMessage("Senha deve ter entre 6 e 128 caracteres"),
  body("confirmPassword")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("As senhas nao conferem"),
];

export const getEntriesValidation = [
  query("type")
    .optional()
    .isIn(["income", "expense"])
    .withMessage('Tipo deve ser "income" ou "expense"'),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Data de inicio invalida"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Data de fim invalida"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Pagina invalida"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limite invalido"),
];

export const idParamValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID invalido"),
];
