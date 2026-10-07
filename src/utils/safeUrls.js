/**
 * URL allowlisting helpers for share-target + notification navigation.
 * Prefer parsing with the URL constructor over string prefix checks so
 * `javascript:`, `data:`, and credentialed URLs are rejected.
 */

/**
 * Hosts the share-target "Open Link" button may navigate to.
 *
 * Empty by default: the app ships no allowlisted third party, so a shared
 * link can only be opened if the user explicitly saved that host as one of
 * their own link slots. Hosts are matched exactly (plus their subdomains).
 *
 * @type {Set<string>}
 */
const SHARE_ALLOWED_HOSTS = new Set();

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
 * Share-target open: safe http(s) AND the hostname is one the caller
 * explicitly allows.
 *
 * Blocks phishing assists via OS share -> arbitrary external site. With no
 * hosts passed, nothing is allowed, which is the shipped default.
 *
 * @param {string} raw
 * @param {Iterable<string>} [allowedHosts] extra hosts to permit
 * @returns {boolean}
 */
export function isAllowedShareUrl(raw, allowedHosts) {
  if (!isSafeHttpUrl(raw)) return false;
  const allowed = new Set([...SHARE_ALLOWED_HOSTS, ...(allowedHosts || [])]);
  if (allowed.size === 0) return false;
  try {
    const host = new URL(raw.trim()).hostname.toLowerCase();
    if (allowed.has(host)) return true;
    // Also permit subdomains of an allowed host, matched on a dot boundary
    // so "evilexample.com" can never satisfy an allowance for "example.com".
    for (const entry of allowed) {
      if (host.endsWith('.' + entry)) return true;
    }
    return false;
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
