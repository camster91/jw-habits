import { describe, it, expect } from 'vitest';
import { repairStore } from './repair.js';
import { defaultStore, validateStore } from './store.js';

const base = () => ({ ...defaultStore('2026-09-01', 'en'), onboardingDone: true });

describe('repairStore (#315)', () => {
  it('drops only unreadable and duplicate check-ins', () => {
    const repaired = repairStore(
      {
        ...base(),
        log: [
          { routine: 'dailyText', day: '2026-10-01', value: true },
          { routine: 'dailyText', day: '2026-13-01', value: true },
          { routine: 'unknown', day: '2026-10-01', value: true },
          { routine: 'dailyText', day: '2026-10-01', value: true },
        ],
      },
      '2026-10-06',
      'en'
    );
    expect(repaired.store.log).toEqual([{ routine: 'dailyText', day: '2026-10-01', value: true }]);
    expect(repaired.droppedCheckIns).toBe(3);
    expect(repaired.reset).toEqual(['log']);
    expect(repaired.store.onboardingDone).toBe(true);
    expect(validateStore(repaired.store).ok).toBe(true);
  });

  it('resets one bad field and keeps the rest', () => {
    const repaired = repairStore(
      { ...base(), tone: 'loud', labels: { dailyText: 'Morning text' }, extra: 1 },
      '2026-10-06',
      'en'
    );
    expect(repaired.reset).toEqual(['tone']);
    expect(repaired.store.labels).toEqual({ dailyText: 'Morning text' });
    expect('extra' in repaired.store).toBe(false);
  });

  it('keeps valid schedule entries one by one', () => {
    const good = base();
    const schedule = [...good.schedule, { nonsense: true }];
    const repaired = repairStore({ ...good, schedule }, '2026-10-06', 'en');
    expect(repaired.store.schedule).toEqual(good.schedule);
    expect(repaired.reset).toEqual(['schedule']);
  });

  it('offers nothing for non-objects, newer versions or data with nothing readable', () => {
    expect(repairStore('text', '2026-10-06', 'en')).toBeNull();
    expect(repairStore([], '2026-10-06', 'en')).toBeNull();
    expect(repairStore({ ...base(), version: 99 }, '2026-10-06', 'en')).toBeNull();
    expect(repairStore({ log: 'x', tone: 5 }, '2026-10-06', 'en')).toBeNull();
  });
});
