/**
 * Theme and accent for the document. Accents are the six choices offered in
 * Settings; each gives at least 4.5:1 contrast with white text on top of it.
 */
export const ACCENTS = ['#4A6FA4', '#2E7D6B', '#7B5EA7', '#B5472F', '#9A5B13', '#B03A6E'];

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Set `data-theme` and `--fd-accent` on <html> from the store.
 * @returns {() => void} stops following the system setting (a no-op unless the theme is 'system')
 */
export function applyTheme(store) {
  const root = document.documentElement;
  root.style.setProperty('--fd-accent', ACCENTS[store.accent] ?? ACCENTS[0]);

  if (store.theme !== 'system') {
    root.setAttribute('data-theme', store.theme === 'dark' ? 'dark' : 'light');
    return () => {};
  }

  const query = window.matchMedia(DARK_QUERY);
  const sync = () => root.setAttribute('data-theme', query.matches ? 'dark' : 'light');
  sync();
  query.addEventListener('change', sync);
  return () => query.removeEventListener('change', sync);
}
