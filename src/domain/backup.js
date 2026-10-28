/**
 * When the last backup counts as old. Shared by the monthly reminder line and
 * Settings' "last backup" nudge so both use one rule. Pure.
 */
export const BACKUP_STALE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * True when there is no usable backup: `lastExportAt` is null, not a parseable
 * date, in the future relative to `now`, or at least 30 days (30 * 24 h)
 * before `now`.
 * @param {string|null} lastExportAt ISO timestamp
 * @param {Date} now
 */
export function backupStale(lastExportAt, now) {
  if (typeof lastExportAt !== 'string') return true;
  const at = Date.parse(lastExportAt);
  if (Number.isNaN(at)) return true;
  const age = now.getTime() - at;
  return age < 0 || age >= BACKUP_STALE_DAYS * DAY_MS;
}
