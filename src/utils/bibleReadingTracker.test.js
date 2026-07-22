/**
 * Tests for the Bible reading tracker. Covers: idempotency,
 * add/remove, count, today-check.
 *
 * Dates use the Z suffix (UTC) so tests are timezone-safe.
 * The util uses `Date.toISOString().slice(0,10)` which is
 * UTC-based; if a test date were expressed in local time it
 * could roll over to the next UTC day on a host west of UTC.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  markBibleReadToday,
  unmarkBibleReadToday,
  bibleReadDaysCount,
  isTodayBibleRead,
} from './bibleReadingTracker';

describe('bibleReadingTracker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts at 0', () => {
    expect(bibleReadDaysCount()).toBe(0);
  });

  it('counts a marked day', () => {
    const n = markBibleReadToday(new Date('2026-07-01T12:00:00Z'));
    expect(n).toBe(1);
    expect(bibleReadDaysCount()).toBe(1);
  });

  it('is idempotent across duplicate marks on the same day', () => {
    markBibleReadToday(new Date('2026-07-01T08:00:00Z'));
    markBibleReadToday(new Date('2026-07-01T20:00:00Z'));
    expect(bibleReadDaysCount()).toBe(1);
  });

  it('counts distinct days independently', () => {
    markBibleReadToday(new Date('2026-06-29T12:00:00Z'));
    markBibleReadToday(new Date('2026-06-30T12:00:00Z'));
    markBibleReadToday(new Date('2026-07-01T12:00:00Z'));
    expect(bibleReadDaysCount()).toBe(3);
  });

  it('unmark decrements the count', () => {
    markBibleReadToday(new Date('2026-07-01T12:00:00Z'));
    markBibleReadToday(new Date('2026-06-30T12:00:00Z'));
    expect(bibleReadDaysCount()).toBe(2);
    unmarkBibleReadToday(new Date('2026-07-01T12:00:00Z'));
    expect(bibleReadDaysCount()).toBe(1);
  });

  it('unmark is a no-op when the day is not in the set', () => {
    unmarkBibleReadToday(new Date('2026-07-01T12:00:00Z'));
    expect(bibleReadDaysCount()).toBe(0);
  });

  it("isTodayBibleRead reflects today's state", () => {
    expect(isTodayBibleRead(new Date('2026-07-01T12:00:00Z'))).toBe(false);
    markBibleReadToday(new Date('2026-07-01T12:00:00Z'));
    expect(isTodayBibleRead(new Date('2026-07-01T23:59:00Z'))).toBe(true);
  });

  it('handles malformed localStorage gracefully', () => {
    localStorage.setItem('jw-bible-reading-days', '{not json');
    expect(bibleReadDaysCount()).toBe(0);
    // markBibleReadToday still works after a corrupt read.
    markBibleReadToday(new Date('2026-07-01T12:00:00Z'));
    expect(bibleReadDaysCount()).toBe(1);
  });
});
