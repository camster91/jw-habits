import { describe, it, expect } from 'vitest';
import { ACCENTS, accentText } from './theme.js';

// WCAG 2 relative luminance and contrast ratio, written out independently of theme.js.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// base-100 and base-200 of each DaisyUI theme in index.css.
const BACKGROUNDS = { light: ['#ffffff', '#f3f4f6'], dark: ['#1c1c1e', '#000000'] };

describe('accentText', () => {
  for (const mode of ['light', 'dark']) {
    for (const [i, accent] of ACCENTS.entries()) {
      it(`${accent} as ${mode}-mode text reaches 4.5:1 on both backgrounds`, () => {
        const text = accentText(i, mode);
        expect(text).toMatch(/^#[0-9a-f]{6}$/i);
        for (const bg of BACKGROUNDS[mode]) expect(contrast(text, bg)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('keeps an accent that already passes in light mode unchanged', () => {
    expect(accentText(0, 'light').toLowerCase()).toBe(ACCENTS[0].toLowerCase());
    expect(accentText(5, 'light').toLowerCase()).toBe(ACCENTS[5].toLowerCase());
  });

  it('darkens in light mode and lightens in dark mode', () => {
    expect(luminance(accentText(1, 'light'))).toBeLessThan(luminance(ACCENTS[1]));
    for (const [i, accent] of ACCENTS.entries()) {
      expect(luminance(accentText(i, 'dark'))).toBeGreaterThan(luminance(accent));
    }
  });

  it('falls back to the first accent for an unknown index', () => {
    expect(accentText(99, 'dark')).toBe(accentText(0, 'dark'));
  });
});
