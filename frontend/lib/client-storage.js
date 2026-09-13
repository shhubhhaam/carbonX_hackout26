const APP_PREFIX = "carbonx.";
const CACHE_PREFIX = `${APP_PREFIX}cache.`;

function canUseStorage() {
  return typeof window !== "undefined" && window.localStorage;
}

export function readStored(key, fallback = null) {
  if (!canUseStorage()) return fallback;
  try {
    const value = window.localStorage.getItem(`${APP_PREFIX}${key}`);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function writeStored(key, value) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(`${APP_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // Storage can be unavailable or full; the app continues without persistence.
  }
}

export function removeStored(key) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(`${APP_PREFIX}${key}`);
  } catch {
    // Ignore storage failures.
  }
}

export function readCached(key) {
  return readStored(`cache.${key}`);
}

export function writeCached(key, value) {
  writeStored(`cache.${key}`, value);
}

export function clearApiCache() {
  if (!canUseStorage()) return;
  try {
    const keys = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(CACHE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Ignore storage failures.
  }
}

export function clearCarbonXStorage() {
  if (!canUseStorage()) return;
  try {
    const keys = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(APP_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Ignore storage failures.
  }
}

export function analysisCacheKey(factoryId, periodStart, periodEnd) {
  return `cache.analysis.v2.${factoryId}.${periodStart}.${periodEnd}`;
}

// Shared with the dashboard's date-range picker so a CSV upload can point it
// at the period that was actually just ingested.
export const DASHBOARD_PERIOD_KEY = "dashboardPeriod";
