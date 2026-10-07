import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDiagnostics, pruneDiagnostics, recordDiagnostic } from './diagnostics.js';
const NOW = Date.parse('2026-10-07T12:00:00Z');
beforeEach(() => localStorage.clear());
describe('local diagnostics', () => {
  it('strips legacy sensitive fields and expires stale, malformed and future entries', () => {
    localStorage.setItem(
      'jw-error-logs',
      JSON.stringify([
        {
          timestamp: '2026-10-06T12:00:00Z',
          type: 'component',
          message: 'private note',
          stack: '/?secret=x',
          userAgent: 'device',
        },
        { timestamp: '2026-09-01T12:00:00Z', type: 'component' },
        { timestamp: '2026-10-08T12:00:00Z', type: 'component' },
        { timestamp: 'invalid' },
        null,
      ])
    );
    expect(pruneDiagnostics(NOW)).toEqual([
      { timestamp: '2026-10-06T12:00:00Z', type: 'component' },
    ]);
    expect(localStorage.getItem('jw-error-logs')).not.toMatch(/private|secret|device|stack/);
  });
  it('caps history at 20 categories and lets the user clear it', () => {
    for (let i = 0; i < 30; i++) recordDiagnostic('uncaught_exception', NOW + i);
    expect(JSON.parse(localStorage.getItem('jw-error-logs'))).toHaveLength(20);
    clearDiagnostics();
    expect(localStorage.getItem('jw-error-logs')).toBeNull();
  });
});

it('survives malformed storage and a failed diagnostic write without leaking an alert', () => {
  localStorage.setItem('jw-error-logs', '{ broken');
  const event = vi.spyOn(window, 'dispatchEvent');
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new Error('full');
  });
  try {
    expect(() => recordDiagnostic('component', NOW)).not.toThrow();
    expect(pruneDiagnostics(NOW)).toEqual([]);
    expect(event).not.toHaveBeenCalled();
  } finally {
    write.mockRestore();
    event.mockRestore();
  }
});
