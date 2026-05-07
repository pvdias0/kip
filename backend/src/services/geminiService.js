const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const INTENTS = [
  "help",
  "unknown",
  "get_entries",
  "create_entry",
  "update_entry",
  "delete_entry",
  "list_categories",
  "create_category",
  "update_category",
  "delete_category",
  "list_payment_methods",
  "create_payment_method",
  "update_payment_method",
  "delete_payment_method",
  "list_payment_accounts",
  "create_payment_account",
  "update_payment_account",
  "delete_payment_account",
];

const SLOT_FIELDS = [
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
  "reference_text",
  "reference_index",
  "new_name",
];

const INTENT_SCHEMA = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: INTENTS,
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
        reference_text: { type: ["string", "null"] },
        reference_index: { type: ["number", "null"] },
        new_name: { type: ["string", "null"] },
      },
      required: SLOT_FIELDS,
      additionalProperties: false,
    },
    missing_fields: {
      type: "array",
      items: {
        type: "string",
        enum: SLOT_FIELDS,
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
  const recentContext = {
    recent_entries: sessionState?.slot_state_json?.recent_entries || [],
    recent_categories: sessionState?.slot_state_json?.recent_categories || [],
    recent_payment_methods: sessionState?.slot_state_json?.recent_payment_methods || [],
    recent_payment_accounts: sessionState?.slot_state_json?.recent_payment_accounts || [],
  };

  return `
Voce e o interpretador estruturado do KIP para mensagens recebidas no WhatsApp.
Sua tarefa e entender a intencao do usuario e preencher os campos necessarios para o backend executar a acao.

Data atual local: ${nowDate}

Intents suportadas:
- help
- unknown
- get_entries
- create_entry
- update_entry
- delete_entry
- list_categories
- create_category
- update_category
- delete_category
- list_payment_methods
- create_payment_method
- update_payment_method
- delete_payment_method
- list_payment_accounts
- create_payment_account
- update_payment_account
- delete_payment_account

Regras gerais:
- Nao invente dados que o usuario nao informou.
- Se o usuario estiver respondendo uma pergunta anterior, combine a nova mensagem com o estado atual da sessao.
- Quando o usuario se referir a algo como "essa transacao", "a primeira", "a ultima", "essa conta" ou "essa categoria", use reference_text e/ou reference_index.
- reference_index deve ser numerico quando o usuario falar um numero da lista.
- reference_text deve guardar a referencia livre como "essa transacao", "ultima", "de gasolina" ou similar.
- new_name so deve ser usado quando o usuario quiser renomear uma categoria, conta ou forma de pagamento.
- O usuario pode misturar portugues com ingles em comandos curtos como "delete essa transacao", "edita a categoria 2" ou "list payment methods".

Regras por intent:
- Para create_entry:
  - type deve ser income ou expense.
  - amount deve ser numero.
  - description deve ser curta e objetiva.
  - date deve ser YYYY-MM-DD quando a data estiver clara. Se o usuario falar agora/hoje, use a data atual.
  - category_name e opcional.
  - payment_method_name e obrigatorio para executar.
  - payment_account_name so e obrigatorio se a forma de pagamento usar contas.
- Para update_entry:
  - identifique a transacao usando reference_text e/ou reference_index.
  - preencha apenas os campos novos que o usuario quer alterar.
  - se o usuario disser "delete essa transacao" ou "apaga essa transacao", isso e delete_entry, nao update_entry.
- Para delete_entry:
  - identifique a transacao usando reference_text e/ou reference_index.
- Para get_entries:
  - se houver periodo claro, preencha start_date e end_date em YYYY-MM-DD.
  - se o usuario disser hoje, semana, mes atual ou mes especifico, converta para datas.
  - type pode ser null quando quiser todas as transacoes.
- Para categorias:
  - create_category usa category_name.
  - update_category usa category_name para a categoria atual e new_name para o novo nome.
  - delete_category usa category_name, reference_text ou reference_index.
- Para formas de pagamento:
  - create_payment_method usa payment_method_name e accounts_enabled.
  - update_payment_method usa payment_method_name para a atual, new_name se houver renomeacao e accounts_enabled se houver mudanca.
  - delete_payment_method usa payment_method_name, reference_text ou reference_index.
- Para contas de pagamento:
  - create_payment_account usa payment_account_name e payment_method_name se o usuario quiser vincular a uma forma existente.
  - update_payment_account usa payment_account_name para a conta atual e new_name para o novo nome.
  - delete_payment_account usa payment_account_name, reference_text ou reference_index.
- Quando a mensagem nao estiver no escopo financeiro/CRUD do KIP, use unknown.

Contexto do usuario:
${JSON.stringify(userContext)}

Estado atual da sessao:
${JSON.stringify(sessionState || {})}

Contexto recente da conversa:
${JSON.stringify(recentContext)}

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
      recent_entries: sessionState?.slot_state_json?.recent_entries?.length || 0,
      recent_categories: sessionState?.slot_state_json?.recent_categories?.length || 0,
      recent_payment_methods:
        sessionState?.slot_state_json?.recent_payment_methods?.length || 0,
      recent_payment_accounts:
        sessionState?.slot_state_json?.recent_payment_accounts?.length || 0,
    },
    output: parsedOutput,
  };
}
