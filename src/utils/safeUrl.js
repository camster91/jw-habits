/**
 * Safe URL helpers for share-target / window.open paths.
 *
 * Only http(s) URLs on known JW hosts are treated as trusted
 * destinations. Everything else is rejected so the Share page
 * cannot be used as an open redirect / phishing trampoline.
 */

const TRUSTED_HOST_SUFFIXES = [
  'jw.org',
  'jw-cdn.org',
  // Akamai CDN used by jw.org media (hostname ends with these).
];

/**
 * True when hostname is exactly a trusted host or a subdomain of one.
 * @param {string} hostname
 * @returns {boolean}
 */
export function isTrustedJwHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return TRUSTED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

/**
 * Parse and validate a user-supplied URL for opening in a new tab.
 * Returns a normalized absolute http(s) URL string, or null.
 *
 * @param {string} raw
 * @param {{ requireTrustedHost?: boolean }} [opts]
 * @returns {string | null}
 */
export function sanitizeOpenUrl(raw, opts = {}) {
  const requireTrustedHost = opts.requireTrustedHost !== false;
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }
  // Block credentials in URL (https://user:pass@evil…)
  if (parsed.username || parsed.password) return null;

  if (requireTrustedHost && !isTrustedJwHost(parsed.hostname)) {
    return null;
  }

  return parsed.href;
}

/**
 * Extract the first http(s) URL from free-form share text
 * (Android share_target often puts the link in `text` with empty `url`).
 * @param {string} text
 * @param {{ requireTrustedHost?: boolean }} [opts]
 * @returns {string | null}
 */
export function extractUrlFromText(text, opts = {}) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  if (!match) return null;
  // Strip trailing punctuation commonly glued onto shared URLs.
  const candidate = match[0].replace(/[),.;]+$/g, '');
  return sanitizeOpenUrl(candidate, opts);
}

/**
 * Same-origin relative path for SW / notification navigation.
 * Rejects protocol-relative (`//evil.com`) and absolute external URLs.
 * @param {unknown} raw
 * @param {string} [origin]
 * @returns {string}
 */
export function sanitizeSameOriginPath(raw, origin = self.location?.origin) {
  const fallback = '/';
  if (raw == null || raw === '') return fallback;
  const value = String(raw).trim();
  if (!value) return fallback;

  // Relative path only: must start with single slash, not //.
  if (value.startsWith('/') && !value.startsWith('//')) {
    // Disallow backslash tricks and null bytes.
    if (value.includes('\\') || value.includes('\0')) return fallback;
    return value;
  }

  try {
    const parsed = new URL(value, origin);
    if (parsed.origin !== origin) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
  } catch {
    return fallback;
  }
}
