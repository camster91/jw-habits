import { safeGetItem, safeSetItemQuiet, safeRemoveItem } from './safeStorage.js';
const KEY = 'jw-error-logs';
const RETENTION = 7 * 24 * 60 * 60 * 1000;
const TYPES = new Set(['uncaught_exception', 'unhandled_rejection', 'component']);

/** Never store messages, stack traces, query strings, identifiers or user agents. */
export function pruneDiagnostics(now = Date.now()) {
  let entries;
  try {
    entries = JSON.parse(safeGetItem(KEY) || '[]');
  } catch {
    entries = [];
  }
  const kept = Array.isArray(entries)
    ? entries
        .filter((e) => {
          const timestamp = Date.parse(e?.timestamp);
          return Number.isFinite(timestamp) && timestamp <= now && timestamp >= now - RETENTION;
        })
        .slice(-20)
        .map((e) => ({ timestamp: e.timestamp, type: TYPES.has(e.type) ? e.type : 'component' }))
    : [];
  safeSetItemQuiet(KEY, JSON.stringify(kept));
  return kept;
}
export function recordDiagnostic(type, now = Date.now()) {
  const entries = pruneDiagnostics(now);
  entries.push({
    timestamp: new Date(now).toISOString(),
    type: TYPES.has(type) ? type : 'component',
  });
  safeSetItemQuiet(KEY, JSON.stringify(entries.slice(-20)));
}
export function clearDiagnostics() {
  return safeRemoveItem(KEY);
}
