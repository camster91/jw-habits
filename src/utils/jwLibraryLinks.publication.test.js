/**
 * Tests for jwlibraryPublicationUrl + getPublicationFinderUrl.
 * Verifies the docid-based publication schema documented in
 * the jwtalk.net thread, March 2025.
 */
import { describe, it, expect } from 'vitest';
import {
  jwlibraryPublicationUrl,
  getPublicationFinderUrl,
  getSundayWatchtowerRow,
} from './jwLibraryLinks';

const t = (key, dflt) => dflt ?? key;

describe('jwlibraryPublicationUrl', () => {
  it('produces the jwlibrary:///finder URL for a docid', () => {
    expect(jwlibraryPublicationUrl(2026402)).toBe('jwlibrary:///finder?wtlocale=E&docid=2026402');
  });

  it('produces the same for the midweek meeting workbook docid', () => {
    expect(jwlibraryPublicationUrl(202026243, 'E')).toBe(
      'jwlibrary:///finder?wtlocale=E&docid=202026243'
    );
  });

  it('accepts a custom locale code', () => {
    expect(jwlibraryPublicationUrl(2026402, 'S')).toBe(
      'jwlibrary:///finder?wtlocale=S&docid=2026402'
    );
  });

  it('returns null for empty/missing docid', () => {
    expect(jwlibraryPublicationUrl(null)).toBeNull();
    expect(jwlibraryPublicationUrl('')).toBeNull();
    expect(jwlibraryPublicationUrl(undefined)).toBeNull();
  });

  it('coerces numeric docid to string safely', () => {
    expect(jwlibraryPublicationUrl('202026243')).toBe(
      'jwlibrary:///finder?wtlocale=E&docid=202026243'
    );
  });
});

describe('getPublicationFinderUrl', () => {
  it('returns the canonical finder URL with the deep-link convention', () => {
    expect(getPublicationFinderUrl(2026402)).toBe(
      'https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&docid=2026402'
    );
  });

  it('returns null for missing docid', () => {
    expect(getPublicationFinderUrl(null)).toBeNull();
    expect(getPublicationFinderUrl('')).toBeNull();
  });
});

describe('getSundayWatchtowerRow with docid', () => {
  it('returns jwlibraryUrl + finderUrl when a docid is supplied', () => {
    const r = getSundayWatchtowerRow(new Date(2026, 6, 26, 14, 0), t, 2026402);
    expect(r.docid).toBe(2026402);
    expect(r.jwlibraryUrl).toBe('jwlibrary:///finder?wtlocale=E&docid=2026402');
    expect(r.finderUrl).toBe(
      'https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&docid=2026402'
    );
  });

  it('returns null URLs for weeks not in the static docid map', () => {
    // Sun Aug 2 2026 = ISO week 31 — not seeded in the static
    // map. Use this date instead of a seeded week so the
    // helper's "no docid seeded" path stays testable.
    const r = getSundayWatchtowerRow(new Date(2026, 7, 2, 14, 0), t);
    expect(r.docid).toBeNull();
    expect(r.jwlibraryUrl).toBeNull();
    expect(r.finderUrl).toBeNull();
    // The non-publication href is still set to the WOL meetings index.
    expect(r.href).toBe('https://wol.jw.org/en/wol/meetings/r1/lp-e/2026/31');
  });
});
