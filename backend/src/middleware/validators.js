import { body, param, query, validationResult } from "express-validator";
import {
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
} from "../config/legal.js";

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
  body("email")
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
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Nome deve ter entre 2 e 100 caracteres"),
  body("email")
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
  body("termsAccepted")
    .custom((value) => value === true)
    .withMessage("O aceite dos Termos de Servico e obrigatorio"),
  body("privacyAccepted")
    .custom((value) => value === true)
    .withMessage("O aceite da Politica de Privacidade e obrigatorio"),
  body("termsVersion")
    .equals(TERMS_OF_SERVICE_VERSION)
    .withMessage("Versao dos Termos de Servico invalida"),
  body("privacyVersion")
    .equals(PRIVACY_POLICY_VERSION)
    .withMessage("Versao da Politica de Privacidade invalida"),
];

export const profileUpdateValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Nome deve ter entre 2 e 100 caracteres"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Email invalido")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email muito longo"),
];

export const changePasswordValidation = [
  body("currentPassword")
    .isLength({ min: 6, max: 128 })
    .withMessage("Senha atual invalida"),
  body("newPassword")
    .isLength({ min: 6, max: 128 })
    .withMessage("A nova senha deve ter entre 6 e 128 caracteres")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])|(?=.*\d)/)
    .withMessage("Senha muito fraca. Use letras maiusculas, minusculas ou numeros"),
  body("confirmPassword")
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage("As senhas nao conferem"),
];

export const legalAcceptanceValidation = [
  body("termsAccepted")
    .custom((value) => value === true)
    .withMessage("O aceite dos Termos de Servico e obrigatorio"),
  body("privacyAccepted")
    .custom((value) => value === true)
    .withMessage("O aceite da Politica de Privacidade e obrigatorio"),
  body("termsVersion")
    .equals(TERMS_OF_SERVICE_VERSION)
    .withMessage("Versao dos Termos de Servico invalida"),
  body("privacyVersion")
    .equals(PRIVACY_POLICY_VERSION)
    .withMessage("Versao da Politica de Privacidade invalida"),
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

export const whatsappProfileValidation = [
  body("phone_number")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage("Numero de WhatsApp invalido"),
  body("opted_in")
    .isBoolean()
    .withMessage("O campo opted_in deve ser booleano"),
  body("opt_in_source")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 80 })
    .withMessage("Origem do opt-in muito longa"),
  body("receive_support_messages")
    .optional()
    .isBoolean()
    .withMessage("receive_support_messages deve ser booleano"),
  body("receive_transactional_messages")
    .optional()
    .isBoolean()
    .withMessage("receive_transactional_messages deve ser booleano"),
  body("receive_weekly_summary")
    .optional()
    .isBoolean()
    .withMessage("receive_weekly_summary deve ser booleano"),
  body("receive_budget_alerts")
    .optional()
    .isBoolean()
    .withMessage("receive_budget_alerts deve ser booleano"),
];
