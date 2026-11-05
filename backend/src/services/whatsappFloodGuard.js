import { getRedisClient, isRedisReady } from "../config/redis.js";
import { getWhatsAppFloodGuardConfig } from "../config/whatsapp.js";

/**
 * Protecao contra flood no canal do WhatsApp.
 *
 * Cada resposta enviada pelo KIP e uma mensagem de servico cobrada pela Meta
 * (apos 1.000/mes por numero, desde 01/10/2026), e mensagens que chegam ao
 * Gemini tambem geram custo. Este modulo limita quantas mensagens por numero
 * sao processadas e quantos avisos sao enviados.
 *
 * Usa Redis quando conectado (contadores compartilhados entre instancias) e
 * cai para memoria local caso contrario ou se o Redis falhar.
 */

const KEY_PREFIX = "kip:wa:guard";
const MEMORY_SWEEP_INTERVAL = 500;

const memoryStore = new Map();
let memoryOperations = 0;

function sweepMemoryStore(now) {
  memoryOperations += 1;

  if (memoryOperations % MEMORY_SWEEP_INTERVAL !== 0) {
    return;
  }

  for (const [key, item] of memoryStore) {
    if (item.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }
}

function memoryIncrement(key, ttlSeconds, now) {
  sweepMemoryStore(now);
  const current = memoryStore.get(key);

  if (!current || current.expiresAt <= now) {
    memoryStore.set(key, { count: 1, expiresAt: now + ttlSeconds * 1000 });
    return 1;
  }

  current.count += 1;
  return current.count;
}

function memoryAcquire(key, ttlSeconds, now) {
  sweepMemoryStore(now);
  const current = memoryStore.get(key);

  if (current && current.expiresAt > now) {
    return false;
  }

  memoryStore.set(key, { count: 1, expiresAt: now + ttlSeconds * 1000 });
  return true;
}

function getRedis() {
  return isRedisReady() ? getRedisClient() : null;
}

async function incrementCounter(key, ttlSeconds, now) {
  const redis = getRedis();

  if (redis) {
    try {
      const count = Number(await redis.sendCommand(["INCR", key]));

      if (count === 1) {
        await redis.sendCommand(["EXPIRE", key, String(ttlSeconds)]);
      }

      return count;
    } catch (error) {
      console.error("[WhatsApp flood guard] Redis INCR failed, using memory:", error.message);
    }
  }

  return memoryIncrement(key, ttlSeconds, now);
}

/** Retorna true apenas para o primeiro chamador dentro do TTL. */
async function acquireOnce(key, ttlSeconds, now) {
  const redis = getRedis();

  if (redis) {
    try {
      const result = await redis.sendCommand([
        "SET",
        key,
        "1",
        "NX",
        "EX",
        String(ttlSeconds),
      ]);
      return result === "OK";
    } catch (error) {
      console.error("[WhatsApp flood guard] Redis SET NX failed, using memory:", error.message);
    }
  }

  return memoryAcquire(key, ttlSeconds, now);
}

function phoneKey(phoneNumber) {
  return String(phoneNumber || "").replace(/\D/g, "") || "unknown";
}

/**
 * Registra uma mensagem recebida de um contato e diz se ela pode ser processada.
 * Janelas fixas de 1 min, 1 h e 1 dia.
 *
 * @returns {Promise<{allowed: boolean, notify: boolean, scope: string|null, retryAfterSeconds: number}>}
 */
export async function registerInboundMessage(phoneNumber, now = Date.now()) {
  const config = getWhatsAppFloodGuardConfig();

  if (!config.enabled) {
    return { allowed: true, notify: false, scope: null, retryAfterSeconds: 0 };
  }

  const phone = phoneKey(phoneNumber);
  const windows = [
    { scope: "minute", seconds: 60, limit: config.perMinute },
    { scope: "hour", seconds: 3600, limit: config.perHour },
    { scope: "day", seconds: 86400, limit: config.perDay },
  ];

  let exceeded = null;

  for (const window of windows) {
    const bucket = Math.floor(now / (window.seconds * 1000));
    const count = await incrementCounter(
      `${KEY_PREFIX}:rl:${window.scope}:${phone}:${bucket}`,
      window.seconds,
      now,
    );

    if (count > window.limit && !exceeded) {
      const windowEndsAt = (bucket + 1) * window.seconds * 1000;
      exceeded = {
        scope: window.scope,
        retryAfterSeconds: Math.max(1, Math.ceil((windowEndsAt - now) / 1000)),
      };
    }
  }

  if (!exceeded) {
    return { allowed: true, notify: false, scope: null, retryAfterSeconds: 0 };
  }

  const notify = await acquireOnce(
    `${KEY_PREFIX}:notice:ratelimit:${phone}`,
    config.noticeCooldownMinutes * 60,
    now,
  );

  return { allowed: false, notify, ...exceeded };
}

/**
 * Para numeros sem conta no KIP: responde no maximo uma vez por cooldown e
 * respeita um teto global por hora (protege contra flood vindo de muitos numeros).
 */
export async function shouldReplyToUnknownNumber(phoneNumber, now = Date.now()) {
  const config = getWhatsAppFloodGuardConfig();

  if (!config.enabled) {
    return true;
  }

  const firstInCooldown = await acquireOnce(
    `${KEY_PREFIX}:notice:unknown:${phoneKey(phoneNumber)}`,
    config.unknownReplyCooldownHours * 3600,
    now,
  );

  if (!firstInCooldown) {
    return false;
  }

  const hourBucket = Math.floor(now / 3_600_000);
  const globalCount = await incrementCounter(
    `${KEY_PREFIX}:unknown-global:${hourBucket}`,
    3600,
    now,
  );

  return globalCount <= config.unknownRepliesPerHour;
}

/** Aviso a contato cadastrado que ainda nao habilitou o WhatsApp no app. */
export async function shouldSendOptInNotice(phoneNumber, now = Date.now()) {
  const config = getWhatsAppFloodGuardConfig();

  if (!config.enabled) {
    return true;
  }

  return acquireOnce(
    `${KEY_PREFIX}:notice:optin:${phoneKey(phoneNumber)}`,
    config.unknownReplyCooldownHours * 3600,
    now,
  );
}

/** Aviso de "envie apenas texto" para audio, imagem, figurinha etc. */
export async function shouldSendUnsupportedNotice(phoneNumber, now = Date.now()) {
  const config = getWhatsAppFloodGuardConfig();

  if (!config.enabled) {
    return true;
  }

  return acquireOnce(
    `${KEY_PREFIX}:notice:unsupported:${phoneKey(phoneNumber)}`,
    config.unsupportedReplyCooldownMinutes * 60,
    now,
  );
}

/** Tipos de mensagem que nunca devem gerar resposta (evita custo sem valor). */
export function isSilentMessageType(message) {
  return message?.type === "reaction";
}

export function __resetFloodGuardMemory() {
  memoryStore.clear();
  memoryOperations = 0;
}
