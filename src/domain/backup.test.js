import { describe, it, expect } from 'vitest';
import { backupStale } from './backup.js';

const NOW = new Date('2026-11-01T08:00:00Z');
const ago = (ms) => new Date(NOW.getTime() - ms).toISOString();
const H = 60 * 60 * 1000;

describe('backupStale', () => {
  it('is true with no backup or an unusable value', () => {
    expect(backupStale(null, NOW)).toBe(true);
    expect(backupStale(undefined, NOW)).toBe(true);
    expect(backupStale('not a date', NOW)).toBe(true);
    expect(backupStale('', NOW)).toBe(true);
  });
  it('is true for a backup in the future', () => {
    expect(backupStale(ago(-24 * H), NOW)).toBe(true);
  });
  it('is false for a recent backup, including one a moment ago and now', () => {
    expect(backupStale(ago(5 * 24 * H), NOW)).toBe(false);
    expect(backupStale(ago(0), NOW)).toBe(false);
  });
  it('turns true at exactly 30 days', () => {
    expect(backupStale(ago(30 * 24 * H - 1), NOW)).toBe(false);
    expect(backupStale(ago(30 * 24 * H), NOW)).toBe(true);
    expect(backupStale(ago(31 * 24 * H), NOW)).toBe(true);
  });
});
