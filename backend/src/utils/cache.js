import { getRedisClient, isRedisReady } from "../config/redis.js";

const ACTIVE_RANGE_TTL_SECONDS = 60;
const HISTORICAL_RANGE_TTL_SECONDS = 60 * 60 * 6;

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function getTodayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${padNumber(now.getMonth() + 1)}-${padNumber(now.getDate())}`;
}

function getMonthKey(dateString) {
  return typeof dateString === "string" && dateString.length >= 7
    ? dateString.slice(0, 7)
    : null;
}

function buildMonthVersionKey(userId, monthKey) {
  return `kip:entries:month-version:u:${userId}:${monthKey}`;
}

function normalizeFilterValue(value, fallback = "all") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function resolveRangeTtl(startDate, endDate) {
  if (!startDate || !endDate) {
    return null;
  }

  return endDate < getTodayDateString()
    ? HISTORICAL_RANGE_TTL_SECONDS
    : ACTIVE_RANGE_TTL_SECONDS;
}

function getRangeMonthKeys(startDate, endDate) {
  if (!startDate || !endDate) {
    return [];
  }

  const [startYear, startMonth] = startDate.split("-").map(Number);
  const [endYear, endMonth] = endDate.split("-").map(Number);

  if (!startYear || !startMonth || !endYear || !endMonth) {
    return [];
  }

  const months = [];
  let currentYear = startYear;
  let currentMonth = startMonth;

  while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
    months.push(`${currentYear}-${padNumber(currentMonth)}`);
    currentMonth += 1;

    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear += 1;
    }
  }

  return months;
}

async function getMonthVersionToken(userId, startDate, endDate) {
  const monthKeys = getRangeMonthKeys(startDate, endDate);

  if (monthKeys.length === 0 || !isRedisReady()) {
    return "no-version";
  }

  const redisClient = getRedisClient();

  try {
    const versionValues = await redisClient.mGet(
      monthKeys.map((monthKey) => buildMonthVersionKey(userId, monthKey)),
    );

    return monthKeys
      .map((monthKey, index) => `${monthKey}:${versionValues[index] ?? "0"}`)
      .join("|");
  } catch (error) {
    console.error("Redis month version read failed:", error.message);
    return "no-version";
  }
}

export async function buildEntriesCacheDescriptor({
  userId,
  type,
  startDate,
  endDate,
  page,
  limit,
}) {
  const ttl = resolveRangeTtl(startDate, endDate);

  if (!ttl || !isRedisReady()) {
    return null;
  }

  const monthVersionToken = await getMonthVersionToken(userId, startDate, endDate);

  return {
    key: [
      "kip:entries:list",
      `u:${userId}`,
      `type:${normalizeFilterValue(type)}`,
      `from:${startDate}`,
      `to:${endDate}`,
      `page:${page}`,
      `limit:${limit}`,
      `mv:${monthVersionToken}`,
    ].join(":"),
    ttl,
  };
}

export async function buildStatsCacheDescriptor({ userId, startDate, endDate }) {
  const ttl = resolveRangeTtl(startDate, endDate);

  if (!ttl || !isRedisReady()) {
    return null;
  }

  const monthVersionToken = await getMonthVersionToken(userId, startDate, endDate);

  return {
    key: [
      "kip:entries:stats",
      `u:${userId}`,
      `from:${startDate}`,
      `to:${endDate}`,
      `mv:${monthVersionToken}`,
    ].join(":"),
    ttl,
  };
}

export async function readJsonCache(key) {
  if (!isRedisReady()) {
    return null;
  }

  try {
    const rawValue = await getRedisClient().get(key);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    console.error("Redis cache read failed:", error.message);
    return null;
  }
}

export async function writeJsonCache(key, payload, ttl) {
  if (!isRedisReady()) {
    return false;
  }

  try {
    await getRedisClient().set(key, JSON.stringify(payload), {
      EX: ttl,
    });
    return true;
  } catch (error) {
    console.error("Redis cache write failed:", error.message);
    return false;
  }
}

export async function bumpEntryCacheVersions(userId, ...dateStrings) {
  if (!isRedisReady()) {
    return;
  }

  const monthKeys = [...new Set(dateStrings.map(getMonthKey).filter(Boolean))];

  if (monthKeys.length === 0) {
    return;
  }

  const redisClient = getRedisClient();
  const multi = redisClient.multi();

  for (const monthKey of monthKeys) {
    multi.incr(buildMonthVersionKey(userId, monthKey));
  }

  try {
    await multi.exec();
  } catch (error) {
    console.error("Redis cache invalidation failed:", error.message);
  }
}
