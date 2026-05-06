const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const INTENT_SCHEMA = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: [
        "help",
        "unknown",
        "get_entries",
        "create_entry",
        "create_payment_method",
        "create_payment_account",
      ],
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    slots: {
      type: "object",
      properties: {
        type: { type: ["string", "null"], enum: ["income", "expense", null] },
        amount: { type: ["number", "null"] },
        description: { type: ["string", "null"] },
        date: { type: ["string", "null"], format: "date" },
        category_name: { type: ["string", "null"] },
        payment_method_name: { type: ["string", "null"] },
        payment_account_name: { type: ["string", "null"] },
        accounts_enabled: { type: ["boolean", "null"] },
        start_date: { type: ["string", "null"], format: "date" },
        end_date: { type: ["string", "null"], format: "date" },
        period_label: { type: ["string", "null"] },
      },
      required: [
        "type",
        "amount",
        "description",
        "date",
        "category_name",
        "payment_method_name",
        "payment_account_name",
        "accounts_enabled",
        "start_date",
        "end_date",
        "period_label",
      ],
      additionalProperties: false,
    },
    missing_fields: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "type",
          "amount",
          "description",
          "date",
          "category_name",
          "payment_method_name",
          "payment_account_name",
          "accounts_enabled",
          "start_date",
          "end_date",
          "period_label",
        ],
      },
    },
    notes: { type: "string" },
  },
  required: ["intent", "confidence", "slots", "missing_fields", "notes"],
  additionalProperties: false,
};

function buildPrompt({
  messageText,
  sessionState,
  userContext,
  nowDate,
}) {
  return `
Voce e o interpretador estruturado do KIP para mensagens recebidas no WhatsApp.
Sua tarefa e entender a intencao do usuario e preencher os campos necessarios para o backend executar a acao.

Data atual local: ${nowDate}

Intents suportadas:
- help
- unknown
- get_entries
- create_entry
- create_payment_method
- create_payment_account

Regras:
- Nao invente dados que o usuario nao informou.
- Se o usuario estiver respondendo uma pergunta anterior, combine a nova mensagem com o estado atual da sessao.
- Para create_entry:
  - type deve ser income ou expense.
  - amount deve ser numero.
  - description deve ser curta e objetiva.
  - date deve ser YYYY-MM-DD quando a data estiver clara. Se o usuario falar agora/hoje, use a data atual.
  - category_name e opcional.
  - payment_method_name e obrigatorio para executar.
  - payment_account_name so e obrigatorio se a forma de pagamento usar contas.
- Para get_entries:
  - se houver periodo claro, preencha start_date e end_date em YYYY-MM-DD.
  - se o usuario disser hoje, semana, mes atual ou mes especifico, converta para datas.
  - type pode ser null quando quiser todas as transacoes.
- Para create_payment_method:
  - description vai vazia.
  - use payment_method_name para o nome da forma de pagamento.
  - use category_name e payment_account_name nulos.
  - use period_label nulo.
  - use accounts_enabled quando o usuario indicar se a forma usa contas ou nao.
- Para create_payment_account:
  - description vai vazia.
  - use payment_account_name para o nome da conta e payment_method_name se o usuario quiser vincular a uma forma de pagamento existente.
- Quando nao entender, use unknown.

Contexto do usuario:
${JSON.stringify(userContext)}

Estado atual da sessao:
${JSON.stringify(sessionState || {})}

Mensagem recebida:
${JSON.stringify(messageText)}
  `.trim();
}

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractResponseText(responseBody) {
  return (
    responseBody?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || ""
  );
}

export async function interpretWhatsAppIntent({
  messageText,
  sessionState,
  userContext,
}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY nao configurada");
  }

  const prompt = buildPrompt({
    messageText,
    sessionState,
    userContext,
    nowDate: new Date().toISOString().slice(0, 10),
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseJsonSchema: INTENT_SCHEMA,
        },
      }),
    },
  );

  const responseText = await response.text();
  const responseBody = safeParseJson(responseText) || { raw: responseText };

  if (!response.ok) {
    throw new Error(
      responseBody?.error?.message || "Falha ao interpretar mensagem com Gemini",
    );
  }

  const parsedOutput = safeParseJson(extractResponseText(responseBody));

  if (!parsedOutput) {
    throw new Error("Gemini retornou JSON invalido");
  }

  return {
    model: DEFAULT_GEMINI_MODEL,
    promptSummary: {
      session_intent: sessionState?.current_intent || null,
      available_categories: userContext?.categories?.length || 0,
      available_payment_methods: userContext?.payment_methods?.length || 0,
      available_payment_accounts: userContext?.payment_accounts?.length || 0,
    },
    output: parsedOutput,
  };
}
