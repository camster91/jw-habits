import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useCallback, useMemo, useState } from 'react';
// eslint-disable-next-line no-unused-vars -- used via JSX
import { StoreContext } from '../data/useStore.js';
import { defaultStore } from '../domain/store.js';
import { withScheduleChange } from '../domain/schedule.js';
import { chapterIndex } from '../domain/bible.js';
import { addDays, appDay } from '../domain/day.js';
import { WARM_LINES } from '../domain/encouragement.js';
// eslint-disable-next-line no-unused-vars -- used via JSX
import Today from './Today.jsx';
import { haptics } from '../utils/native.js';
import { CapacitorHttp } from '@capacitor/core';

vi.mock('../utils/native.js', () => ({ haptics: { success: vi.fn() } }));
vi.mock('@capacitor/core', async (importOriginal) => ({
  ...(await importOriginal()),
  CapacitorHttp: { get: vi.fn() },
}));

// Tuesday 6 October 2026.
const at = (h, m = 0, d = 6) => new Date(2026, 9, d, h, m);

function makeStore(over = {}, schedule = { meetingDays: [2, 0] }) {
  const s = {
    ...defaultStore('2026-09-01', 'en'),
    onboardingDone: true,
    reading: {
      plan: 'ownPace',
      start: { book: 19, chapter: 3 },
      startedOn: '2026-09-01',
      countEarlierAsRead: false,
    },
    ...over,
  };
  return withScheduleChange(s, '2026-09-01', schedule);
}

let current;

// eslint-disable-next-line no-unused-vars -- used via JSX
function Harness({ initial, onOpenSettings }) {
  const [store, setStore] = useState(initial);
  current = store;
  const update = useCallback((fn) => setStore((s) => fn(s)), []);
  const today = appDay(new Date());
  const value = useMemo(() => ({ store, update, today }), [store, update, today]);
  return (
    <StoreContext.Provider value={value}>
      <Today onOpenSettings={onOpenSettings} />
    </StoreContext.Provider>
  );
}

function renderToday(store, now = at(9), onOpenSettings = () => {}) {
  vi.setSystemTime(now);
  return render(<Harness initial={store} onOpenSettings={onOpenSettings} />);
}

const advance = (ms) => act(() => vi.advanceTimersByTime(ms));
const checkButton = (name) => screen.getByRole('button', { name, pressed: false });
const entry = (routine, day = '2026-10-06') =>
  current.log.find((e) => e.routine === routine && e.day === day);

function hold(button) {
  fireEvent.pointerDown(button);
  advance(600);
  fireEvent.pointerUp(button);
  fireEvent.click(button);
}

const BANNED = /missed|broke|failed|lost/i;

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  window.open = vi.fn();
});
afterEach(() => vi.useRealTimers());

describe('Today: the list', () => {
  it('shows only the routines due on a Tuesday morning with Tue/Sun meetings', () => {
    renderToday(makeStore());
    expect(screen.getByRole('button', { name: 'Daily text' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bible reading' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Meeting prep' })).toBeInTheDocument();
    expect(screen.queryByText('Family worship')).not.toBeInTheDocument();
    expect(screen.getByText("for Tuesday's meeting")).toBeInTheDocument();
  });

  it("shows today's chapters on the Bible row", () => {
    renderToday(makeStore());
    expect(screen.getByText('Psalms 3')).toBeInTheDocument();
  });

  it('shows weekly study progress and the topic', () => {
    renderToday(
      makeStore({
        studyTopic: 'Daniel',
        log: [{ routine: 'personalStudy', day: '2026-10-05', value: true }],
      })
    );
    expect(screen.getByText('1 of 3 this week · Daniel')).toBeInTheDocument();
  });

  it('a hold checks a routine in, and a tap undoes it', () => {
    renderToday(makeStore());
    hold(checkButton('Daily text'));
    expect(entry('dailyText')).toEqual({ routine: 'dailyText', day: '2026-10-06', value: true });
    expect(haptics.success).toHaveBeenCalledTimes(1);
    const done = screen.getByRole('button', { name: 'Daily text', pressed: true });
    fireEvent.click(done);
    expect(entry('dailyText')).toBeUndefined();
    expect(checkButton('Daily text')).toBeInTheDocument();
  });

  it('undoing Bible reading takes back the catch-up it made', () => {
    renderToday(makeStore());
    const stepper = screen.getByRole('group', { name: 'Chapters read today' });
    fireEvent.click(within(stepper).getByRole('button', { name: 'One more' }));
    fireEvent.click(within(stepper).getByRole('button', { name: 'One more' }));
    expect(entry('bibleReading', '2026-10-05').value).toEqual({ chapters: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Bible reading', pressed: true }));
    expect(entry('bibleReading')).toBeUndefined();
    expect(entry('bibleReading', '2026-10-05')).toBeUndefined();
  });

  it("checking Bible reading logs today's portion", () => {
    renderToday(makeStore());
    hold(checkButton('Bible reading'));
    expect(entry('bibleReading').value).toEqual({ chapters: [chapterIndex(19, 3)] });
  });

  it('the Bible stepper records chapters read and catches up a due yesterday', () => {
    renderToday(makeStore());
    const stepper = screen.getByRole('group', { name: 'Chapters read today' });
    fireEvent.click(within(stepper).getByRole('button', { name: 'One more' }));
    expect(entry('bibleReading').value).toEqual({ chapters: [chapterIndex(19, 3)] });
    fireEvent.click(within(stepper).getByRole('button', { name: 'One more' }));
    expect(entry('bibleReading').value.chapters).toHaveLength(2);
    expect(entry('bibleReading', '2026-10-05')).toBeDefined();
    expect(screen.getByText('Psalms 3–4')).toBeInTheDocument();
    expect(within(stepper).getByText('2')).toBeInTheDocument();
  });

  it('opens the routine link externally', () => {
    renderToday(makeStore());
    fireEvent.click(screen.getByRole('button', { name: 'Open Daily text' }));
    expect(window.open).toHaveBeenCalledWith(
      'https://wol.jw.org/en/wol/dt/r1/lp-e',
      '_blank',
      'noopener'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open Bible reading' }));
    expect(window.open).toHaveBeenLastCalledWith(
      'https://www.jw.org/finder?wtlocale=E&prefer=lang&bible=19003001&pub=nwtsty',
      '_blank',
      'noopener'
    );
    expect(screen.queryByRole('button', { name: 'Open Personal study' })).toBeNull();
  });
});

describe('Today: encouragement', () => {
  it('shows a warm line for 3 seconds after a check-in', () => {
    renderToday(makeStore());
    hold(checkButton('Daily text'));
    const status = screen.getByRole('status');
    expect(WARM_LINES).toContain(status.textContent);
    advance(2999);
    expect(status.textContent).not.toBe('');
    advance(1);
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('shows nothing with the quiet tone', () => {
    renderToday(makeStore({ tone: 'quiet' }));
    hold(checkButton('Daily text'));
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('adds a scripture reference with the scripture tone', () => {
    renderToday(makeStore({ tone: 'scripture' }));
    hold(checkButton('Daily text'));
    expect(screen.getByRole('status').textContent).toMatch(/\d+:\d+/);
  });
});

describe('Today: ministry', () => {
  it('records the shared toggle and studies in one entry for the month', () => {
    renderToday(makeStore());
    fireEvent.click(screen.getByRole('checkbox', { name: 'Shared in the ministry this month' }));
    expect(entry('ministry').value).toEqual({ shared: true, studies: 0 });
    const studies = screen.getByRole('group', { name: 'Bible studies' });
    fireEvent.click(within(studies).getByRole('button', { name: 'One more' }));
    expect(entry('ministry').value).toEqual({ shared: true, studies: 1 });
    expect(current.log.filter((e) => e.routine === 'ministry')).toHaveLength(1);
  });

  it('moves an earlier entry this month to today, and the row stays for undo', () => {
    renderToday(
      makeStore({
        log: [{ routine: 'ministry', day: '2026-10-02', value: { shared: false, studies: 2 } }],
      })
    );
    const shared = () =>
      screen.getByRole('checkbox', { name: 'Shared in the ministry this month' });
    fireEvent.click(shared());
    expect(current.log.filter((e) => e.routine === 'ministry')).toEqual([
      { routine: 'ministry', day: '2026-10-06', value: { shared: true, studies: 2 } },
    ]);
    // Still on Today, so the share can be taken back.
    expect(shared()).toBeChecked();
    fireEvent.click(shared());
    expect(entry('ministry').value).toEqual({ shared: false, studies: 2 });
  });

  it('keeps both of two ministry changes made before a re-render', () => {
    // A store whose update queues work without re-rendering Today.
    const queue = [];
    let store = makeStore();
    const value = { store, update: (fn) => queue.push(fn), today: '2026-10-06' };
    vi.setSystemTime(at(9));
    render(
      <StoreContext.Provider value={value}>
        <Today />
      </StoreContext.Provider>
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Shared in the ministry this month' }));
    const studies = screen.getByRole('group', { name: 'Bible studies' });
    fireEvent.click(within(studies).getByRole('button', { name: 'One more' }));
    for (const fn of queue) store = fn(store);
    const ministry = store.log.filter((e) => e.routine === 'ministry');
    expect(ministry).toEqual([
      { routine: 'ministry', day: '2026-10-06', value: { shared: true, studies: 1 } },
    ]);
  });

  it('shows hours only in pioneer mode', () => {
    renderToday(makeStore());
    expect(screen.queryByLabelText('Hours this month')).toBeNull();
  });

  it('records hours in pioneer mode', () => {
    renderToday(makeStore({ pioneer: true, hoursGoal: 50 }));
    fireEvent.change(screen.getByLabelText('Hours this month'), { target: { value: '12.5' } });
    expect(entry('ministry').value).toEqual({ shared: false, studies: 0, hours: 12.5 });
    expect(screen.getByText('12.5 of 50 hours')).toBeInTheDocument();
  });
});

describe('Today: cards and lines', () => {
  it('asks for meeting days when none are set, and opens Settings', () => {
    const onOpenSettings = vi.fn();
    renderToday(makeStore({}, { meetingDays: [] }), at(9), onOpenSettings);
    fireEvent.click(screen.getByRole('button', { name: /^Set your meeting days/ }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('has no meeting-days card when they are set', () => {
    renderToday(makeStore());
    expect(screen.queryByText('Set your meeting days')).toBeNull();
  });

  it('shows the What’s New badge; a tap opens the page and zeroes the count, offline', () => {
    const whatsNew = {
      enabled: true,
      lastCheck: '2026-10-05T00:00:00.000Z',
      seen: ['a'],
      newCount: 2,
    };
    window.fetch = vi.fn();
    renderToday(makeStore({ whatsNew }));
    fireEvent.click(screen.getByRole('button', { name: '2 new on jw.org' }));
    expect(window.open).toHaveBeenCalledWith(
      'https://www.jw.org/en/whats-new/',
      '_blank',
      'noopener'
    );
    expect(current.whatsNew).toEqual({ ...whatsNew, newCount: 0 });
    expect(CapacitorHttp.get).not.toHaveBeenCalled();
    expect(window.fetch).not.toHaveBeenCalled();
    expect(screen.queryByText(/new on jw\.org/)).toBeNull();
  });

  it('shows no badge when nothing is new', () => {
    renderToday(makeStore());
    expect(screen.queryByText(/new on jw\.org/)).toBeNull();
  });

  it('opens a week with a fresh-start line on Monday', () => {
    renderToday(makeStore(), at(9, 0, 5));
    expect(screen.getByText('A new week, a fresh start.')).toBeInTheDocument();
  });

  it('opens a month with a fresh-start line on the 1st', () => {
    renderToday(makeStore(), at(9, 0, 1));
    expect(screen.getByText('A new month, a fresh start.')).toBeInTheDocument();
  });
});

describe('Today: wrap-up', () => {
  const someDone = () =>
    makeStore({ log: [{ routine: 'dailyText', day: '2026-10-06', value: true }] });

  it('is not shown before the wrap-up time', () => {
    renderToday(someDone(), at(19, 59));
    expect(screen.queryByRole('region', { name: 'Your day in review' })).toBeNull();
  });

  it('replaces the list at 21:00, with Still time for open routines', () => {
    renderToday(someDone(), at(21));
    const card = screen.getByRole('region', { name: 'Your day in review' });
    expect(within(card).getByText('Daily text')).toBeInTheDocument();
    expect(within(card).getAllByRole('button', { name: /Still time/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Bible reading', pressed: false })).toBeNull();
  });

  it('Still time and Show routines expand the list for a late check-in', () => {
    renderToday(someDone(), at(21));
    fireEvent.click(screen.getAllByRole('button', { name: /Still time/ })[0]);
    expect(checkButton('Bible reading')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide routines' }));
    expect(screen.queryByRole('button', { name: 'Bible reading', pressed: false })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show routines' }));
    expect(checkButton('Bible reading')).toBeInTheDocument();
  });

  it('lists nothing still open at 22:30', () => {
    renderToday(someDone(), at(22, 30));
    expect(screen.queryByText(/Still time/)).toBeNull();
    expect(screen.getByText("Rest well — tomorrow's a fresh start.")).toBeInTheDocument();
  });

  it('with nothing done, says only Rest well', () => {
    renderToday(makeStore(), at(21));
    const card = screen.getByRole('region', { name: 'Your day in review' });
    const text = within(card).getByTestId('wrapup-body').textContent;
    expect(text).toBe("Rest well — tomorrow's a fresh start.");
  });

  it('notes when grace kept a streak', () => {
    // Daily text done every day of September through the 4th of October; the
    // 5th was carried by grace.
    const log = [];
    for (let day = '2026-09-01'; day <= '2026-10-04'; day = addDays(day, 1)) {
      log.push({ routine: 'dailyText', day, value: true });
    }
    log.push({ routine: 'dailyText', day: '2026-10-06', value: true });
    renderToday(makeStore({ log }), at(21));
    expect(screen.getByText('Life happens — kept your streak')).toBeInTheDocument();
  });

  it('celebrates when everything is done', () => {
    const store = makeStore();
    const due = ['dailyText', 'bibleReading', 'meetingPrep', 'personalStudy'];
    const log = due.map((routine) => ({ routine, day: '2026-10-06', value: true }));
    log.push({ routine: 'ministry', day: '2026-10-06', value: { shared: true, studies: 0 } });
    renderToday({ ...store, log }, at(21));
    expect(screen.getByText('Everything is done for today. Well done.')).toBeInTheDocument();
    expect(haptics.success).toHaveBeenCalledTimes(1);
  });

  it('fires the celebration haptic at most once per app day', () => {
    const due = ['dailyText', 'bibleReading', 'meetingPrep', 'personalStudy'];
    const log = due.map((routine) => ({ routine, day: '2026-10-06', value: true }));
    log.push({ routine: 'ministry', day: '2026-10-06', value: { shared: true, studies: 0 } });
    const first = renderToday(makeStore({ log }), at(21));
    expect(haptics.success).toHaveBeenCalledTimes(1);
    first.unmount();
    renderToday(makeStore({ log }), at(22));
    expect(screen.getByText('Everything is done for today. Well done.')).toBeInTheDocument();
    expect(haptics.success).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('fd-celebrated')).toBe('2026-10-06');
  });

  it('does not celebrate with the quiet tone', () => {
    const due = ['dailyText', 'bibleReading', 'meetingPrep', 'personalStudy'];
    const log = due.map((routine) => ({ routine, day: '2026-10-06', value: true }));
    log.push({ routine: 'ministry', day: '2026-10-06', value: { shared: true, studies: 0 } });
    renderToday(makeStore({ tone: 'quiet', log }), at(21));
    expect(screen.queryByText('Everything is done for today. Well done.')).toBeNull();
    expect(haptics.success).not.toHaveBeenCalled();
  });

  it('Done for today collapses the card to one line until the next day', () => {
    const { unmount } = renderToday(someDone(), at(21));
    fireEvent.click(screen.getByRole('button', { name: 'Done for today' }));
    expect(screen.queryByRole('region', { name: 'Your day in review' })).toBeNull();
    expect(screen.getByText('Your day in review · 1 done')).toBeInTheDocument();
    expect(sessionStorage.getItem('fd-wrapup-dismissed')).toBe('2026-10-06');
    unmount();
    renderToday(someDone(), at(21, 30));
    expect(screen.getByText('Your day in review · 1 done')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show routines' }));
    expect(checkButton('Bible reading')).toBeInTheDocument();
  });

  it('a dismissal from yesterday does not hide today’s card', () => {
    sessionStorage.setItem('fd-wrapup-dismissed', '2026-10-05');
    renderToday(someDone(), at(21));
    expect(screen.getByRole('region', { name: 'Your day in review' })).toBeInTheDocument();
  });

  it('appears when the wrap-up time arrives while open', () => {
    renderToday(someDone(), at(19, 59));
    advance(60 * 1000);
    expect(screen.getByRole('region', { name: 'Your day in review' })).toBeInTheDocument();
  });
});

describe('Today: copy', () => {
  it('never says missed, broke, failed or lost', () => {
    const states = [
      [makeStore(), at(9)],
      [makeStore({}, { meetingDays: [] }), at(9)],
      [makeStore({ whatsNew: { enabled: true, lastCheck: null, seen: [], newCount: 3 } }), at(9)],
      [makeStore(), at(21)],
      [makeStore(), at(23)],
      [makeStore({ log: [{ routine: 'dailyText', day: '2026-10-06', value: true }] }), at(21)],
      [makeStore({ pioneer: true }), at(9, 0, 5)],
    ];
    for (const [store, now] of states) {
      const { container, unmount } = renderToday(store, now);
      expect(container.textContent).not.toMatch(BANNED);
      unmount();
    }
  });
});
