/**
 * Property-style check: whatever the UI and the domain writers do to the
 * store, the result still passes `validateStore` (so it would load again on
 * the next launch instead of being set aside as corrupt). The UI parts poke
 * every control on a screen with several values each; the domain part runs
 * seeded random sequences of the writers Today uses.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useCallback, useMemo, useState } from 'react';
// eslint-disable-next-line no-unused-vars -- used via JSX
import { StoreContext } from './data/useStore.js';
import { addDays } from './domain/day.js';
import { portionSize } from './domain/bible.js';
import { ROUTINE_IDS } from './domain/routines.js';
import { withScheduleChange } from './domain/schedule.js';
import {
  addCheckIn,
  defaultStore,
  exportJson,
  importJson,
  removeCheckIn,
  validateStore,
} from './domain/store.js';
import { setChaptersRead, setMinistry } from './domain/today.js';
import { applyFeed } from './domain/whatsNew.js';
import { migrateV1 } from './domain/migrateV1.js';
// eslint-disable-next-line no-unused-vars -- used via JSX
import Onboarding from './screens/onboarding/Onboarding.jsx';
// eslint-disable-next-line no-unused-vars -- used via JSX
import SettingsSheet from './screens/SettingsSheet.jsx';
// eslint-disable-next-line no-unused-vars -- used via JSX
import Today from './screens/Today.jsx';

vi.mock('./utils/native.js', () => ({ isNative: false, haptics: { success: vi.fn() } }));
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: { requestPermissions: vi.fn(() => Promise.resolve({})) },
}));
vi.mock('@capacitor/core', async (importOriginal) => ({
  ...(await importOriginal()),
  CapacitorHttp: { get: vi.fn() },
}));

const TODAY = '2026-10-06';

/** The UI sweeps fire thousands of events through jsdom; a slow CI runner needs room. */
const UI_SWEEP_TIMEOUT = 30000;

/** Every store `update` produces, validated. */
let results;

function failures() {
  return results.filter((r) => !r.ok);
}

// eslint-disable-next-line no-unused-vars -- used via JSX
function Harness({ initial, children }) {
  const [store, setStore] = useState(initial);
  const update = useCallback(
    (fn) =>
      setStore((s) => {
        const next = fn(s);
        results.push(validateStore(next));
        return next;
      }),
    []
  );
  const value = useMemo(() => ({ store, update, today: TODAY }), [store, update]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

const TEXT_VALUES = ['Morning', '   ', 'x'.repeat(80), 'https://example.org/a', 'javascript:x', ''];
const NUMBER_VALUES = ['12.5', '-3', '1e9', 'abc', '0', ''];
const TIME_VALUES = ['06:45', '23:59', ''];

/** Buttons that leave the screen, open files or navigate steps; never poked. */
const SKIP =
  /^(Close|Export a backup|Import a backup|Back|Next|Start my first day|Get started|Skip)/;

/** Change every input and select through several values; click every other button. */
function pokeAll(root) {
  for (const b of [...root.querySelectorAll('button')]) {
    const name = b.getAttribute('aria-label') ?? b.textContent;
    if (name.startsWith('Rename')) fireEvent.click(b);
  }
  for (const el of [...root.querySelectorAll('input, select')]) {
    if (!el.isConnected) continue;
    if (el.tagName === 'SELECT') {
      for (const o of [...el.options]) fireEvent.change(el, { target: { value: o.value } });
    } else if (el.type === 'checkbox' || el.type === 'radio') {
      fireEvent.click(el);
      if (el.type === 'checkbox' && el.isConnected) fireEvent.click(el);
    } else if (el.type === 'time') {
      for (const v of TIME_VALUES) fireEvent.change(el, { target: { value: v } });
    } else if (el.type === 'number' || el.inputMode === 'numeric') {
      for (const v of NUMBER_VALUES) fireEvent.change(el, { target: { value: v } });
      fireEvent.blur(el);
    } else if (el.type !== 'file') {
      for (const v of TEXT_VALUES) {
        fireEvent.change(el, { target: { value: v } });
        fireEvent.blur(el);
      }
    }
  }
  for (const b of [...root.querySelectorAll('button')]) {
    const name = b.getAttribute('aria-label') ?? b.textContent;
    if (!b.isConnected || b.disabled || SKIP.test(name.trim())) continue;
    fireEvent.click(b);
  }
}

beforeEach(() => {
  results = [];
  window.open = vi.fn();
  sessionStorage.clear();
});

describe('UI writers keep the store valid', () => {
  for (const finish of ['Next', 'Skip — use defaults']) {
    it(
      `onboarding: every control on every step, then "${finish}" each time`,
      () => {
        render(
          <Harness initial={defaultStore(TODAY, 'en')}>
            <Onboarding />
          </Harness>
        );
        fireEvent.click(screen.getByRole('button', { name: 'Get started' }));
        for (let step = 2; step <= 6; step++) {
          pokeAll(screen.getByTestId('onboarding'));
          const label = step === 6 && finish === 'Next' ? 'Start my first day' : finish;
          fireEvent.click(screen.getByRole('button', { name: label }));
        }
        expect(results).toHaveLength(1); // the single commit
        expect(failures()).toEqual([]);
      },
      UI_SWEEP_TIMEOUT
    );
  }

  it(
    'settings: every control in the sheet',
    () => {
      const initial = { ...defaultStore('2026-09-01', 'en'), onboardingDone: true };
      render(
        <Harness initial={initial}>
          <SettingsSheet open onClose={() => {}} />
        </Harness>
      );
      pokeAll(screen.getByTestId('settings-sheet'));
      // A second pass reaches controls the first one revealed (quiet hours, reminders).
      pokeAll(screen.getByTestId('settings-sheet'));
      expect(results.length).toBeGreaterThan(50);
      expect(failures()).toEqual([]);
    },
    UI_SWEEP_TIMEOUT
  );

  describe('today', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 9, 6, 9, 0));
    });
    afterEach(() => vi.useRealTimers());

    it(
      'check-in, undo, stepper, ministry, hours and the badge',
      () => {
        const initial = withScheduleChange(
          {
            ...defaultStore('2026-09-01', 'en'),
            onboardingDone: true,
            pioneer: true,
            whatsNew: { enabled: true, lastCheck: null, seen: [], newCount: 2 },
          },
          '2026-09-01',
          { meetingDays: [3] }
        );
        render(
          <Harness initial={initial}>
            <Today />
          </Harness>
        );
        const holds = () => screen.queryAllByRole('button', { pressed: false });
        for (const b of holds()) {
          fireEvent.pointerDown(b);
          act(() => vi.advanceTimersByTime(600));
          fireEvent.pointerUp(b);
          fireEvent.click(b);
        }
        pokeAll(screen.getByTestId('today'));
        // Undo every check-in.
        for (const b of screen.queryAllByRole('button', { pressed: true })) fireEvent.click(b);
        expect(results.length).toBeGreaterThan(15);
        expect(failures()).toEqual([]);
      },
      UI_SWEEP_TIMEOUT
    );
  });
});

/** A small seeded PRNG (mulberry32), so a failure can be replayed. */
function rng(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('domain writers keep the store valid', () => {
  it('random sequences of check-ins, undos, chapters, ministry and schedule changes', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = rng(seed);
      const pick = (xs) => xs[Math.floor(r() * xs.length)];
      let s = {
        ...defaultStore('2026-09-01', 'en'),
        reading: {
          plan: pick(['year', 'ownPace']),
          start: { book: 19, chapter: 1 },
          startedOn: '2026-09-01',
          countEarlierAsRead: false,
        },
      };
      for (let i = 0; i < 60; i++) {
        const day = addDays('2026-09-01', Math.floor(r() * 40));
        const id = pick(ROUTINE_IDS);
        const op = pick(['add', 'remove', 'chapters', 'ministry', 'schedule', 'feed', 'seen']);
        if (op === 'add' && id !== 'ministry') s = addCheckIn(s, { routine: id, day, value: true });
        if (op === 'remove') s = removeCheckIn(s, id, day);
        if (op === 'chapters') {
          s = setChaptersRead(s, day, Math.floor(r() * 3 * portionSize(s, day)));
        }
        if (op === 'ministry') {
          s = setMinistry(s, day, pick([{ shared: r() < 0.5 }, { studies: 3 }, { hours: 2.5 }]));
        }
        if (op === 'schedule') {
          s = withScheduleChange(s, day, { enabled: { [id]: r() < 0.5 }, meetingDays: [3, 6] });
        }
        if (op === 'feed') {
          const items = [{ guid: `g${i}`, pubDate: '' }];
          s = { ...s, whatsNew: applyFeed(s.whatsNew, items, new Date(2026, 9, 6)) };
        }
        if (op === 'seen') s = { ...s, lastSeenDay: day };
        const result = validateStore(s);
        expect(result, `seed ${seed}, step ${i}: ${op}`).toMatchObject({ ok: true });
      }
      // An export of whatever came out imports again.
      expect(importJson(exportJson(s)).ok).toBe(true);
    }
  });

  it('a migrated v1 store is valid', () => {
    const v1 = new Map([
      [
        'jw-daily-habits-state',
        JSON.stringify({ '2026-10-01': { text: true, bible: true }, '2026-10-02': { meeting: 1 } }),
      ],
      ['jw-bible-reading-days', JSON.stringify(['2026-09-30', 'nope'])],
      ['jw-user-settings', JSON.stringify({ reminderTime: null })],
    ]);
    const migrated = migrateV1((k) => v1.get(k) ?? null, TODAY, 'en');
    expect(migrated).not.toBeNull();
    expect(validateStore(migrated).ok).toBe(true);
  });
});
