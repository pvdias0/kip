import "./env.js";

let redisClient = null;
let redisModulePromise = null;

function getRedisUrl() {
  const value = process.env.REDIS_URL;
  return typeof value === "string" ? value.trim() : "";
}

export function isRedisConfigured() {
  return getRedisUrl().length > 0;
}

export function getRedisClient() {
  return redisClient;
}

export function isRedisReady() {
  return Boolean(redisClient?.isOpen);
}

async function loadRedisModule() {
  if (!redisModulePromise) {
    redisModulePromise = import("redis");
  }

  return redisModulePromise;
}

export async function connectRedis() {
  if (!isRedisConfigured()) {
    console.log("Redis disabled: REDIS_URL is not configured.");
    return null;
  }

  if (!redisClient) {
    let createClient;

    try {
      ({ createClient } = await loadRedisModule());
    } catch (error) {
      console.error("Redis disabled: package 'redis' is not installed.");
      return null;
    }

    redisClient = createClient({
      url: getRedisUrl(),
    });

    redisClient.on("error", (error) => {
      console.error("Redis error:", error.message);
    });

    redisClient.on("reconnecting", () => {
      console.warn("Redis reconnecting...");
    });
  }

  if (redisClient.isOpen) {
    return redisClient;
  }

  try {
    await redisClient.connect();
    console.log("Redis connected successfully.");
    return redisClient;
  } catch (error) {
    console.error("Redis connection failed:", error.message);
    return null;
  }
}
