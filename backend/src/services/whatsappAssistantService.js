import pool from "../config/database.js";
import { getWhatsAppConfig } from "../config/whatsapp.js";
import {
  createEntryForUser,
  getCategoriesForUser,
  listEntriesForUser,
  summarizeEntriesForUser,
} from "./entriesService.js";
import {
  createPaymentAccountForUser,
  createPaymentMethodForUser,
  getPaymentCatalogForUser,
} from "./paymentCatalogService.js";
import { interpretWhatsAppIntent } from "./geminiService.js";
import {
  closeWhatsAppSession,
  getWhatsAppSessionByUserId,
  isWithinCustomerCareWindow,
  upsertWhatsAppSession,
} from "./whatsappSessionService.js";
import { bumpEntryCacheVersions } from "../utils/cache.js";
import { emitTransactionCreated } from "../utils/socket.js";
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
  const date = new Date(`${value}T00:00:00`);
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

function buildHelpMessage() {
  return [
    "Posso ajudar com mensagens livres pelo WhatsApp.",
    "Exemplos:",
    '- "gastei 100 reais em gasolina agora no pix"',
    '- "recebi meu salario de 3200 hoje"',
    '- "quero ver meus gastos de hoje"',
    '- "criar forma de pagamento vale alimentacao com conta"',
    '- "criar conta nubank"',
    'Envie "cancelar" para encerrar o fluxo atual.',
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

function listOptionNames(items) {
  return items.map((item) => item.name).join(", ");
}

function buildCommandIntent(messageText) {
  const normalized = normalizeName(messageText).replace(/\//g, "");
  const now = new Date();

  if (normalized === "hoje") {
    const today = getLocalDateString(now);

    return {
      intent: "get_entries",
      confidence: 1,
      slots: {
        type: null,
        amount: null,
        description: null,
        date: null,
        category_name: null,
        payment_method_name: null,
        payment_account_name: null,
        accounts_enabled: null,
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
        type: null,
        amount: null,
        description: null,
        date: null,
        category_name: null,
        payment_method_name: null,
        payment_account_name: null,
        accounts_enabled: null,
        start_date: range.startDate,
        end_date: range.endDate,
        period_label: "esta semana",
      },
      missing_fields: [],
      notes: "command:semana",
    };
  }

  if (normalized === "mes" || normalized === "mês") {
    const range = getCurrentMonthRange(now);

    return {
      intent: "get_entries",
      confidence: 1,
      slots: {
        type: null,
        amount: null,
        description: null,
        date: null,
        category_name: null,
        payment_method_name: null,
        payment_account_name: null,
        accounts_enabled: null,
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
      slots: {
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
      },
      missing_fields: [],
      notes: "command:help",
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
    })),
    payment_methods: paymentCatalog.paymentMethods.map((method) => ({
      id: method.id,
      name: method.name,
      accounts_enabled: method.accounts_enabled,
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

function getMissingQuestion(field, userContext, relatedItem = null) {
  switch (field) {
    case "type":
      return "Essa transacao e uma entrada ou uma saida?";
    case "amount":
      return "Qual foi o valor da transacao?";
    case "description":
      return "Qual descricao devo usar para essa transacao?";
    case "date":
      return "Qual data devo registrar? Use DD/MM/AAAA ou diga hoje/ontem.";
    case "payment_method_name":
      return `Qual forma de pagamento devo usar? Disponiveis: ${listOptionNames(
        userContext.payment_methods,
      )}.`;
    case "payment_account_name":
      if (relatedItem?.accounts?.length) {
        return `Qual conta devo usar em ${relatedItem.name}? Disponiveis: ${listOptionNames(
          relatedItem.accounts,
        )}.`;
      }
      return "Qual conta devo usar nessa forma de pagamento?";
    case "period_label":
      return "Qual periodo voce quer consultar? Ex.: hoje, esta semana, este mes ou um mes especifico.";
    case "accounts_enabled":
      return "Essa forma de pagamento usa contas vinculadas? Responda sim ou nao.";
    default:
      return "Pode me passar mais detalhes para eu concluir essa acao?";
  }
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

function buildValidationResult(intent, slots, userContext) {
  const missingFields = [];
  let relatedMethod = null;
  let validationMessage = null;

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
        validationMessage = `Nao encontrei a forma de pagamento "${slots.payment_method_name}". Disponiveis: ${listOptionNames(
          userContext.payment_methods,
        )}.`;
      } else if (
        !relatedMethod.accounts_enabled &&
        slots.payment_account_name
      ) {
        validationMessage = `A forma de pagamento "${relatedMethod.name}" nao usa contas vinculadas.`;
      } else if (relatedMethod.accounts_enabled && !slots.payment_account_name) {
        missingFields.push("payment_account_name");
      } else if (
        relatedMethod.accounts_enabled &&
        slots.payment_account_name &&
        !findByName(relatedMethod.accounts || [], slots.payment_account_name)
      ) {
        validationMessage = `Nao encontrei a conta "${slots.payment_account_name}" para ${relatedMethod.name}.`;
      }
    }

    if (
      !validationMessage &&
      slots.category_name &&
      !findByName(userContext.categories, slots.category_name)
    ) {
      validationMessage = `Nao encontrei a categoria "${slots.category_name}".`;
    }
  }

  if (intent === "get_entries") {
    if (!slots.start_date || !slots.end_date) {
      missingFields.push("period_label");
    }
  }

  if (intent === "create_payment_method") {
    if (!slots.payment_method_name) {
      missingFields.push("payment_method_name");
    }
    if (slots.accounts_enabled === null || slots.accounts_enabled === undefined) {
      missingFields.push("accounts_enabled");
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
        validationMessage = `Nao encontrei a forma de pagamento "${slots.payment_method_name}". Disponiveis: ${listOptionNames(
          userContext.payment_methods,
        )}.`;
      } else if (!relatedMethod.accounts_enabled) {
        validationMessage = `A forma de pagamento "${relatedMethod.name}" nao usa contas vinculadas.`;
      }
    }
  }

  return {
    missingFields,
    relatedMethod,
    validationMessage,
  };
}

function formatEntriesResponse(periodLabel, summary, entries) {
  const lines = [
    `Resumo de ${periodLabel}:`,
    `Entradas: ${formatCurrency(summary.totalIncome)}`,
    `Saidas: ${formatCurrency(summary.totalExpense)}`,
    `Saldo: ${formatCurrency(summary.balance)}`,
    `Transacoes: ${summary.totalCount}`,
  ];

  if (entries.length > 0) {
    lines.push("");
    lines.push("Ultimos lancamentos:");

    entries.forEach((entry, index) => {
      const sign = entry.type === "income" ? "+" : "-";
      const accountPart = entry.payment_account_name
        ? ` / ${entry.payment_account_name}`
        : "";
      const categoryPart = entry.category_name ? ` / ${entry.category_name}` : "";
      const methodPart = entry.payment_method_name
        ? ` / ${entry.payment_method_name}${accountPart}`
        : "";

      lines.push(
        `${index + 1}. ${formatDate(entry.date)} - ${entry.description} - ${sign}${formatCurrency(
          entry.amount,
        )}${categoryPart}${methodPart}`,
      );
    });
  } else {
    lines.push("");
    lines.push("Nao encontrei transacoes nesse periodo.");
  }

  return lines.join("\n");
}

async function executeIntent({ intent, slots, userContext, contact, client }) {
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
      message: formatEntriesResponse(
        slots.period_label || "periodo solicitado",
        summary,
        entries,
      ),
      closeSession: true,
      nextSlotState: {},
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
      message: `Forma de pagamento "${paymentMethod.name}" criada com sucesso.`,
      closeSession: true,
      nextSlotState: {},
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
        throw new Error(
          `Nao encontrei a forma de pagamento "${slots.payment_method_name}".`,
        );
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
        ? `Conta "${paymentAccount.name}" criada e vinculada com sucesso.`
        : `Conta "${paymentAccount.name}" criada com sucesso.`,
      closeSession: true,
      nextSlotState: {},
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
      throw new Error(
        `Nao encontrei a forma de pagamento "${slots.payment_method_name}".`,
      );
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
      message: `Transacao registrada com sucesso: ${entry.description} em ${formatCurrency(
        entry.amount,
      )} no dia ${formatDate(entry.date)}.`,
      closeSession: true,
      nextSlotState: {},
    };
  }

  return {
    message: buildHelpMessage(),
    closeSession: true,
    nextSlotState: {},
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
        body: "Nao encontrei nenhuma conta do KIP vinculada a este numero. Cadastre seu WhatsApp no seu perfil do app para continuar.",
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
        pendingQuestion: "Peça ao usuário para enviar texto.",
        slotState: session.slot_state_json || {},
        replyText: "Por enquanto eu consigo processar apenas mensagens de texto. Envie sua solicitacao por escrito.",
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
        slotState: {},
        replyText:
          "Seu WhatsApp ainda nao esta habilitado no KIP. Cadastre seu numero no perfil do app para continuar.",
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
        slotState: {},
        replyText: "Fluxo cancelado. Quando quiser, envie uma nova mensagem.",
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
        slotState: {},
        replyText: buildHelpMessage(),
        closeSessionAfterReply: true,
        client,
      });
      return true;
    }

    const userContext = await buildUserContext(contact.user_id, client);
    const commandIntent = buildCommandIntent(messageText);
    const interpreted = commandIntent
      ? {
          model: "local-command-router",
          promptSummary: {
            source: "command",
          },
          output: commandIntent,
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
        });

    const normalizedIntent = normalizeIntentResult(session, interpreted.output);
    const baseSlotState =
      session.current_intent &&
      normalizedIntent.intent &&
      normalizedIntent.intent !== session.current_intent
        ? {}
        : session.slot_state_json || {};
    const slotState = mergeSlots(baseSlotState, normalizedIntent.slots);
    const validation = buildValidationResult(
      normalizedIntent.intent,
      slotState,
      userContext,
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

    if (normalizedIntent.intent === "help" || normalizedIntent.intent === "unknown") {
      await replyAndPersistSession({
        contact,
        messageId: message?.id || null,
        inboundAt,
        session,
        currentIntent: null,
        currentStep: null,
        pendingQuestion: null,
        slotState: {},
        replyText: buildHelpMessage(),
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
      const question = getMissingQuestion(nextField, userContext, validation.relatedMethod);

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
        body: "Nao consegui concluir sua solicitacao agora. Tente novamente em instantes.",
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
