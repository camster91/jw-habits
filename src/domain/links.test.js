import { describe, it, expect } from 'vitest';
import { linkLocale, routineLink } from './links.js';
import { defaultStore } from './store.js';

const store = (links = {}) => ({ ...defaultStore('2026-10-06', 'en'), links });
const psalms3 = { book: 19, chapter: 3 };

describe('linkLocale', () => {
  it('keeps en, es and fr by primary subtag', () => {
    expect(linkLocale('en')).toBe('en');
    expect(linkLocale('es-MX')).toBe('es');
    expect(linkLocale('fr_CA')).toBe('fr');
  });
  it('falls back to en for anything else', () => {
    expect(linkLocale('de')).toBe('en');
    expect(linkLocale('')).toBe('en');
    expect(linkLocale(undefined)).toBe('en');
  });
});

describe('routineLink', () => {
  it('gives the daily text page per locale', () => {
    expect(routineLink(store(), 'dailyText', 'en')).toBe('https://wol.jw.org/en/wol/dt/r1/lp-e');
    expect(routineLink(store(), 'dailyText', 'es')).toBe('https://wol.jw.org/es/wol/dt/r4/lp-s');
    expect(routineLink(store(), 'dailyText', 'fr-FR')).toBe(
      'https://wol.jw.org/fr/wol/dt/r30/lp-f'
    );
    expect(routineLink(store(), 'dailyText', 'de')).toBe('https://wol.jw.org/en/wol/dt/r1/lp-e');
  });

  it('gives the meetings page per locale', () => {
    expect(routineLink(store(), 'meetingPrep', 'en')).toBe(
      'https://wol.jw.org/en/wol/meetings/r1/lp-e'
    );
    expect(routineLink(store(), 'meetingPrep', 'es')).toBe(
      'https://wol.jw.org/es/wol/meetings/r4/lp-s'
    );
    expect(routineLink(store(), 'meetingPrep', 'fr')).toBe(
      'https://wol.jw.org/fr/wol/meetings/r30/lp-f'
    );
  });

  it("links Bible reading to the finder for the first of today's chapters", () => {
    expect(routineLink(store(), 'bibleReading', 'en', psalms3)).toBe(
      'https://www.jw.org/finder?wtlocale=E&prefer=lang&bible=19003001&pub=nwtsty'
    );
    expect(routineLink(store(), 'bibleReading', 'es', psalms3)).toBe(
      'https://www.jw.org/finder?wtlocale=S&prefer=lang&bible=19003001&pub=nwtsty'
    );
  });

  it('has no Bible link without a chapter', () => {
    expect(routineLink(store(), 'bibleReading', 'en')).toBeNull();
  });

  it('has no default link for the other routines', () => {
    for (const id of ['familyWorship', 'personalStudy', 'ministry']) {
      expect(routineLink(store(), id, 'en')).toBeNull();
    }
  });

  it("prefers the user's own link", () => {
    const s = store({
      dailyText: 'https://example.org/dt',
      familyWorship: 'https://example.org/f',
    });
    expect(routineLink(s, 'dailyText', 'en')).toBe('https://example.org/dt');
    expect(routineLink(s, 'familyWorship', 'en')).toBe('https://example.org/f');
  });

  it('ignores an empty or unsafe custom link', () => {
    expect(routineLink(store({ dailyText: '' }), 'dailyText', 'en')).toBe(
      'https://wol.jw.org/en/wol/dt/r1/lp-e'
    );
    expect(routineLink(store({ dailyText: 'javascript:alert(1)' }), 'dailyText', 'en')).toBe(
      'https://wol.jw.org/en/wol/dt/r1/lp-e'
    );
    expect(routineLink(store({ personalStudy: 'nope' }), 'personalStudy', 'en')).toBeNull();
  });
});
