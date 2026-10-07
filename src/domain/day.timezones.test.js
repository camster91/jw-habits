// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';

describe('03:00 local app-day contract across timezones', () => {
  it.each(['America/Toronto', 'America/Los_Angeles', 'Asia/Tokyo', 'Pacific/Auckland'])(
    'uses local wall-clock dates in %s, including year and DST boundaries',
    (zone) => {
      const script = `
        import { appDay, addDays } from './src/domain/day.js';
        const days = [
          appDay(new Date(2026, 9, 6, 0, 0)),
          appDay(new Date(2026, 9, 6, 2, 59)),
          appDay(new Date(2026, 9, 6, 3, 0)),
          appDay(new Date(2026, 9, 6, 20, 0)),
          appDay(new Date(2027, 0, 1, 2, 59)),
          appDay(new Date(2027, 0, 1, 3, 0)),
          appDay(new Date(2026, 2, 8, 1, 59)),
          appDay(new Date(2026, 2, 8, 3, 0)),
          appDay(new Date(2026, 10, 1, 1, 59)),
          appDay(new Date(2026, 10, 1, 3, 0)),
          addDays('2028-02-28', 1)
        ];
        console.log(JSON.stringify(days));
      `;
      const result = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
        env: { ...process.env, TZ: zone },
        encoding: 'utf8',
      });
      expect(JSON.parse(result)).toEqual([
        '2026-10-05',
        '2026-10-05',
        '2026-10-06',
        '2026-10-06',
        '2026-12-31',
        '2027-01-01',
        '2026-03-07',
        '2026-03-08',
        '2026-10-31',
        '2026-11-01',
        '2028-02-29',
      ]);
    }
  );
});
