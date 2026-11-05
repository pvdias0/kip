const DEFAULT_WHATSAPP_API_BASE_URL = "https://graph.facebook.com/v23.0";

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function readPositiveInt(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function getWhatsAppFloodGuardConfig() {
  return {
    enabled:
      (process.env.WHATSAPP_FLOOD_GUARD_ENABLED || "true").trim().toLowerCase() !==
      "false",
    perMinute: readPositiveInt("WHATSAPP_RATE_LIMIT_PER_MINUTE", 12),
    perHour: readPositiveInt("WHATSAPP_RATE_LIMIT_PER_HOUR", 120),
    perDay: readPositiveInt("WHATSAPP_RATE_LIMIT_PER_DAY", 400),
    noticeCooldownMinutes: readPositiveInt(
      "WHATSAPP_RATE_LIMIT_NOTICE_COOLDOWN_MINUTES",
      30,
    ),
    unknownReplyCooldownHours: readPositiveInt(
      "WHATSAPP_UNKNOWN_REPLY_COOLDOWN_HOURS",
      24,
    ),
    unknownRepliesPerHour: readPositiveInt("WHATSAPP_UNKNOWN_REPLIES_PER_HOUR", 60),
    unsupportedReplyCooldownMinutes: readPositiveInt(
      "WHATSAPP_UNSUPPORTED_REPLY_COOLDOWN_MINUTES",
      60,
    ),
    maxMessageLength: readPositiveInt("WHATSAPP_MAX_MESSAGE_LENGTH", 1000),
  };
}

export function getWhatsAppConfig() {
  const replyWindowHours = Number.parseInt(
    process.env.WHATSAPP_REPLY_WINDOW_HOURS || "24",
    10,
  );
  const assistantMaxEntries = Number.parseInt(
    process.env.WHATSAPP_ASSISTANT_MAX_ENTRIES || "5",
    10,
  );

  return {
    apiBaseUrl: trimTrailingSlash(
      process.env.WHATSAPP_API_BASE_URL || DEFAULT_WHATSAPP_API_BASE_URL,
    ),
    wabaId: process.env.WHATSAPP_WABA_ID?.trim() || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "",
    businessPhoneNumber: process.env.WHATSAPP_BUSINESS_PHONE_NUMBER?.trim() || "",
    appId: process.env.WHATSAPP_APP_ID?.trim() || "",
    appSecret: process.env.WHATSAPP_APP_SECRET?.trim() || "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || "",
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() || "",
    businessPin: process.env.WHATSAPP_BUSINESS_PIN?.trim() || "",
    webhookCallbackUrl: process.env.WHATSAPP_WEBHOOK_CALLBACK_URL?.trim() || "",
    assistantEnabled:
      (process.env.WHATSAPP_ASSISTANT_ENABLED || "true").trim().toLowerCase() !==
      "false",
    replyWindowHours:
      Number.isInteger(replyWindowHours) && replyWindowHours > 0
        ? replyWindowHours
        : 24,
    assistantMaxEntries:
      Number.isInteger(assistantMaxEntries) && assistantMaxEntries > 0
        ? assistantMaxEntries
        : 5,
  };
}

export function isWhatsAppConfigured() {
  const config = getWhatsAppConfig();

  return Boolean(
    config.wabaId &&
      config.phoneNumberId &&
      config.businessPhoneNumber &&
      config.appId &&
      config.appSecret &&
      config.accessToken &&
      config.webhookVerifyToken &&
      config.businessPin &&
      config.webhookCallbackUrl,
  );
}
