/**
 * jw.org finder links: JW Library opens these when it is installed (wol.jw.org
 * links never open it). URLs only; nothing from jw.org is fetched or kept.
 */

const WTLOCALE = { en: 'E', es: 'S', fr: 'F' };

/**
 * The daily-text finder link for a day.
 * @param {'en'|'es'|'fr'} locale
 * @param {string} day 'YYYY-MM-DD' (the app day)
 */
export function dailyTextUrl(locale, day) {
  const wt = WTLOCALE[locale] ?? WTLOCALE.en;
  const date = String(day).replaceAll('-', '');
  return `https://www.jw.org/finder?srcid=jwlshare&wtlocale=${wt}&prefer=lang&alias=daily-text&date=${date}`;
}

function parse(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** True for an https jw.org finder link (the kind JW Library opens). */
export function isJwFinderLink(url) {
  const u = typeof url === 'string' ? parse(url) : null;
  if (!u || u.protocol !== 'https:') return false;
  if (u.hostname !== 'www.jw.org' && u.hostname !== 'jw.org') return false;
  return u.pathname === '/finder' || u.pathname.startsWith('/finder/');
}

/** "Opens in JW Library" for finder links, otherwise the host. */
export function linkLabel(url, t) {
  if (isJwFinderLink(url)) return t('fd.links.opensInLibrary');
  return parse(url)?.hostname ?? '';
}
