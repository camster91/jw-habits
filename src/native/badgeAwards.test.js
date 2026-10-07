import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const hooks = vi.hoisted(() => ({ foreground: null, change: null }));
vi.mock('../data/StoreProvider.jsx', () => ({
  onForeground: (cb) => {
    hooks.foreground = cb;
    return () => {};
  },
  onStoreChange: (cb) => {
    hooks.change = cb;
    return () => {};
  },
}));

import { registerBadgeAwards } from './badgeAwards.js';
import { defaultStore, addCheckIn, removeCheckIn } from '../domain/store.js';
import { addDays } from '../domain/day.js';

const TODAY = '2026-10-07';
const earner = () => {
  let s = defaultStore('2020-01-01', 'en');
  for (let i = 0; i < 10; i++) {
    s = addCheckIn(s, { routine: 'personalStudy', day: addDays(TODAY, -i), value: true });
  }
  return s;
};

/** A tiny store driver that mirrors the provider: update, then notify. */
function driver(initial) {
  const d = {
    store: initial,
    updates: 0,
    update: (fn) => {
      d.updates++;
      d.store = fn(d.store);
      hooks.change(d.store, { update: d.update, today: TODAY });
    },
  };
  return d;
}

let events;
let listener;
beforeEach(() => {
  events = [];
  listener = (e) => events.push(e.detail.ids);
  window.addEventListener('fd-badge', listener);
  registerBadgeAwards();
});
afterEach(() => window.removeEventListener('fd-badge', listener));

describe('registerBadgeAwards', () => {
  it('awards once with today, dispatches fd-badge, and does not loop', () => {
    const d = driver(earner());
    hooks.change(d.store, { update: d.update, today: TODAY });
    expect(d.updates).toBe(1);
    expect(d.store.badges).toEqual({ study10: TODAY });
    expect(events).toEqual([['study10']]);
  });

  it('a later change does not re-write the date or re-announce', () => {
    const d = driver(earner());
    hooks.change(d.store, { update: d.update, today: TODAY });
    hooks.change(
      { ...d.store, labels: { dailyText: 'x' } },
      { update: d.update, today: '2026-10-09' }
    );
    expect(d.updates).toBe(1);
    expect(d.store.badges.study10).toBe(TODAY);
    expect(events).toHaveLength(1);
  });

  it('never removes a badge when undo makes the rule false', () => {
    const d = driver(earner());
    hooks.change(d.store, { update: d.update, today: TODAY });
    d.update((s) => removeCheckIn(s, 'personalStudy', TODAY));
    expect(d.store.badges.study10).toBe(TODAY);
    expect(d.updates).toBe(2); // the award, then the undo; no further award
  });

  it('runs on foreground too, so migrated data gets dated', () => {
    const d = driver(earner());
    hooks.foreground({ store: d.store, update: d.update, today: TODAY });
    expect(d.store.badges).toEqual({ study10: TODAY });
    expect(events).toEqual([['study10']]);
  });

  it('does nothing without update or when nothing is new', () => {
    const d = driver(defaultStore('2020-01-01', 'en'));
    hooks.change(d.store);
    hooks.change(d.store, { update: d.update, today: TODAY });
    expect(d.updates).toBe(0);
    expect(events).toEqual([]);
  });
});
