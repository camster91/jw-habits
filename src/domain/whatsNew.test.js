import { describe, it, expect } from 'vitest';
import * as whatsNew from './whatsNew.js';

describe('whatsNewPageUrl', () => {
  it('maps locales and falls back to en', () => {
    expect(whatsNew.whatsNewPageUrl('en')).toBe('https://www.jw.org/en/whats-new/');
    expect(whatsNew.whatsNewPageUrl('es')).toBe('https://www.jw.org/es/lo-nuevo/');
    expect(whatsNew.whatsNewPageUrl('fr')).toBe('https://www.jw.org/fr/nouveautes/');
    expect(whatsNew.whatsNewPageUrl('de')).toBe('https://www.jw.org/en/whats-new/');
    expect(whatsNew.whatsNewPageUrl(undefined)).toBe('https://www.jw.org/en/whats-new/');
  });

  it('offers no feed fetching or parsing', () => {
    expect(Object.keys(whatsNew)).toEqual(['whatsNewPageUrl']);
  });
});
