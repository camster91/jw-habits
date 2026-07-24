/** Hosts we will open from the OS share_target. Blocks phishing via arbitrary URLs. */
const ALLOWED_SHARE_HOSTS = new Set(['jw.org', 'www.jw.org', 'wol.jw.org', 'jwhabits.ashbi.ca']);

/**
 * Validate a share-target URL. Only http(s) against an allowlist of
 * JW-related hosts. Returns a normalized href or null.
 */
export function sanitizeShareUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let parsed;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'https:' && protocol !== 'http:') return null;
  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_SHARE_HOSTS.has(host) && !host.endsWith('.jw.org')) return null;
  // Block credentials in URL (user:pass@host)
  if (parsed.username || parsed.password) return null;
  return parsed.href;
}
