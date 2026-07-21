/**
 * Tests for the Sunday Watchtower docid static-map lookup
 * + auto-resolution inside getSundayWatchtowerRow. Verifies
 * that:
 *   - the map returns the right docid for seeded weeks
 *   - unknown weeks return null (parent href stays as WOL meetings index)
 *   - invalid inputs (malformed ids, non-string, non-numeric) return null
 *   - explicit override (e.g. for tests) still wins
 */
import { describe, it, expect } from 'vitest';
import {
  getSundayWatchtowerDocid,
  getSundayWatchtowerRow,
  jwlibraryPublicationUrl,
} from './jwLibraryLinks';

const t = (k, dflt) => dflt ?? k;

describe('getSundayWatchtowerDocid (static-map)', () => {
  it('returns the seeded docid for 2026-W30', () => {
    expect(getSundayWatchtowerDocid('2026-W30')).toBe(2026402);
  });

  it('returns null for unseeded weeks', () => {
    expect(getSundayWatchtowerDocid('2026-W99')).toBeNull();
    expect(getSundayWatchtowerDocid('2099-W30')).toBeNull();
  });

  it('rejects malformed ISO-week strings', () => {
    expect(getSundayWatchtowerDocid('2026W30')).toBeNull();
    expect(getSundayWatchtowerDocid('W30')).toBeNull();
    expect(getSundayWatchtowerDocid('')).toBeNull();
    expect(getSundayWatchtowerDocid(null)).toBeNull();
    expect(getSundayWatchtowerDocid(undefined)).toBeNull();
    expect(getSundayWatchtowerDocid(2026402)).toBeNull();
  });

  it('accepts an override map (testability)', () => {
    const override = { '2026-W31': 2027200 };
    expect(getSundayWatchtowerDocid('2026-W31', override)).toBe(2027200);
    expect(getSundayWatchtowerDocid('2026-W30', override)).toBeNull();
  });
});

describe('getSundayWatchtowerRow auto-resolves docid', () => {
  it('returns the seeded 2026402 docid when today is in week 30', () => {
    const r = getSundayWatchtowerRow(new Date(2026, 6, 26, 14, 0), t);
    expect(r.docid).toBe(2026402);
    expect(r.jwlibraryUrl).toBe(
      `jwlibrary:///finder?wtlocale=E&docid=${jwlibraryPublicationUrl(2026402).split('docid=')[1]}`
    );
    // Canonical full URL — sanity check the formula matches `jwlibraryPublicationUrl`.
    expect(r.jwlibraryUrl).toBe('jwlibrary:///finder?wtlocale=E&docid=2026402');
    expect(r.finderUrl).toBe('https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&docid=2026402');
  });

  it('returns null docid when the current week is not in the static map', () => {
    // Sunday Aug 2 2026 = ISO week 31 of 2026 — unseeded.
    const r = getSundayWatchtowerRow(new Date(2026, 7, 2, 14, 0), t);
    expect(r.docid).toBeNull();
    expect(r.jwlibraryUrl).toBeNull();
    expect(r.finderUrl).toBeNull();
    // The parent href stays as the WOL meetings index fallback.
    expect(r.href).toBe('https://wol.jw.org/en/wol/meetings/r1/lp-e/2026/31');
    expect(r.studyWeek).toBe('2026-W31');
  });

  it('lets the explicit docid override the static map (forward seeding)', () => {
    // Caller passes a docid explicitly — that wins over the
    // static map (useful when you seed next week's value
    // mid-week, ahead of the upcoming Sunday).
    const r = getSundayWatchtowerRow(new Date(2026, 7, 2, 14, 0), t, 9999999);
    expect(r.docid).toBe(9999999);
    expect(r.jwlibraryUrl).toBe('jwlibrary:///finder?wtlocale=E&docid=9999999');
  });

  it('falls back to static-map docid when override is null', () => {
    const r = getSundayWatchtowerRow(new Date(2026, 6, 26, 14, 0), t, null);
    expect(r.docid).toBe(2026402);
  });
});
