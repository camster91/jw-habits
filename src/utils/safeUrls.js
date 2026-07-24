/**
 * URL allowlisting helpers for share-target + notification navigation.
 * Prefer parsing with the URL constructor over string prefix checks so
 * `javascript:`, `data:`, and credentialed URLs are rejected.
 */

/**
 * True when `raw` is an absolute http(s) URL without embedded credentials.
 * @param {string} raw
 * @returns {boolean}
 */
export function isSafeHttpUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return false;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    if (url.username || url.password) return false;
    return Boolean(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Restrict navigation targets to same-origin relative paths.
 * Absolute same-origin URLs are rewritten to path+search+hash.
 * Anything else falls back to `/`.
 * @param {unknown} raw
 * @param {string} [origin] - defaults to window/self location origin when available
 * @returns {string}
 */
export function toSameOriginPath(raw, origin) {
  if (typeof raw !== 'string' || !raw) return '/';
  // Block backslash host tricks before any URL parsing.
  if (raw.includes('\\')) return '/';
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    return raw;
  }
  const base =
    origin ||
    (typeof self !== 'undefined' && self.location?.origin) ||
    (typeof window !== 'undefined' && window.location?.origin) ||
    '';
  if (!base) return '/';
  try {
    const url = new URL(raw, base);
    if (url.origin !== base) return '/';
    return `${url.pathname}${url.search}${url.hash}` || '/';
  } catch {
    return '/';
  }
}
