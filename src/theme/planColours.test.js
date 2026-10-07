import { describe, it, expect } from 'vitest';
import { PLAN_COLOURS, planColour, planText } from './planColours.js';
import { PLAN_COLOURS as COUNT } from '../domain/store.js';

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

describe('PLAN_COLOURS', () => {
  it('has one colour per store colour index, all distinct', () => {
    expect(PLAN_COLOURS).toHaveLength(COUNT);
    expect(new Set(PLAN_COLOURS.map((c) => c.toLowerCase())).size).toBe(COUNT);
  });

  for (const [i, colour] of PLAN_COLOURS.entries()) {
    it(`${colour} carries white text at 4.5:1`, () => {
      expect(colour).toMatch(/^#[0-9a-f]{6}$/i);
      expect(contrast(colour, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    });

    for (const mode of ['light', 'dark']) {
      it(`${colour} as ${mode}-mode text reaches 4.5:1 on both backgrounds`, () => {
        const text = planText(i, mode);
        expect(text).toMatch(/^#[0-9a-f]{6}$/i);
        for (const bg of BACKGROUNDS[mode]) expect(contrast(text, bg)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('falls back to the first colour for an unknown index', () => {
    expect(planColour(99)).toBe(PLAN_COLOURS[0]);
    expect(planText(-1, 'dark')).toBe(planText(0, 'dark'));
  });
});
