/**
 * The short line shown after a check-in. Lines live in en.json under
 * `fd.encourage.warm`; scripture references are data here, never verse text.
 */
import en from '../locales/en.json';

/** The warm lines (same array the UI reads through `t`), exported for tests. */
export const WARM_LINES = en.fd.encourage.warm;

/** Well-known encouraging verses, as references only. */
export const REFERENCES = [
  [1, 28, 15],
  [5, 31, 6],
  [6, 1, 9],
  [9, 12, 24],
  [19, 4, 8],
  [19, 16, 8],
  [19, 23, 1],
  [19, 27, 14],
  [19, 29, 11],
  [19, 34, 8],
  [19, 37, 5],
  [19, 46, 1],
  [19, 55, 22],
  [19, 86, 5],
  [19, 90, 12],
  [19, 91, 1],
  [19, 119, 105],
  [19, 121, 1],
  [19, 143, 8],
  [20, 3, 5],
  [20, 3, 6],
  [20, 4, 23],
  [20, 11, 25],
  [20, 15, 1],
  [20, 16, 3],
  [20, 17, 22],
  [20, 18, 10],
  [21, 3, 1],
  [21, 4, 9],
  [21, 9, 10],
  [23, 26, 3],
  [23, 12, 2],
  [23, 40, 29],
  [23, 40, 31],
  [23, 41, 10],
  [23, 41, 13],
  [23, 48, 17],
  [23, 55, 9],
  [24, 29, 11],
  [25, 3, 22],
  [33, 6, 8],
  [38, 4, 6],
  [40, 5, 3],
  [40, 6, 33],
  [40, 7, 7],
  [40, 11, 28],
  [40, 22, 37],
  [40, 24, 13],
  [40, 28, 20],
  [42, 11, 28],
  [43, 8, 32],
  [43, 13, 35],
  [43, 14, 27],
  [45, 8, 28],
  [45, 12, 12],
  [46, 15, 58],
  [47, 4, 16],
  [48, 6, 9],
  [49, 4, 32],
  [50, 4, 13],
  [51, 3, 23],
  [52, 5, 17],
  [52, 5, 11],
  [58, 4, 16],
  [59, 4, 8],
  [60, 5, 7],
].map(([book, chapter, verse]) => ({ book, chapter, verse }));

/**
 * @param {'quiet'|'warm'|'scripture'} tone
 * @param {number} seed integer; the pick is `seed mod length`, so it is deterministic
 * @param {(key: string, options?: object) => any} t
 * @returns {{text: string|null, ref: {book: number, chapter: number, verse: number}|null}}
 */
export function pickEncouragement(tone, seed, t) {
  if (tone !== 'warm' && tone !== 'scripture') return { text: null, ref: null };
  const translated = t('fd.encourage.warm', { returnObjects: true });
  const lines = Array.isArray(translated) && translated.length > 0 ? translated : WARM_LINES;
  const n = Math.trunc(seed) || 0;
  const at = (n, length) => ((n % length) + length) % length;
  const text = lines[at(n, lines.length)];
  const ref = tone === 'scripture' ? REFERENCES[at(n, REFERENCES.length)] : null;
  return { text, ref };
}
