/**
 * User-editable destination links.
 *
 * This module replaces the previous hard-coded map of external URLs.
 * The app ships with **no** organisation URLs baked in: every row's
 * destination comes from the user's own settings, and an unset slot
 * simply opens nothing.
 *
 * The shape is intentionally plain so it can be persisted directly in
 * localStorage alongside the other settings, and so a user can paste
 * any https URL they like.
 */

/**
 * The link slots a row may point at. Each is a stable key so existing
 * user settings survive future changes to labels.
 */
export const LINK_SLOTS = {
  primary: 'The main link for this row',
  secondary: 'An optional second link',
};

/**
 * Default link values. Deliberately empty — nothing is shipped.
 * @type {Record<string, string>}
 */
export const DEFAULT_LINKS = {
  primary: '',
  secondary: '',
};

/**
 * A URL is usable only when it is an absolute http(s) URL with no
 * embedded credentials. Anything else yields null so the row renders
 * as informational instead of opening a bad tab.
 *
 * @param {unknown} raw
 * @returns {string|null}
 */
export function resolveUserLink(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password) return null;
    if (!url.hostname) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Read the user's saved links, falling back to the empty defaults.
 *
 * @param {Record<string, unknown>|null|undefined} settings
 * @returns {{ primary: string|null, secondary: string|null }}
 */
export function userLinksFrom(settings) {
  const source = settings && typeof settings === 'object' ? settings.links : null;
  const links = source && typeof source === 'object' ? source : {};
  return {
    primary: resolveUserLink(links.primary),
    secondary: resolveUserLink(links.secondary),
  };
}
