import pool from "../config/database.js";
import { getWhatsAppConfig } from "../config/whatsapp.js";
import {
  createCategoryForUser,
  createEntryForUser,
  deleteCategoryForUser,
  deleteEntryForUser,
  getCategoriesForUser,
  listEntriesForUser,
  summarizeEntriesForUser,
  updateCategoryForUser,
  updateEntryForUser,
} from "./entriesService.js";
import {
  createPaymentAccountForUser,
  createPaymentMethodForUser,
  deletePaymentAccountForUser,
  deletePaymentMethodForUser,
  getPaymentCatalogForUser,
  updatePaymentAccountForUser,
  updatePaymentMethodForUser,
} from "./paymentCatalogService.js";
import { interpretWhatsAppIntent } from "./geminiService.js";
import {
  closeWhatsAppSession,
  getWhatsAppSessionByUserId,
  isWithinCustomerCareWindow,
  upsertWhatsAppSession,
} from "./whatsappSessionService.js";
import { bumpEntryCacheVersions } from "../utils/cache.js";
import {
  emitTransactionCreated,
  emitTransactionDeleted,
  emitTransactionUpdated,
} from "../utils/socket.js";
import {
  getDateFromWhatsAppTimestamp,
  getTextFromWhatsAppMessage,
  getWhatsAppContactByPhoneNumber,
  normalizeWhatsAppPhoneNumber,
  sendWhatsAppTextMessage,
} from "../utils/whatsapp.js";

const BRAZIL_TIME_ZONE = "America/Fortaleza";
const CANCEL_PATTERN = /^(cancelar|cancela|cancel|parar|sair)$/i;
const HELP_PATTERN = /^(\/?ajuda|\/?help)$/i;

function buildEmptySlots() {
  return {
    type: null,
    amount: null,
    description: null,
    date: null,
    category_name: null,
    payment_method_name: null,
    payment_account_name: null,
    accounts_enabled: null,
    start_date: null,
    end_date: null,
    period_label: null,
    reference_text: null,
    reference_index: null,
    new_name: null,
  };
}

const IMPLICIT_REFERENCE_PATTERN =
  /^(essa|esse|esta|este|isso|aquela|aquele|ultima|última|ultimo|último|primeira|primeiro)$/i;

function getLocalDateString(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TIME_ZONE,
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function getLocalDateParts(date = new Date()) {
  const [year, month, day] = getLocalDateString(date).split("-");

  return {
    year,
    month,
    day,
  };
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (typeof value === "string") {
    const normalizedValue = value.includes("T") ? value.slice(0, 10) : value;
    const match = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value || "");
  }

  return date.toLocaleDateString("pt-BR", {
    timeZone: BRAZIL_TIME_ZONE,
  });
}

function getStartOfWeek(referenceDate = new Date()) {
  const current = new Date(referenceDate);
  const weekDay = current.getDay();
  const diff = weekDay === 0 ? -6 : 1 - weekDay;
  current.setDate(current.getDate() + diff);
  current.setHours(0, 0, 0, 0);
  return current;
}

function getEndOfWeek(referenceDate = new Date()) {
  const current = getStartOfWeek(referenceDate);
  current.setDate(current.getDate() + 6);
  current.setHours(0, 0, 0, 0);
  return current;
}

function toDateOnlyString(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function getCurrentMonthRange(referenceDate = new Date()) {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);

  return {
    startDate: toDateOnlyString(start),
    endDate: toDateOnlyString(end),
  };
}

function getCurrentWeekRange(referenceDate = new Date()) {
  return {
    startDate: toDateOnlyString(getStartOfWeek(referenceDate)),
    endDate: toDateOnlyString(getEndOfWeek(referenceDate)),
  };
}

function translatePeriodLabel(value) {
  const normalized = normalizeName(value);

  if (!normalized) {
    return "o periodo solicitado";
  }

  if (normalized.includes("this month") || normalized === "este mes") {
    return "este mes";
  }

  if (normalized.includes("this week") || normalized === "esta semana") {
    return "esta semana";
  }

  if (normalized === "today" || normalized === "hoje") {
    return "hoje";
  }

  return String(value).trim();
}

function listOptionNames(items) {
  return items.map((item) => item.name).join(", ");
}

function buildHelpMessage() {
  return [
    "🤖 *Posso ajudar voce pelo WhatsApp com o financeiro do KIP.*",
    "",
    "📌 *Voce pode me pedir:*",
    "• registrar, editar e excluir transacoes",
    "• consultar saldo e gastos por periodo",
    "• criar, listar, editar e excluir categorias",
    "• criar, listar, editar e excluir formas de pagamento",
    "• criar, listar, editar e excluir contas de pagamento",
    "",
    "💬 *Exemplos:*",
    '• "gastei 100 reais em gasolina hoje no pix"',
    '• "quero ver meus gastos deste mes"',
    '• "delete essa transacao"',
    '• "crie a categoria lazer"',
    '• "renomeie a forma de pagamento pix para pix pessoal"',
    '• "exclua a conta inter"',
    "",
    '🛑 Envie "cancelar" para encerrar o fluxo atual.',
  ].join("\n");
}

function buildUnknownMessage() {
  return [
    "🤔 *Nao consegui entender essa acao dentro do KIP.*",
    "",
    "Eu posso ajudar com transacoes, categorias, formas de pagamento e contas de pagamento.",
    "",
    "💡 *Exemplos rapidos:*",
    '• "quero ver meus gastos de hoje"',
    '• "delete essa transacao"',
    '• "crie a categoria viagem"',
    '• "liste minhas formas de pagamento"',
    "",
    'Se quiser, envie "ajuda".',
  ].join("\n");
}

function mergeSlots(existingSlots = {}, newSlots = {}) {
  const merged = { ...existingSlots };

  for (const [key, value] of Object.entries(newSlots)) {
    if (value !== null && value !== undefined && value !== "") {
      merged[key] = value;
    }
  }

  return merged;
}

function pickConversationContext(slotState = {}) {
  return {
    recent_entries: Array.isArray(slotState.recent_entries)
      ? slotState.recent_entries
      : [],
    recent_categories: Array.isArray(slotState.recent_categories)
      ? slotState.recent_categories
      : [],
    recent_payment_methods: Array.isArray(slotState.recent_payment_methods)
      ? slotState.recent_payment_methods
      : [],
    recent_payment_accounts: Array.isArray(slotState.recent_payment_accounts)
      ? slotState.recent_payment_accounts
      : [],
  };
}

function preserveConversationContext(slotState = {}) {
  return {
    ...pickConversationContext(slotState),
  };
}

function buildCommandIntent(messageText, referenceDate = new Date()) {
  const normalized = normalizeName(messageText).replace(/\//g, "");
  const now = referenceDate;
  const baseSlots = buildEmptySlots();

  if (normalized === "hoje") {
    const today = getLocalDateString(now);

    return {
      intent: "get_entries",
      confidence: 1,
      slots: {
        ...baseSlots,
        start_date: today,
        end_date: today,
        period_label: "hoje",
      },
      missing_fields: [],
      notes: "command:hoje",
    };
  }

  if (normalized === "semana") {
    const range = getCurrentWeekRange(now);

    return {
      intent: "get_entries",
      confidence: 1,
      slots: {
        ...baseSlots,
        start_date: range.startDate,
        end_date: range.endDate,
        period_label: "esta semana",
      },
      missing_fields: [],
      notes: "command:semana",
    };
  }

  if (normalized === "mes" || normalized === "mes atual" || normalized === "mês") {
    const range = getCurrentMonthRange(now);

    return {
      intent: "get_entries",
      confidence: 1,
      slots: {
        ...baseSlots,
        start_date: range.startDate,
        end_date: range.endDate,
        period_label: "este mes",
      },
      missing_fields: [],
      notes: "command:mes",
    };
  }

  if (normalized === "ajuda" || normalized === "help") {
    return {
      intent: "help",
      confidence: 1,
      slots: baseSlots,
      missing_fields: [],
      notes: "command:help",
    };
  }

  return null;
}

function parseLocaleAmount(text) {
  const normalized = String(text || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const numericValue = Number.parseFloat(normalized);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
}

function parseBooleanText(text) {
  const normalized = normalizeName(text);

  if (["sim", "s", "usa", "com conta", "com contas", "true", "yes", "y"].includes(normalized)) {
    return true;
  }

  if (["nao", "não", "n", "sem conta", "sem contas", "false", "no"].includes(normalized)) {
    return false;
  }

  return null;
}

function parseRelativeDateText(text, referenceDate = new Date()) {
  const normalized = normalizeName(text);
  const now = referenceDate;

  if (normalized === "hoje" || normalized === "agora") {
    return getLocalDateString(now);
  }

  if (normalized === "ontem") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return getLocalDateString(yesterday);
  }

  const isoMatch = String(text || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const brMatch = String(text || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }

  const brShortMatch = String(text || "").trim().match(/^(\d{2})\/(\d{2})$/);

  if (brShortMatch) {
    const { year } = getLocalDateParts(referenceDate);
    return `${year}-${brShortMatch[2]}-${brShortMatch[1]}`;
  }

  const dayOnlyMatch = String(text || "").trim().match(/^(\d{1,2})$/);

  if (dayOnlyMatch) {
    const { year, month } = getLocalDateParts(referenceDate);
    return `${year}-${month}-${String(dayOnlyMatch[1]).padStart(2, "0")}`;
  }

  return null;
}

function buildDateRangeFromPeriodText(text, referenceDate = new Date()) {
  const normalized = normalizeName(text);
  const now = referenceDate;

  if (!normalized) {
    return null;
  }

  if (normalized.includes("hoje")) {
    const today = getLocalDateString(now);
    return {
      start_date: today,
      end_date: today,
      period_label: "hoje",
    };
  }

  if (normalized.includes("semana")) {
    const range = getCurrentWeekRange(now);
    return {
      start_date: range.startDate,
      end_date: range.endDate,
      period_label: "esta semana",
    };
  }

  if (normalized.includes("mes") || normalized.includes("mês")) {
    const range = getCurrentMonthRange(now);
    return {
      start_date: range.startDate,
      end_date: range.endDate,
      period_label: "este mes",
    };
  }

  const explicitDayMatch = String(text || "").match(
    /\b(?:dia\s+)?(\d{1,2})(?:\/(\d{1,2})(?:\/(\d{4}))?)?\b/i,
  );

  if (explicitDayMatch) {
    const { year: localYear, month: localMonth } = getLocalDateParts(referenceDate);
    const day = String(explicitDayMatch[1]).padStart(2, "0");
    const month = explicitDayMatch[2]
      ? String(explicitDayMatch[2]).padStart(2, "0")
      : localMonth;
    const year = explicitDayMatch[3] ? explicitDayMatch[3] : localYear;
    const normalizedDate = `${year}-${month}-${day}`;

    return {
      start_date: normalizedDate,
      end_date: normalizedDate,
      period_label: `dia ${day}/${month}`,
    };
  }

  return null;
}

function normalizeDateSlotValue(value, referenceDate = new Date()) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }

  return parseRelativeDateText(String(value).trim(), referenceDate);
}

function normalizeDateSlotsForIntent(intent, slots, referenceDate = new Date()) {
  if (intent === "create_entry" || intent === "update_entry") {
    const normalizedDate = normalizeDateSlotValue(slots.date, referenceDate);

    if (normalizedDate) {
      slots.date = normalizedDate;
    }
  }

  if (intent === "get_entries") {
    const normalizedStartDate = normalizeDateSlotValue(slots.start_date, referenceDate);
    const normalizedEndDate = normalizeDateSlotValue(slots.end_date, referenceDate);

    if (normalizedStartDate) {
      slots.start_date = normalizedStartDate;
    }

    if (normalizedEndDate) {
      slots.end_date = normalizedEndDate;
    }

    if ((!normalizedStartDate || !normalizedEndDate) && slots.period_label) {
      const normalizedRange = buildDateRangeFromPeriodText(
        slots.period_label,
        referenceDate,
      );

      if (normalizedRange) {
        slots.start_date = normalizedRange.start_date;
        slots.end_date = normalizedRange.end_date;
        slots.period_label = normalizedRange.period_label;
      }
    }
  }

  return slots;
}

function isIsoDateString(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function buildReferenceSlots(messageText) {
  const slots = {
    reference_text: null,
    reference_index: null,
  };
  const trimmedText = String(messageText || "").trim();
  const directNumberMatch = trimmedText.match(/^\d+$/);

  if (directNumberMatch) {
    slots.reference_index = Number.parseInt(directNumberMatch[0], 10);
    slots.reference_text = trimmedText;
    return slots;
  }

  const indexedMatch = trimmedText.match(
    /\b(?:numero|número|item|opcao|opção|lista)\s*(\d+)\b/i,
  );

  if (indexedMatch) {
    slots.reference_index = Number.parseInt(indexedMatch[1], 10);
  }

  const normalized = normalizeName(trimmedText);

  if (normalized.includes("essa transacao") || normalized.includes("esse lancamento")) {
    slots.reference_text = "essa transacao";
  } else if (normalized.includes("ultima") || normalized.includes("ultimo") || normalized.includes("mais recente")) {
    slots.reference_text = "ultima";
  } else if (normalized.includes("primeira") || normalized.includes("primeiro")) {
    slots.reference_text = "primeira";
  }

  return slots;
}

function extractNameAfterKeyword(messageText, keyword) {
  const normalizedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(messageText || "").match(
    new RegExp(`${normalizedKeyword}\\s+(.+)`, "i"),
  );

  return match?.[1]?.trim() || null;
}

function buildHeuristicIntent(messageText, session, referenceDate = new Date()) {
  const baseSlots = buildEmptySlots();
  const currentIntent = session?.current_intent || null;
  const currentStep = session?.current_step || null;

  if (currentIntent && currentStep) {
    if (currentStep === "reference_text") {
      const referenceSlots = buildReferenceSlots(messageText);

      if (referenceSlots.reference_index || referenceSlots.reference_text) {
        return {
          intent: currentIntent,
          confidence: 0.95,
          slots: {
            ...baseSlots,
            ...referenceSlots,
          },
          missing_fields: [],
          notes: "heuristic:reference_step",
        };
      }
    }

    if (currentStep === "amount") {
      const amount = parseLocaleAmount(messageText);

      if (amount !== null) {
        return {
          intent: currentIntent,
          confidence: 0.95,
          slots: {
            ...baseSlots,
            amount,
          },
          missing_fields: [],
          notes: "heuristic:amount_step",
        };
      }
    }

    if (currentStep === "accounts_enabled") {
      const accountsEnabled = parseBooleanText(messageText);

      if (accountsEnabled !== null) {
        return {
          intent: currentIntent,
          confidence: 0.95,
          slots: {
            ...baseSlots,
            accounts_enabled: accountsEnabled,
          },
          missing_fields: [],
          notes: "heuristic:boolean_step",
        };
      }
    }

    if (currentStep === "type") {
      if (/(entrada|recebi|receita|income)/i.test(messageText)) {
        return {
          intent: currentIntent,
          confidence: 0.95,
          slots: {
            ...baseSlots,
            type: "income",
          },
          missing_fields: [],
          notes: "heuristic:type_step_income",
        };
      }

      if (/(saida|saída|gastei|despesa|expense)/i.test(messageText)) {
        return {
          intent: currentIntent,
          confidence: 0.95,
          slots: {
            ...baseSlots,
            type: "expense",
          },
          missing_fields: [],
          notes: "heuristic:type_step_expense",
        };
      }
    }

    if (currentStep === "date") {
      const parsedDate = parseRelativeDateText(messageText, referenceDate);

      if (parsedDate) {
        return {
          intent: currentIntent,
          confidence: 0.95,
          slots: {
            ...baseSlots,
            date: parsedDate,
          },
          missing_fields: [],
          notes: "heuristic:date_step",
        };
      }
    }

    if (currentStep === "description") {
      return {
        intent: currentIntent,
        confidence: 0.9,
        slots: {
          ...baseSlots,
          description: String(messageText || "").trim(),
        },
        missing_fields: [],
        notes: "heuristic:description_step",
      };
    }

    if (
      currentStep === "category_name" ||
      currentStep === "payment_method_name" ||
      currentStep === "payment_account_name"
    ) {
      return {
        intent: currentIntent,
        confidence: 0.9,
        slots: {
          ...baseSlots,
          [currentStep]: String(messageText || "").trim(),
        },
        missing_fields: [],
        notes: `heuristic:${currentStep}_step`,
      };
    }

    if (currentStep === "period_label") {
      const periodRange = buildDateRangeFromPeriodText(messageText, referenceDate);

      if (periodRange) {
        return {
          intent: currentIntent,
          confidence: 0.95,
          slots: {
            ...baseSlots,
            ...periodRange,
          },
          missing_fields: [],
          notes: "heuristic:period_step",
        };
      }
    }

    if (currentStep === "new_name") {
      return {
        intent: currentIntent,
        confidence: 0.9,
        slots: {
          ...baseSlots,
          new_name: String(messageText || "").trim(),
        },
        missing_fields: [],
        notes: "heuristic:new_name_step",
      };
    }
  }

  if (/(delete|deleta|deletar|apaga|apagar|exclui|excluir|remove|remover)/i.test(messageText)) {
    const referenceSlots = buildReferenceSlots(messageText);

    if (/(transacao|transação|lancamento|lançamento|gasto|receita)/i.test(messageText)) {
      return {
        intent: "delete_entry",
        confidence: 0.92,
        slots: {
          ...baseSlots,
          ...referenceSlots,
        },
        missing_fields: [],
        notes: "heuristic:delete_entry",
      };
    }

    const categoryName = extractNameAfterKeyword(messageText, "categoria");

    if (categoryName || /categoria/i.test(messageText)) {
      return {
        intent: "delete_category",
        confidence: 0.92,
        slots: {
          ...baseSlots,
          category_name: categoryName,
          ...referenceSlots,
        },
        missing_fields: [],
        notes: "heuristic:delete_category",
      };
    }

    const accountName = extractNameAfterKeyword(messageText, "conta");

    if (accountName || /conta/i.test(messageText)) {
      return {
        intent: "delete_payment_account",
        confidence: 0.92,
        slots: {
          ...baseSlots,
          payment_account_name: accountName,
          ...referenceSlots,
        },
        missing_fields: [],
        notes: "heuristic:delete_payment_account",
      };
    }

    const methodName =
      extractNameAfterKeyword(messageText, "forma de pagamento") ||
      extractNameAfterKeyword(messageText, "pagamento");

    if (methodName || /forma de pagamento|pagamento/i.test(messageText)) {
      return {
        intent: "delete_payment_method",
        confidence: 0.92,
        slots: {
          ...baseSlots,
          payment_method_name: methodName,
          ...referenceSlots,
        },
        missing_fields: [],
        notes: "heuristic:delete_payment_method",
      };
    }
  }

  if (/(editar|edita|altera|alterar|atualiza|atualizar|renomeia|renomear)/i.test(messageText)) {
    const referenceSlots = buildReferenceSlots(messageText);

    if (/(transacao|transação|lancamento|lançamento)/i.test(messageText)) {
      return {
        intent: "update_entry",
        confidence: 0.9,
        slots: {
          ...baseSlots,
          ...referenceSlots,
        },
        missing_fields: [],
        notes: "heuristic:update_entry",
      };
    }

    const renameCategoryMatch = String(messageText || "").match(
      /categoria\s+(.+?)\s+(?:para|pra)\s+(.+)/i,
    );

    if (renameCategoryMatch) {
      return {
        intent: "update_category",
        confidence: 0.92,
        slots: {
          ...baseSlots,
          category_name: renameCategoryMatch[1].trim(),
          new_name: renameCategoryMatch[2].trim(),
        },
        missing_fields: [],
        notes: "heuristic:update_category",
      };
    }

    const renameMethodMatch = String(messageText || "").match(
      /forma de pagamento\s+(.+?)\s+(?:para|pra)\s+(.+)/i,
    );

    if (renameMethodMatch) {
      return {
        intent: "update_payment_method",
        confidence: 0.92,
        slots: {
          ...baseSlots,
          payment_method_name: renameMethodMatch[1].trim(),
          new_name: renameMethodMatch[2].trim(),
        },
        missing_fields: [],
        notes: "heuristic:update_payment_method",
      };
    }

    const renameAccountMatch = String(messageText || "").match(
      /conta\s+(.+?)\s+(?:para|pra)\s+(.+)/i,
    );

    if (renameAccountMatch) {
      return {
        intent: "update_payment_account",
        confidence: 0.92,
        slots: {
          ...baseSlots,
          payment_account_name: renameAccountMatch[1].trim(),
          new_name: renameAccountMatch[2].trim(),
        },
        missing_fields: [],
        notes: "heuristic:update_payment_account",
      };
    }
  }

  if (/(listar|liste|lista|mostrar|mostre|ver|veja|quais)/i.test(messageText)) {
    if (/categor/i.test(messageText)) {
      return {
        intent: "list_categories",
        confidence: 0.9,
        slots: baseSlots,
        missing_fields: [],
        notes: "heuristic:list_categories",
      };
    }

    if (/forma de pagamento|formas de pagamento|meios de pagamento/i.test(messageText)) {
      return {
        intent: "list_payment_methods",
        confidence: 0.9,
        slots: baseSlots,
        missing_fields: [],
        notes: "heuristic:list_payment_methods",
      };
    }

    if (/conta|contas/i.test(messageText)) {
      return {
        intent: "list_payment_accounts",
        confidence: 0.9,
        slots: baseSlots,
        missing_fields: [],
        notes: "heuristic:list_payment_accounts",
      };
    }
  }

  if (/(cria|criar|crie|adiciona|adicionar|adicione|nova|novo)/i.test(messageText)) {
    const categoryMatch = String(messageText || "").match(/categoria\s+(.+)/i);

    if (categoryMatch) {
      return {
        intent: "create_category",
        confidence: 0.9,
        slots: {
          ...baseSlots,
          category_name: categoryMatch[1].trim(),
        },
        missing_fields: [],
        notes: "heuristic:create_category",
      };
    }

    const methodMatch = String(messageText || "").match(
      /forma de pagamento\s+(.+?)(?:\s+(com conta|com contas|sem conta|sem contas))?$/i,
    );

    if (methodMatch) {
      return {
        intent: "create_payment_method",
        confidence: 0.9,
        slots: {
          ...baseSlots,
          payment_method_name: methodMatch[1].trim(),
          accounts_enabled: parseBooleanText(methodMatch[2] || ""),
        },
        missing_fields: [],
        notes: "heuristic:create_payment_method",
      };
    }

    const accountMatch = String(messageText || "").match(/conta\s+(.+)/i);

    if (accountMatch) {
      return {
        intent: "create_payment_account",
        confidence: 0.9,
        slots: {
          ...baseSlots,
          payment_account_name: accountMatch[1].trim(),
        },
        missing_fields: [],
        notes: "heuristic:create_payment_account",
      };
    }
  }

  const periodRange = buildDateRangeFromPeriodText(messageText, referenceDate);

  if (
    periodRange &&
    /(saldo|gasto|gastos|despesa|despesas|receita|receitas|transacao|transação|lancamento|lançamento)/i.test(
      messageText,
    )
  ) {
    return {
      intent: "get_entries",
      confidence: 0.9,
      slots: {
        ...baseSlots,
        ...periodRange,
      },
      missing_fields: [],
      notes: "heuristic:get_entries_period",
    };
  }

  return null;
}

async function insertAuditLog(
  {
    userId,
    contactId,
    sessionId,
    modelName,
    inputText,
    promptContext,
    structuredOutput,
    validationErrors = null,
  },
  client,
) {
  await client.query(
    `
      INSERT INTO whatsapp_llm_audits (
        user_id,
        contact_id,
        session_id,
        model_name,
        input_text,
        prompt_context,
        structured_output,
        validation_errors
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)
    `,
    [
      userId,
      contactId,
      sessionId,
      modelName,
      inputText,
      JSON.stringify(promptContext || {}),
      JSON.stringify(structuredOutput || {}),
      JSON.stringify(validationErrors),
    ],
  );
}

async function buildUserContext(userId, client) {
  const [categories, paymentCatalog] = await Promise.all([
    getCategoriesForUser(userId, client),
    getPaymentCatalogForUser(userId, client),
  ]);

  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      user_id: category.user_id,
    })),
    payment_methods: paymentCatalog.paymentMethods.map((method) => ({
      id: method.id,
      name: method.name,
      accounts_enabled: method.accounts_enabled,
      is_default: method.is_default,
      accounts: (method.accounts || []).map((account) => ({
        id: account.id,
        name: account.name,
      })),
    })),
    payment_accounts: paymentCatalog.paymentAccounts.map((account) => ({
      id: account.id,
      name: account.name,
    })),
  };
}

function normalizeIntentResult(session, interpretation) {
  const intent =
    interpretation.intent === "unknown" && session?.current_intent
      ? session.current_intent
      : interpretation.intent;

  return {
    intent,
    confidence: interpretation.confidence,
    slots: interpretation.slots || {},
    missing_fields: interpretation.missing_fields || [],
    notes: interpretation.notes || "",
  };
}

function findByName(items, name, key = "name") {
  const normalizedNeedle = normalizeName(name);

  if (!normalizedNeedle) {
    return null;
  }

  return (
    items.find((item) => normalizeName(item[key]) === normalizedNeedle) ||
    items.find((item) => normalizeName(item[key]).includes(normalizedNeedle)) ||
    null
  );
}

function resolveReferenceIndex(referenceIndex) {
  const numericValue = Number(referenceIndex);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

function getRecentItemByReference(recentItems, slots) {
  const referenceIndex = resolveReferenceIndex(slots.reference_index);

  if (referenceIndex && recentItems[referenceIndex - 1]) {
    return recentItems[referenceIndex - 1];
  }

  const normalizedReferenceText = normalizeName(slots.reference_text);

  if (!normalizedReferenceText) {
    return null;
  }

  if (
    IMPLICIT_REFERENCE_PATTERN.test(normalizedReferenceText) &&
    recentItems.length === 1
  ) {
    return recentItems[0];
  }

  if (
    (normalizedReferenceText.includes("ultima") ||
      normalizedReferenceText.includes("ultimo") ||
      normalizedReferenceText.includes("mais recente")) &&
    recentItems.length > 0
  ) {
    return recentItems[0];
  }

  if (
    (normalizedReferenceText.includes("primeira") ||
      normalizedReferenceText.includes("primeiro")) &&
    recentItems.length > 0
  ) {
    return recentItems[0];
  }

  return null;
}

function resolveNamedTarget({ items, recentItems, explicitName, slots, key = "name" }) {
  if (explicitName) {
    return findByName(items, explicitName, key);
  }

  const recentItem = getRecentItemByReference(recentItems, slots);

  if (recentItem) {
    const itemName = recentItem[key] || recentItem.name;
    return findByName(items, itemName, key);
  }

  const normalizedReferenceText = normalizeName(slots.reference_text);

  if (!normalizedReferenceText || IMPLICIT_REFERENCE_PATTERN.test(normalizedReferenceText)) {
    return null;
  }

  return (
    items.find((item) => normalizeName(item[key]).includes(normalizedReferenceText)) ||
    null
  );
}

function buildEntrySearchText(entry) {
  return normalizeName(
    [
      entry.description,
      entry.category_name,
      entry.payment_method_name,
      entry.payment_account_name,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

async function resolveEntryTarget({ userId, slots, sessionContext, client }) {
  const recentEntries = sessionContext.recent_entries || [];
  const recentReference = getRecentItemByReference(recentEntries, slots);

  if (recentReference?.id) {
    return recentReference;
  }

  const normalizedReferenceText = normalizeName(slots.reference_text);

  if (!normalizedReferenceText) {
    return null;
  }

  const recentMatch = recentEntries.find((entry) =>
    buildEntrySearchText(entry).includes(normalizedReferenceText),
  );

  if (recentMatch) {
    return recentMatch;
  }

  if (IMPLICIT_REFERENCE_PATTERN.test(normalizedReferenceText)) {
    return null;
  }

  const recentDatabaseEntries = await listEntriesForUser(
    userId,
    {
      limit: 20,
    },
    client,
  );

  return (
    recentDatabaseEntries.find((entry) =>
      buildEntrySearchText(entry).includes(normalizedReferenceText),
    ) || null
  );
}

function getEntryMutationFieldCount(slots) {
  const mutationFields = [
    "type",
    "amount",
    "description",
    "date",
    "category_name",
    "payment_method_name",
    "payment_account_name",
  ];

  return mutationFields.filter((field) => {
    const value = slots[field];
    return value !== null && value !== undefined && value !== "";
  }).length;
}

function formatReferenceList(items, formatter) {
  return items.map((item, index) => `${index + 1}. ${formatter(item)}`).join("\n");
}

function formatEntryReference(entry) {
  const sign = entry.type === "income" ? "+" : "-";
  return `${formatDate(entry.date)} • ${entry.description} • ${sign}${formatCurrency(
    entry.amount,
  )}`;
}

function getMissingQuestion(field, intent, userContext, sessionContext, relatedItem = null) {
  switch (field) {
    case "type":
      return "💬 Essa transacao e uma *entrada* ou uma *saida*?";
    case "amount":
      return "💬 Qual foi o valor da transacao?";
    case "description":
      return "💬 Qual descricao devo usar nessa transacao?";
    case "date":
      return "📅 Qual data devo registrar? Pode enviar no formato DD/MM/AAAA ou dizer hoje/ontem.";
    case "payment_method_name":
      return `💳 Qual forma de pagamento devo usar?\nDisponiveis: ${listOptionNames(
        userContext.payment_methods,
      )}.`;
    case "payment_account_name":
      if (relatedItem?.accounts?.length) {
        return `🏦 Qual conta devo usar em *${relatedItem.name}*?\nDisponiveis: ${listOptionNames(
          relatedItem.accounts,
        )}.`;
      }
      return "🏦 Qual conta devo usar nessa forma de pagamento?";
    case "period_label":
      return "📊 Qual periodo voce quer consultar? Ex.: hoje, esta semana, este mes ou um mes especifico.";
    case "accounts_enabled":
      return "⚙️ Essa forma de pagamento usa contas vinculadas? Responda *sim* ou *nao*.";
    case "category_name":
      return "🏷️ Qual categoria voce quer usar?";
    case "new_name":
      return "✏️ Qual deve ser o novo nome?";
    case "reference_text":
      if (intent === "delete_entry" || intent === "update_entry") {
        if (sessionContext.recent_entries?.length > 0) {
          return [
            `🧾 Qual transacao voce quer ${intent === "delete_entry" ? "excluir" : "editar"}?`,
            "Responda com o numero da lista:",
            formatReferenceList(sessionContext.recent_entries, formatEntryReference),
          ].join("\n");
        }
        return `🧾 Qual transacao voce quer ${intent === "delete_entry" ? "excluir" : "editar"}?`;
      }

      if (intent === "delete_category" || intent === "update_category") {
        if (sessionContext.recent_categories?.length > 0) {
          return [
            "🏷️ Qual categoria voce quer alterar?",
            "Responda com o numero da lista:",
            formatReferenceList(sessionContext.recent_categories, (item) => item.name),
          ].join("\n");
        }
        return "🏷️ Qual categoria voce quer alterar?";
      }

      if (intent === "delete_payment_method" || intent === "update_payment_method") {
        if (sessionContext.recent_payment_methods?.length > 0) {
          return [
            "💳 Qual forma de pagamento voce quer alterar?",
            "Responda com o numero da lista:",
            formatReferenceList(sessionContext.recent_payment_methods, (item) => item.name),
          ].join("\n");
        }
        return "💳 Qual forma de pagamento voce quer alterar?";
      }

      if (intent === "delete_payment_account" || intent === "update_payment_account") {
        if (sessionContext.recent_payment_accounts?.length > 0) {
          return [
            "🏦 Qual conta voce quer alterar?",
            "Responda com o numero da lista:",
            formatReferenceList(sessionContext.recent_payment_accounts, (item) => item.name),
          ].join("\n");
        }
        return "🏦 Qual conta voce quer alterar?";
      }

      return "💬 Pode me dizer exatamente qual item voce quer usar?";
    default:
      return "💬 Pode me passar mais detalhes para eu concluir essa acao?";
  }
}

function formatEntriesResponse(periodLabel, summary, entries) {
  const lines = [
    `📊 *Resumo de ${translatePeriodLabel(periodLabel)}*`,
    `• Entradas: ${formatCurrency(summary.totalIncome)}`,
    `• Saidas: ${formatCurrency(summary.totalExpense)}`,
    `• Saldo: ${formatCurrency(summary.balance)}`,
    `• Transacoes: ${summary.totalCount}`,
  ];

  if (entries.length > 0) {
    lines.push("");
    lines.push("🧾 *Ultimas transacoes*");

    entries.forEach((entry, index) => {
      const sign = entry.type === "income" ? "+" : "-";
      const details = [
        entry.category_name,
        entry.payment_method_name,
        entry.payment_account_name,
      ]
        .filter(Boolean)
        .join(" / ");

      lines.push(`${index + 1}. ${formatDate(entry.date)} • ${entry.description}`);
      lines.push(`   ${sign}${formatCurrency(entry.amount)}${details ? ` • ${details}` : ""}`);
    });
  } else {
    lines.push("");
    lines.push("🧾 Nao encontrei transacoes nesse periodo.");
  }

  return lines.join("\n");
}

function formatCategoriesResponse(categories) {
  const lines = ["🏷️ *Categorias*"];

  if (categories.length === 0) {
    lines.push("Nenhuma categoria encontrada.");
    return lines.join("\n");
  }

  categories.forEach((category, index) => {
    lines.push(`${index + 1}. ${category.name}`);
  });

  return lines.join("\n");
}

function formatPaymentMethodsResponse(paymentMethods) {
  const lines = ["💳 *Formas de pagamento*"];

  if (paymentMethods.length === 0) {
    lines.push("Nenhuma forma de pagamento encontrada.");
    return lines.join("\n");
  }

  paymentMethods.forEach((method, index) => {
    const details = [];

    if (method.accounts_enabled) {
      details.push("usa contas");
    }

    if (method.is_default) {
      details.push("padrao");
    }

    lines.push(
      `${index + 1}. ${method.name}${details.length > 0 ? ` • ${details.join(" • ")}` : ""}`,
    );
  });

  return lines.join("\n");
}

function formatPaymentAccountsResponse(paymentAccounts) {
  const lines = ["🏦 *Contas de pagamento*"];

  if (paymentAccounts.length === 0) {
    lines.push("Nenhuma conta encontrada.");
    return lines.join("\n");
  }

  paymentAccounts.forEach((account, index) => {
    lines.push(`${index + 1}. ${account.name}`);
  });

  return lines.join("\n");
}

function buildRichHelpMessage() {
  return [
    "🤖 *Posso te ajudar pelo WhatsApp com o financeiro do KIP.*",
    "",
    "📌 *Voce pode me pedir:*",
    "• registrar, editar e excluir transacoes",
    "• consultar saldo e gastos por periodo",
    "• criar, listar, editar e excluir categorias",
    "• criar, listar, editar e excluir formas de pagamento",
    "• criar, listar, editar e excluir contas de pagamento",
    "",
    "💬 *Exemplos:*",
    '• "gastei 100 reais em gasolina hoje no pix"',
    '• "quero ver meus gastos deste mes"',
    '• "delete essa transacao"',
    '• "crie a categoria lazer"',
    '• "renomeie a forma de pagamento pix para pix pessoal"',
    '• "exclua a conta inter"',
    "",
    '🛑 Envie "cancelar" para encerrar o fluxo atual.',
  ].join("\n");
}

function buildFriendlyUnknownMessage() {
  return [
    "🤔 *Nao consegui identificar essa acao no KIP.*",
    "",
    "Eu consigo te ajudar com transacoes, categorias, formas de pagamento e contas.",
    "",
    "💡 *Exemplos rapidos:*",
    '• "quero ver meus gastos de hoje"',
    '• "delete essa transacao"',
    '• "crie a categoria viagem"',
    '• "liste minhas formas de pagamento"',
    "",
    'Se quiser, envie "ajuda".',
  ].join("\n");
}

function formatEntryReferenceRich(entry) {
  const icon = entry.type === "income" ? "🟢" : "🔴";
  return `${icon} ${formatDate(entry.date)} • ${entry.description} • ${formatCurrency(
    entry.amount,
  )}`;
}

function formatEntriesResponseRich(periodLabel, summary, entries) {
  const lines = [
    `📊 *Resumo de ${translatePeriodLabel(periodLabel)}*`,
    "",
    `🟢 Entradas: ${formatCurrency(summary.totalIncome)}`,
    `🔴 Saidas: ${formatCurrency(summary.totalExpense)}`,
    `⚖️ Saldo: ${formatCurrency(summary.balance)}`,
    `🧾 Transacoes: ${summary.totalCount}`,
  ];

  if (entries.length === 0) {
    lines.push("");
    lines.push("🧾 Nao encontrei transacoes nesse periodo.");
    return lines.join("\n");
  }

  lines.push("");
  lines.push("📌 *Lancamentos mais recentes*");

  entries.forEach((entry, index) => {
    const icon = entry.type === "income" ? "🟢" : "🔴";
    const meta = [
      entry.category_name ? `🏷️ ${entry.category_name}` : null,
      entry.payment_method_name ? `💳 ${entry.payment_method_name}` : null,
      entry.payment_account_name ? `🏦 ${entry.payment_account_name}` : null,
    ].filter(Boolean);

    lines.push(`${index + 1}. ${icon} *${entry.description}*`);
    lines.push(`   💰 ${formatCurrency(entry.amount)}`);
    lines.push(`   📅 ${formatDate(entry.date)}`);

    if (meta.length > 0) {
      lines.push(`   ${meta.join(" • ")}`);
    }
  });

  return lines.join("\n");
}

function formatSimpleListResponse(title, emoji, items, itemFormatter) {
  const lines = [`${emoji} *${title}*`];

  if (items.length === 0) {
    lines.push("Nenhum item encontrado.");
    return lines.join("\n");
  }

  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${itemFormatter(item)}`);
  });

  return lines.join("\n");
}

function buildEntrySuccessMessage(title, entry) {
  const icon = entry.type === "income" ? "🟢" : "🔴";
  const meta = [
    entry.category_name ? `🏷️ ${entry.category_name}` : null,
    entry.payment_method_name ? `💳 ${entry.payment_method_name}` : null,
    entry.payment_account_name ? `🏦 ${entry.payment_account_name}` : null,
  ].filter(Boolean);

  return [
    title,
    `${icon} *${entry.description}*`,
    `💰 ${formatCurrency(entry.amount)}`,
    `📅 ${formatDate(entry.date)}`,
    meta.length > 0 ? meta.join(" • ") : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function toRecentEntryContext(entries) {
  return entries.map((entry) => ({
    id: entry.id,
    description: entry.description,
    date: entry.date,
    amount: Number(entry.amount),
    type: entry.type,
    category_name: entry.category_name || null,
    payment_method_name: entry.payment_method_name || null,
    payment_account_name: entry.payment_account_name || null,
  }));
}

function toRecentSimpleContext(items) {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
  }));
}

async function buildValidationResult(
  intent,
  slots,
  userContext,
  sessionContext,
  userId,
  client,
) {
  const missingFields = [];
  let relatedMethod = null;
  let validationMessage = null;
  const resolvedTargets = {};

  if (intent === "create_entry") {
    if (!slots.type) {
      missingFields.push("type");
    }
    if (slots.amount === null || slots.amount === undefined) {
      missingFields.push("amount");
    }
    if (!slots.description) {
      missingFields.push("description");
    }
    if (!slots.date) {
      missingFields.push("date");
    } else if (!isIsoDateString(slots.date)) {
      validationMessage = "📅 Nao consegui entender a data dessa transacao. Envie como DD/MM/AAAA, DD/MM ou diga hoje/ontem.";
    }
    if (!slots.payment_method_name) {
      missingFields.push("payment_method_name");
    }

    if (slots.payment_method_name) {
      relatedMethod = findByName(
        userContext.payment_methods,
        slots.payment_method_name,
      );

      if (!relatedMethod) {
        validationMessage = `❌ Nao encontrei a forma de pagamento "${slots.payment_method_name}".`;
      } else if (!relatedMethod.accounts_enabled && slots.payment_account_name) {
        validationMessage = `❌ A forma de pagamento "${relatedMethod.name}" nao usa contas vinculadas.`;
      } else if (relatedMethod.accounts_enabled && !slots.payment_account_name) {
        missingFields.push("payment_account_name");
      } else if (
        relatedMethod.accounts_enabled &&
        slots.payment_account_name &&
        !findByName(relatedMethod.accounts || [], slots.payment_account_name)
      ) {
        validationMessage = `❌ Nao encontrei a conta "${slots.payment_account_name}" para ${relatedMethod.name}.`;
      }
    }

    if (
      !validationMessage &&
      slots.category_name &&
      !findByName(userContext.categories, slots.category_name)
    ) {
      validationMessage = `❌ Nao encontrei a categoria "${slots.category_name}".`;
    }
  }

  if (intent === "update_entry" || intent === "delete_entry") {
    const resolvedEntry = await resolveEntryTarget({
      userId,
      slots,
      sessionContext,
      client,
    });

    if (!resolvedEntry) {
      missingFields.push("reference_text");
    } else {
      resolvedTargets.entry = resolvedEntry;
    }

    if (intent === "update_entry") {
      if (slots.date && !isIsoDateString(slots.date)) {
        validationMessage = "📅 Nao consegui entender a nova data. Envie como DD/MM/AAAA, DD/MM ou diga hoje/ontem.";
      }
      if (getEntryMutationFieldCount(slots) === 0) {
        validationMessage = "✏️ Me diga o que voce quer alterar nessa transacao.";
      }

      if (slots.payment_method_name) {
        relatedMethod = findByName(
          userContext.payment_methods,
          slots.payment_method_name,
        );

        if (!relatedMethod) {
          validationMessage = `❌ Nao encontrei a forma de pagamento "${slots.payment_method_name}".`;
        } else if (!relatedMethod.accounts_enabled && slots.payment_account_name) {
          validationMessage = `❌ A forma de pagamento "${relatedMethod.name}" nao usa contas vinculadas.`;
        } else if (
          relatedMethod.accounts_enabled &&
          slots.payment_account_name &&
          !findByName(relatedMethod.accounts || [], slots.payment_account_name)
        ) {
          validationMessage = `❌ Nao encontrei a conta "${slots.payment_account_name}" para ${relatedMethod.name}.`;
        } else if (relatedMethod.accounts_enabled && !slots.payment_account_name) {
          missingFields.push("payment_account_name");
        }
      }

      if (
        !validationMessage &&
        slots.category_name &&
        !findByName(userContext.categories, slots.category_name)
      ) {
        validationMessage = `❌ Nao encontrei a categoria "${slots.category_name}".`;
      }
    }
  }

  if (intent === "get_entries") {
    if (!slots.start_date || !slots.end_date) {
      missingFields.push("period_label");
    } else if (!isIsoDateString(slots.start_date) || !isIsoDateString(slots.end_date)) {
      validationMessage = "📅 Nao consegui entender esse periodo. Tente algo como hoje, esta semana, 07/05 ou 07/05/2026.";
    }
  }

  if (intent === "create_category") {
    if (!slots.category_name) {
      missingFields.push("category_name");
    }
  }

  if (intent === "update_category" || intent === "delete_category") {
    const resolvedCategory = resolveNamedTarget({
      items: userContext.categories.filter((category) => category.user_id !== null),
      recentItems: sessionContext.recent_categories || [],
      explicitName: slots.category_name,
      slots,
    });

    if (!resolvedCategory) {
      missingFields.push("reference_text");
    } else {
      resolvedTargets.category = resolvedCategory;
    }

    if (intent === "update_category" && !slots.new_name) {
      missingFields.push("new_name");
    }
  }

  if (intent === "list_payment_methods" || intent === "list_payment_accounts" || intent === "list_categories") {
    return {
      missingFields,
      relatedMethod,
      validationMessage,
      resolvedTargets,
    };
  }

  if (intent === "create_payment_method") {
    if (!slots.payment_method_name) {
      missingFields.push("payment_method_name");
    }
    if (slots.accounts_enabled === null || slots.accounts_enabled === undefined) {
      missingFields.push("accounts_enabled");
    }
  }

  if (intent === "update_payment_method" || intent === "delete_payment_method") {
    const resolvedMethod = resolveNamedTarget({
      items: userContext.payment_methods,
      recentItems: sessionContext.recent_payment_methods || [],
      explicitName: slots.payment_method_name,
      slots,
    });

    if (!resolvedMethod) {
      missingFields.push("reference_text");
    } else {
      resolvedTargets.payment_method = resolvedMethod;
    }

    if (
      intent === "update_payment_method" &&
      !slots.new_name &&
      (slots.accounts_enabled === null || slots.accounts_enabled === undefined)
    ) {
      validationMessage = "✏️ Me diga o que voce quer alterar nessa forma de pagamento.";
    }
  }

  if (intent === "create_payment_account") {
    if (!slots.payment_account_name) {
      missingFields.push("payment_account_name");
    }

    if (slots.payment_method_name) {
      relatedMethod = findByName(
        userContext.payment_methods,
        slots.payment_method_name,
      );

      if (!relatedMethod) {
        validationMessage = `❌ Nao encontrei a forma de pagamento "${slots.payment_method_name}".`;
      } else if (!relatedMethod.accounts_enabled) {
        validationMessage = `❌ A forma de pagamento "${relatedMethod.name}" nao usa contas vinculadas.`;
      }
    }
  }

  if (intent === "update_payment_account" || intent === "delete_payment_account") {
    const resolvedAccount = resolveNamedTarget({
      items: userContext.payment_accounts,
      recentItems: sessionContext.recent_payment_accounts || [],
      explicitName: slots.payment_account_name,
      slots,
    });

    if (!resolvedAccount) {
      missingFields.push("reference_text");
    } else {
      resolvedTargets.payment_account = resolvedAccount;
    }

    if (intent === "update_payment_account" && !slots.new_name) {
      missingFields.push("new_name");
    }
  }

  return {
    missingFields,
    relatedMethod,
    validationMessage,
    resolvedTargets,
  };
}

async function executeIntent({
  intent,
  slots,
  userContext,
  contact,
  client,
  sessionContext,
  validation,
}) {
  if (intent === "get_entries") {
    const maxEntries = getWhatsAppConfig().assistantMaxEntries;
    const [summary, entries] = await Promise.all([
      summarizeEntriesForUser(
        contact.user_id,
        {
          type: slots.type || null,
          startDate: slots.start_date,
          endDate: slots.end_date,
        },
        client,
      ),
      listEntriesForUser(
        contact.user_id,
        {
          type: slots.type || null,
          startDate: slots.start_date,
          endDate: slots.end_date,
          limit: maxEntries,
        },
        client,
      ),
    ]);

    return {
      message: formatEntriesResponseRich(
        slots.period_label || "o periodo solicitado",
        summary,
        entries,
      ),
      closeSession: true,
      nextSlotState: {
        ...preserveConversationContext(sessionContext),
        recent_entries: toRecentEntryContext(entries),
      },
    };
  }

  if (intent === "create_entry") {
    const category = slots.category_name
      ? findByName(userContext.categories, slots.category_name)
      : null;
    const paymentMethod = findByName(
      userContext.payment_methods,
      slots.payment_method_name,
    );

    if (!paymentMethod) {
      throw new Error(`Nao encontrei a forma de pagamento "${slots.payment_method_name}".`);
    }

    let paymentAccount = null;

    if (paymentMethod.accounts_enabled) {
      paymentAccount = findByName(
        paymentMethod.accounts || [],
        slots.payment_account_name,
      );

      if (!paymentAccount) {
        throw new Error(
          `Nao encontrei a conta "${slots.payment_account_name}" para ${paymentMethod.name}.`,
        );
      }
    }

    const entry = await createEntryForUser(
      contact.user_id,
      {
        type: slots.type,
        amount: Number(slots.amount),
        description: slots.description,
        category_id: category?.id || null,
        payment_method_id: paymentMethod.id,
        payment_account_id: paymentAccount?.id || null,
        date: slots.date,
      },
      client,
    );

    await bumpEntryCacheVersions(contact.user_id, entry.date);
    emitTransactionCreated(contact.user_id, entry);

    return {
      message: [
        "✅ *Transacao registrada com sucesso*",
        `${entry.description}`,
        `${formatCurrency(entry.amount)} • ${formatDate(entry.date)}`,
      ].join("\n"),
      closeSession: true,
      nextSlotState: {
        ...preserveConversationContext(sessionContext),
        recent_entries: toRecentEntryContext([entry]),
      },
    };
  }

  if (intent === "update_entry") {
    const targetEntry = validation.resolvedTargets.entry;
    const nextPayload = {};

    if (slots.type) {
      nextPayload.type = slots.type;
    }
    if (slots.amount !== null && slots.amount !== undefined) {
      nextPayload.amount = Number(slots.amount);
    }
    if (slots.description) {
      nextPayload.description = slots.description;
    }
    if (slots.date) {
      nextPayload.date = slots.date;
    }
    if (slots.category_name) {
      const category = findByName(userContext.categories, slots.category_name);
      nextPayload.category_id = category?.id || null;
    }
    if (slots.payment_method_name) {
      const paymentMethod = findByName(
        userContext.payment_methods,
        slots.payment_method_name,
      );
      nextPayload.payment_method_id = paymentMethod?.id || null;

      if (slots.payment_account_name) {
        const paymentAccount = findByName(
          paymentMethod?.accounts || userContext.payment_accounts,
          slots.payment_account_name,
        );
        nextPayload.payment_account_id = paymentAccount?.id || null;
      }
    }

    const result = await updateEntryForUser(
      contact.user_id,
      targetEntry.id,
      nextPayload,
      client,
    );

    await bumpEntryCacheVersions(
      contact.user_id,
      result.previousEntryDate,
      result.nextEntryDate,
    );
    emitTransactionUpdated(contact.user_id, result.entry);

    return {
      message: [
        "✏️ *Transacao atualizada*",
        `${result.entry.description}`,
        `${formatCurrency(result.entry.amount)} • ${formatDate(result.entry.date)}`,
      ].join("\n"),
      closeSession: true,
      nextSlotState: {
        ...preserveConversationContext(sessionContext),
        recent_entries: toRecentEntryContext([result.entry]),
      },
    };
  }

  if (intent === "delete_entry") {
    const targetEntry = validation.resolvedTargets.entry;
    const deletedEntryLabel = formatEntryReferenceRich(targetEntry);
    const deleted = await deleteEntryForUser(contact.user_id, targetEntry.id, client);

    await bumpEntryCacheVersions(contact.user_id, deleted.date);
    emitTransactionDeleted(contact.user_id, deleted.id);

    return {
      message: ["🗑️ *Transacao excluida*", deletedEntryLabel].join("\n"),
      closeSession: true,
      nextSlotState: {
        ...preserveConversationContext(sessionContext),
        recent_entries: [],
      },
    };
  }

  if (intent === "list_categories") {
    const categories = userContext.categories;

    return {
      message: formatSimpleListResponse("Categorias", "🏷️", categories, (item) => item.name),
      closeSession: true,
      nextSlotState: {
        ...preserveConversationContext(sessionContext),
        recent_categories: toRecentSimpleContext(categories),
      },
    };
  }

  if (intent === "create_category") {
    const category = await createCategoryForUser(
      contact.user_id,
      { name: slots.category_name },
      client,
    );

    return {
      message: `✅ *Categoria criada*\n${category.name}`,
      closeSession: true,
      nextSlotState: {
        ...preserveConversationContext(sessionContext),
        recent_categories: toRecentSimpleContext([category]),
      },
    };
  }

  if (intent === "update_category") {
    const category = await updateCategoryForUser(
      contact.user_id,
      validation.resolvedTargets.category.id,
      { name: slots.new_name },
      client,
    );

    return {
      message: `✏️ *Categoria atualizada*\n${category.name}`,
      closeSession: true,
      nextSlotState: {
        ...preserveConversationContext(sessionContext),
        recent_categories: toRecentSimpleContext([category]),
      },
    };
  }

  if (intent === "delete_category") {
    const deletedCategory = await deleteCategoryForUser(
      contact.user_id,
      validation.resolvedTargets.category.id,
      client,
    );

    return {
      message: `🗑️ *Categoria excluida*\n${deletedCategory.name}`,
      closeSession: true,
      nextSlotState: {
        ...preserveConversationContext(sessionContext),
        recent_categories: [],
      },
    };
  }

  if (intent === "list_payment_methods") {
    return {
      message: formatSimpleListResponse(
        "Formas de pagamento",
        "💳",
        userContext.payment_methods,
        (item) => {
          const details = [];

          if (item.accounts_enabled) {
            details.push("usa contas");
          }

          if (item.is_default) {
            details.push("padrao");
          }

          return `${item.name}${details.length > 0 ? ` • ${details.join(" • ")}` : ""}`;
        },
      ),
      closeSession: true,
      nextSlotState: {
        ...preserveConversationContext(sessionContext),
        recent_payment_methods: toRecentSimpleContext(userContext.payment_methods),
      },
    };
  }

  if (intent === "create_payment_method") {
    const paymentMethod = await createPaymentMethodForUser(
      contact.user_id,
      {
        name: slots.payment_method_name,
        accounts_enabled: Boolean(slots.accounts_enabled),
      },
      client,
    );

    return {
      message: `✅ *Forma de pagamento criada*\n${paymentMethod.name}`,
      closeSession: true,
      nextSlotState: {
        ...preserveConversationContext(sessionContext),
        recent_payment_methods: toRecentSimpleContext([paymentMethod]),
      },
    };
  }

  if (intent === "update_payment_method") {
    const paymentMethod = await updatePaymentMethodForUser(
      contact.user_id,
      validation.resolvedTargets.payment_method.id,
      {
        name: slots.new_name,
        accounts_enabled:
          slots.accounts_enabled === null || slots.accounts_enabled === undefined
            ? undefined
            : Boolean(slots.accounts_enabled),
      },
      client,
    );

    return {
      message: `✏️ *Forma de pagamento atualizada*\n${paymentMethod.name}`,
      closeSession: true,
      nextSlotState: {
        ...preserveConversationContext(sessionContext),
        recent_payment_methods: toRecentSimpleContext([paymentMethod]),
      },
    };
  }

  if (intent === "delete_payment_method") {
    const paymentMethod = await deletePaymentMethodForUser(
      contact.user_id,
      validation.resolvedTargets.payment_method.id,
      client,
    );

    return {
      message: `🗑️ *Forma de pagamento excluida*\n${paymentMethod.name}`,
      closeSession: true,
      nextSlotState: {
        ...preserveConversationContext(sessionContext),
        recent_payment_methods: [],
      },
    };
  }

  if (intent === "list_payment_accounts") {
    return {
      message: formatSimpleListResponse(
        "Contas de pagamento",
        "🏦",
        userContext.payment_accounts,
        (item) => item.name,
      ),
      closeSession: true,
      nextSlotState: {
        ...preserveConversationContext(sessionContext),
        recent_payment_accounts: toRecentSimpleContext(userContext.payment_accounts),
      },
    };
  }

  if (intent === "create_payment_account") {
    let paymentMethodId = null;

    if (slots.payment_method_name) {
      const paymentMethod = findByName(
        userContext.payment_methods,
        slots.payment_method_name,
      );

      if (!paymentMethod) {
        throw new Error(`Nao encontrei a forma de pagamento "${slots.payment_method_name}".`);
      }

      if (!paymentMethod.accounts_enabled) {
        throw new Error(
          `A forma de pagamento "${paymentMethod.name}" nao usa contas vinculadas.`,
        );
      }

      paymentMethodId = paymentMethod.id;
    }

    const paymentAccount = await createPaymentAccountForUser(
      contact.user_id,
      {
        name: slots.payment_account_name,
        payment_method_id: paymentMethodId,
      },
      client,
    );

    return {
      message: paymentMethodId
        ? `✅ *Conta criada e vinculada*\n${paymentAccount.name}`
        : `✅ *Conta criada*\n${paymentAccount.name}`,
      closeSession: true,
      nextSlotState: {
        ...preserveConversationContext(sessionContext),
        recent_payment_accounts: toRecentSimpleContext([paymentAccount]),
      },
    };
  }

  if (intent === "update_payment_account") {
    const paymentAccount = await updatePaymentAccountForUser(
      contact.user_id,
      validation.resolvedTargets.payment_account.id,
      { name: slots.new_name },
      client,
    );

    return {
      message: `✏️ *Conta atualizada*\n${paymentAccount.name}`,
      closeSession: true,
      nextSlotState: {
        ...preserveConversationContext(sessionContext),
        recent_payment_accounts: toRecentSimpleContext([paymentAccount]),
      },
    };
  }

  if (intent === "delete_payment_account") {
    const paymentAccount = await deletePaymentAccountForUser(
      contact.user_id,
      validation.resolvedTargets.payment_account.id,
      client,
    );

    return {
      message: `🗑️ *Conta excluida*\n${paymentAccount.name}`,
      closeSession: true,
      nextSlotState: {
        ...preserveConversationContext(sessionContext),
        recent_payment_accounts: [],
      },
    };
  }

  return {
    message: buildFriendlyUnknownMessage(),
    closeSession: true,
    nextSlotState: preserveConversationContext(sessionContext),
  };
}

async function replyAndPersistSession({
  contact,
  messageId,
  inboundAt,
  session,
  currentIntent,
  currentStep,
  pendingQuestion,
  slotState,
  replyText,
  closeSessionAfterReply = false,
  client,
}) {
  if (!isWithinCustomerCareWindow(session, new Date())) {
    throw new Error(
      "A janela de atendimento do WhatsApp expirou antes da resposta ser enviada",
    );
  }

  const outbound = await sendWhatsAppTextMessage({
    to: contact.phone_number_e164,
    body: replyText,
    userId: contact.user_id,
    contactId: contact.contact_id,
    relatedMessageId: messageId,
    client,
  });

  if (closeSessionAfterReply) {
    await closeWhatsAppSession(
      contact.user_id,
      {
        slotState,
        status: "completed",
        lastOutboundMessageId: outbound.metaMessageId,
        lastOutboundAt: new Date(),
      },
      client,
    );
    return;
  }

  await upsertWhatsAppSession(
    {
      userId: contact.user_id,
      contactId: contact.contact_id,
      currentIntent,
      currentStep,
      pendingQuestion,
      slotState,
      lastInboundMessageId: messageId,
      lastOutboundMessageId: outbound.metaMessageId,
      lastInboundAt: inboundAt,
      lastOutboundAt: new Date(),
      windowHours: getWhatsAppConfig().replyWindowHours,
      status: "active",
    },
    client,
  );
}

export async function handleIncomingWhatsAppMessage(message) {
  const config = getWhatsAppConfig();

  if (!config.assistantEnabled) {
    return true;
  }

  const normalizedPhoneNumber = normalizeWhatsAppPhoneNumber(message?.from);

  if (!normalizedPhoneNumber) {
    return true;
  }

  const client = await pool.connect();

  try {
    const contact = await getWhatsAppContactByPhoneNumber(normalizedPhoneNumber, client);

    if (!contact) {
      console.error("WhatsApp assistant contact lookup failed", {
        inboundPhoneNumber: normalizedPhoneNumber,
        messageId: message?.id || null,
      });
      await sendWhatsAppTextMessage({
        to: normalizedPhoneNumber,
        body: "⚠️ Nao encontrei nenhuma conta do KIP vinculada a este numero. Cadastre seu WhatsApp no perfil do app para continuar.",
        relatedMessageId: message?.id || null,
        client,
      });
      return true;
    }

    const inboundAt = getDateFromWhatsAppTimestamp(message?.timestamp) || new Date();
    const messageText = getTextFromWhatsAppMessage(message).trim();

    let session = await getWhatsAppSessionByUserId(contact.user_id, client);
    session = await upsertWhatsAppSession(
      {
        userId: contact.user_id,
        contactId: contact.contact_id,
        currentIntent: session?.current_intent || null,
        currentStep: session?.current_step || null,
        pendingQuestion: session?.pending_question || null,
        slotState: session?.slot_state_json || {},
        lastInboundMessageId: message?.id || null,
        lastOutboundMessageId: session?.last_outbound_message_id || null,
        lastInboundAt: inboundAt,
        lastOutboundAt: session?.last_outbound_at || null,
        windowHours: config.replyWindowHours,
        status: "active",
      },
      client,
    );

    if (!messageText) {
      await replyAndPersistSession({
        contact,
        messageId: message?.id || null,
        inboundAt,
        session,
        currentIntent: session.current_intent,
        currentStep: "unsupported_message",
        pendingQuestion: "Peca ao usuario para enviar texto.",
        slotState: preserveConversationContext(session.slot_state_json || {}),
        replyText: "💬 Por enquanto eu consigo processar apenas mensagens de texto. Envie sua solicitacao por escrito.",
        client,
      });
      return true;
    }

    if (!contact.opted_in) {
      await replyAndPersistSession({
        contact,
        messageId: message?.id || null,
        inboundAt,
        session,
        currentIntent: null,
        currentStep: "opt_in_required",
        pendingQuestion: null,
        slotState: preserveConversationContext(session.slot_state_json || {}),
        replyText:
          "⚠️ Seu WhatsApp ainda nao esta habilitado no KIP. Cadastre seu numero no perfil do app para continuar.",
        closeSessionAfterReply: true,
        client,
      });
      return true;
    }

    if (CANCEL_PATTERN.test(messageText)) {
      await replyAndPersistSession({
        contact,
        messageId: message?.id || null,
        inboundAt,
        session,
        currentIntent: null,
        currentStep: null,
        pendingQuestion: null,
        slotState: preserveConversationContext(session.slot_state_json || {}),
        replyText: "🛑 Fluxo cancelado. Quando quiser, envie uma nova mensagem.",
        closeSessionAfterReply: true,
        client,
      });
      return true;
    }

    if (HELP_PATTERN.test(messageText)) {
      await replyAndPersistSession({
        contact,
        messageId: message?.id || null,
        inboundAt,
        session,
        currentIntent: null,
        currentStep: null,
        pendingQuestion: null,
        slotState: preserveConversationContext(session.slot_state_json || {}),
        replyText: buildRichHelpMessage(),
        closeSessionAfterReply: true,
        client,
      });
      return true;
    }

    const userContext = await buildUserContext(contact.user_id, client);
    const commandIntent = buildCommandIntent(messageText, inboundAt);
    const heuristicIntent = commandIntent
      ? null
      : buildHeuristicIntent(messageText, session, inboundAt);
    const interpreted = commandIntent
      ? {
          model: "local-command-router",
          promptSummary: {
            source: "command",
          },
          output: commandIntent,
        }
      : heuristicIntent
        ? {
            model: "local-heuristic-router",
            promptSummary: {
              source: "heuristic",
              current_intent: session.current_intent,
              current_step: session.current_step,
            },
            output: heuristicIntent,
          }
      : await interpretWhatsAppIntent({
          messageText,
          sessionState: {
            current_intent: session.current_intent,
            current_step: session.current_step,
            pending_question: session.pending_question,
            slot_state_json: session.slot_state_json || {},
          },
          userContext,
          nowDate: getLocalDateString(inboundAt),
        });

    const normalizedIntent = normalizeIntentResult(session, interpreted.output);
    const preservedContext = preserveConversationContext(session.slot_state_json || {});
    const baseSlotState =
      session.current_intent &&
      normalizedIntent.intent &&
      normalizedIntent.intent !== session.current_intent
        ? preservedContext
        : session.slot_state_json || {};
    const slotState = mergeSlots(baseSlotState, normalizedIntent.slots);
    normalizeDateSlotsForIntent(normalizedIntent.intent, slotState, inboundAt);
    const validation = await buildValidationResult(
      normalizedIntent.intent,
      slotState,
      userContext,
      pickConversationContext(slotState),
      contact.user_id,
      client,
    );

    await insertAuditLog(
      {
        userId: contact.user_id,
        contactId: contact.contact_id,
        sessionId: session.id,
        modelName: interpreted.model,
        inputText: messageText,
        promptContext: interpreted.promptSummary,
        structuredOutput: normalizedIntent,
        validationErrors:
          validation.validationMessage || validation.missingFields.length > 0
            ? {
                validation_message: validation.validationMessage,
                missing_fields: validation.missingFields,
              }
            : null,
      },
      client,
    );

    if (normalizedIntent.intent === "help") {
      await replyAndPersistSession({
        contact,
        messageId: message?.id || null,
        inboundAt,
        session,
        currentIntent: null,
        currentStep: null,
        pendingQuestion: null,
        slotState: preservedContext,
        replyText: buildRichHelpMessage(),
        closeSessionAfterReply: true,
        client,
      });
      return true;
    }

    if (normalizedIntent.intent === "unknown") {
      await replyAndPersistSession({
        contact,
        messageId: message?.id || null,
        inboundAt,
        session,
        currentIntent: null,
        currentStep: null,
        pendingQuestion: null,
        slotState: preservedContext,
        replyText: buildFriendlyUnknownMessage(),
        closeSessionAfterReply: true,
        client,
      });
      return true;
    }

    if (validation.validationMessage) {
      await replyAndPersistSession({
        contact,
        messageId: message?.id || null,
        inboundAt,
        session,
        currentIntent: normalizedIntent.intent,
        currentStep: "clarification",
        pendingQuestion: validation.validationMessage,
        slotState,
        replyText: validation.validationMessage,
        client,
      });
      return true;
    }

    if (validation.missingFields.length > 0) {
      const nextField = validation.missingFields[0];
      const question = getMissingQuestion(
        nextField,
        normalizedIntent.intent,
        userContext,
        pickConversationContext(slotState),
        validation.relatedMethod,
      );

      await replyAndPersistSession({
        contact,
        messageId: message?.id || null,
        inboundAt,
        session,
        currentIntent: normalizedIntent.intent,
        currentStep: nextField,
        pendingQuestion: question,
        slotState,
        replyText: question,
        client,
      });
      return true;
    }

    const execution = await executeIntent({
      intent: normalizedIntent.intent,
      slots: slotState,
      userContext,
      contact,
      client,
      sessionContext: pickConversationContext(slotState),
      validation,
    });

    await replyAndPersistSession({
      contact,
      messageId: message?.id || null,
      inboundAt,
      session,
      currentIntent: null,
      currentStep: null,
      pendingQuestion: null,
      slotState: execution.nextSlotState,
      replyText: execution.message,
      closeSessionAfterReply: execution.closeSession,
      client,
    });
    return true;
  } catch (error) {
    console.error("WhatsApp assistant error:", error);

    try {
      await sendWhatsAppTextMessage({
        to: normalizedPhoneNumber,
        body: "⚠️ Nao consegui concluir sua solicitacao agora. Tente novamente em instantes.",
        relatedMessageId: message?.id || null,
        client,
      });
    } catch (replyError) {
      console.error("WhatsApp assistant fallback reply error:", replyError);
    }
    return false;
  } finally {
    client.release();
  }
}
