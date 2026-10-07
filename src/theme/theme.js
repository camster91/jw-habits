import { safeSetItemQuiet } from '../utils/safeStorage.js';
/**
 * Theme and accent for the document. Accents are the six choices offered in
 * Settings; each gives at least 4.5:1 contrast with white text on top of it
 * (`--fd-accent`, for fills). Accent-coloured text uses `--fd-accent-text`, a
 * shade of the accent that reaches 4.5:1 on the current theme's backgrounds.
 */
export const ACCENTS = ['#4A6FA4', '#2E7D6B', '#7B5EA7', '#B5472F', '#9A5B13', '#B03A6E'];

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** base-100 and base-200 of each theme (index.css): text must read on both. */
const BACKGROUNDS = { light: ['#ffffff', '#f3f4f6'], dark: ['#1c1c1e', '#000000'] };
const MIN_CONTRAST = 4.5;

const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');

function luminance(hex) {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const readable = (hex, mode) => BACKGROUNDS[mode].every((bg) => contrast(hex, bg) >= MIN_CONTRAST);

/**
 * A colour as text in `mode`: unchanged when it already reads at 4.5:1 on both
 * of that theme's backgrounds, otherwise mixed toward black (light) or white
 * (dark) just far enough. Used for accents and plan colours alike.
 * @param {string} hex '#rrggbb'
 * @param {'light'|'dark'} mode
 */
export function textShade(hex, mode) {
  if (readable(hex, mode)) return hex;
  const target = mode === 'dark' ? 255 : 0;
  const rgb = channels(hex);
  for (let step = 1; step <= 100; step++) {
    const mixed = toHex(rgb.map((c) => c + ((target - c) * step) / 100));
    if (readable(mixed, mode)) return mixed;
  }
  return mode === 'dark' ? '#ffffff' : '#000000';
}

/**
 * The accent as text in `mode` (see `textShade`).
 * @param {number} index into ACCENTS (unknown falls back to the first)
 * @param {'light'|'dark'} mode
 */
export function accentText(index, mode) {
  return textShade(ACCENTS[index] ?? ACCENTS[0], mode);
}

/**
 * Set `data-theme`, `--fd-accent` and `--fd-accent-text` on <html> from the store.
 * @returns {() => void} stops following the system setting (a no-op unless the theme is 'system')
 */
export function applyTheme(store) {
  const root = document.documentElement;
  safeSetItemQuiet('fd-boot-theme', store.theme);

  root.style.setProperty('--fd-accent', ACCENTS[store.accent] ?? ACCENTS[0]);
  const set = (mode) => {
    root.setAttribute('data-theme', mode);
    const chrome = document.querySelector('meta[name="theme-color"]');
    if (chrome) chrome.content = mode === 'dark' ? '#000000' : '#f3f4f6';
    root.style.setProperty('--fd-accent-text', accentText(store.accent, mode));
  };

  if (store.theme !== 'system') {
    set(store.theme === 'dark' ? 'dark' : 'light');
    return () => {};
  }

  const query = window.matchMedia(DARK_QUERY);
  const sync = () => set(query.matches ? 'dark' : 'light');
  sync();
  query.addEventListener('change', sync);
  return () => query.removeEventListener('change', sync);
}
