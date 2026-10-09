import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useCallback, useMemo, useState } from 'react';
import { openLink } from '../native/openLink.js';
// eslint-disable-next-line no-unused-vars -- used via JSX
import { StoreContext } from '../data/useStore.js';
import { defaultStore } from '../domain/store.js';
import { withScheduleChange } from '../domain/schedule.js';
import { BOOKS, chapterIndex, finderUrl } from '../domain/bible.js';
import { addDays, appDay } from '../domain/day.js';
import { WARM_LINES } from '../domain/encouragement.js';
// eslint-disable-next-line no-unused-vars -- used via JSX
import Today from './Today.jsx';
import { haptics } from '../utils/native.js';
import { CapacitorHttp } from '@capacitor/core';
import en from '../locales/en.json';
import { checkInStudy } from '../domain/planCheckins.js';

vi.mock('../native/openLink.js', () => ({ openLink: vi.fn() }));
vi.mock('../utils/native.js', () => ({ haptics: { success: vi.fn() } }));
// The real plan check-ins, wrapped so one test can make a check-in refuse.
vi.mock('../domain/planCheckins.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    checkInStudy: vi.fn(real.checkInStudy),
    checkInFamily: vi.fn(real.checkInFamily),
  };
});
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
  openLink.mockClear();
});
afterEach(() => vi.useRealTimers());

describe('Today: the list', () => {
  it('shows only the routines due on a Tuesday morning with Tue/Sun meetings', () => {
    renderToday(makeStore());
    expect(screen.getByRole('button', { name: 'Daily text' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bible reading' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Meeting preparation' })).toBeInTheDocument();
    expect(screen.queryByText('Family worship')).not.toBeInTheDocument();
    expect(screen.getByText("for Tuesday's meeting")).toBeInTheDocument();
  });

  it("shows today's chapters on the Bible row", () => {
    renderToday(makeStore());
    expect(screen.getByText('Psalms 3')).toBeInTheDocument();
  });

  it('shows weekly study progress and the active study plan', () => {
    renderToday(
      makeStore({
        plans: [
          {
            id: 'p1',
            title: 'Daniel',
            kind: 'study',
            colour: 0,
            icon: 'book',
            steps: [],
            createdOn: '2026-10-01',
            archivedOn: null,
          },
        ],
        activePlan: { personalStudy: 'p1' },
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

  it('undoing extra Bible reading leaves yesterday untouched', () => {
    renderToday(makeStore());
    const stepper = screen.getByRole('group', { name: 'Chapters read today' });
    fireEvent.click(within(stepper).getByRole('button', { name: 'One more' }));
    fireEvent.click(within(stepper).getByRole('button', { name: 'One more' }));
    expect(entry('bibleReading', '2026-10-05')).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Bible reading', pressed: true }));
    expect(entry('bibleReading')).toBeUndefined();
    expect(entry('bibleReading', '2026-10-05')).toBeUndefined();
  });

  it("checking Bible reading logs today's portion", () => {
    renderToday(makeStore());
    hold(checkButton('Bible reading'));
    expect(entry('bibleReading').value).toEqual({ chapters: [chapterIndex(19, 3)] });
  });

  it('the Bible stepper records extra chapters on today', () => {
    renderToday(makeStore());
    const stepper = screen.getByRole('group', { name: 'Chapters read today' });
    fireEvent.click(within(stepper).getByRole('button', { name: 'One more' }));
    expect(entry('bibleReading').value).toEqual({ chapters: [chapterIndex(19, 3)] });
    fireEvent.click(within(stepper).getByRole('button', { name: 'One more' }));
    expect(entry('bibleReading').value.chapters).toHaveLength(2);
    expect(entry('bibleReading', '2026-10-05')).toBeUndefined();
    expect(screen.getByText('Psalms 3–4')).toBeInTheDocument();
    expect(within(stepper).getByText('2')).toBeInTheDocument();
  });

  it('opens the routine link externally', () => {
    renderToday(makeStore());
    fireEvent.click(screen.getByRole('button', { name: 'Open Daily text' }));
    expect(openLink).toHaveBeenCalledWith(
      'https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&alias=daily-text&date=20261006'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open Bible reading' }));
    expect(openLink).toHaveBeenLastCalledWith(
      'https://www.jw.org/finder?wtlocale=E&prefer=lang&bible=19003001&pub=nwtsty'
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

describe('Today: scripture reference', () => {
  it('is a link that opens the chapter on jw.org', () => {
    renderToday(makeStore({ tone: 'scripture' }));
    hold(checkButton('Daily text'));
    const link = within(screen.getByRole('status')).getByRole('link');
    const text = link.textContent; // e.g. "Psalms 55:22"
    const [name, verse] = [
      text.slice(0, text.lastIndexOf(' ')),
      text.slice(text.lastIndexOf(' ') + 1),
    ];
    const book = BOOKS.find((b) => b.name === name).n;
    const chapter = Number(verse.split(':')[0]);
    fireEvent.click(link);
    expect(openLink).toHaveBeenCalledWith(finderUrl('en', book, chapter));
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

  it('stays on Today for the rest of the month once shared, collapsed but editable', () => {
    const shared = { routine: 'ministry', day: '2026-10-02', value: { shared: true, studies: 2 } };
    renderToday(makeStore({ log: [shared] }));
    expect(screen.getByText('Shared this month · 2 Bible studies')).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Shared in the ministry this month' })
    ).toBeNull();
    const edit = screen.getByRole('button', { name: 'Edit' });
    expect(edit).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(edit);
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('checkbox', { name: 'Shared in the ministry this month' })
    ).toBeChecked();
    const studies = screen.getByRole('group', { name: 'Bible studies' });
    fireEvent.click(within(studies).getByRole('button', { name: 'One more' }));
    expect(current.log.filter((e) => e.routine === 'ministry')).toEqual([
      { routine: 'ministry', day: '2026-10-06', value: { shared: true, studies: 3 } },
    ]);
  });

  it('is not listed once shared when ministry is switched off', () => {
    const shared = { routine: 'ministry', day: '2026-10-02', value: { shared: true, studies: 0 } };
    const s = withScheduleChange(makeStore({ log: [shared] }), '2026-10-06', {
      enabled: { ministry: false },
    });
    renderToday(s);
    expect(screen.queryByText('Shared this month · 0 Bible studies')).toBeNull();
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

  it("opens the official What's New page without changing saved metadata or fetching content", () => {
    const whatsNew = {
      enabled: true,
      lastCheck: '2026-10-05T00:00:00.000Z',
      seen: ['a'],
      newCount: 2,
    };
    window.fetch = vi.fn();
    renderToday(makeStore({ whatsNew }));
    fireEvent.click(screen.getByRole('button', { name: /What's New on jw.org/ }));
    expect(openLink).toHaveBeenCalledWith('https://www.jw.org/en/whats-new/');
    expect(current.whatsNew).toEqual(whatsNew);
    expect(CapacitorHttp.get).not.toHaveBeenCalled();
    expect(window.fetch).not.toHaveBeenCalled();
    expect(screen.queryByText(/2 new on jw\.org/)).toBeNull();
  });

  it('shows no badge once What’s New is switched off, even with a count left over', () => {
    const whatsNew = { enabled: false, lastCheck: null, seen: ['a'], newCount: 2 };
    renderToday(makeStore({ whatsNew }));
    expect(screen.queryByRole('button', { name: /What's New on jw.org/ })).toBeNull();
  });

  it('offers the official page even before any feed check', () => {
    renderToday(makeStore());
    expect(screen.getByRole('button', { name: /What's New on jw.org/ })).toBeInTheDocument();
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

// ---- v5.1: study projects and family agendas -------------------------------

const LINK = 'https://www.jw.org/finder?wtlocale=E&bible=27001001&pub=nwtsty';

const steps = (prefix, label, n, doneThrough = 0) =>
  Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i + 1}`,
    title: `${label} ${i + 1}`,
    link: i === 0 ? LINK : null,
    note: null,
    doneOn: i < doneThrough ? '2026-10-01' : null,
  }));

const plan = (id, title, kind, planSteps, over = {}) => ({
  id,
  title,
  kind,
  colour: 2,
  icon: 'scroll',
  steps: planSteps,
  createdOn: '2026-09-20',
  archivedOn: null,
  ...over,
});

const daniel = (doneThrough = 0) =>
  plan('pd', 'Daniel', 'study', steps('d', 'Daniel', 12, doneThrough));
const acts = () => plan('pa', 'Acts', 'study', steps('a', 'Acts', 28));

const studyStore = (plans = [daniel()], active = 'pd') =>
  makeStore({ plans, activePlan: { personalStudy: active } });

const stepById = (id) => current.plans.flatMap((p) => p.steps).find((s) => s.id === id);

describe('Today: personal study with an active project', () => {
  it('shows the project, its next step and progress; a hold ticks that step', () => {
    renderToday(studyStore());
    expect(screen.getByText('Daniel · Daniel 1')).toBeInTheDocument();
    expect(screen.getByText('0 of 12')).toBeInTheDocument();
    hold(checkButton('Personal study'));
    expect(entry('personalStudy').value).toEqual({ stepId: 'd1' });
    expect(stepById('d1').doneOn).toBe('2026-10-06');
    expect(screen.getByText('1 of 12')).toBeInTheDocument();
  });

  it("opens the next step's link", () => {
    renderToday(studyStore());
    fireEvent.click(screen.getByRole('button', { name: 'Open Daniel 1' }));
    expect(openLink).toHaveBeenCalledWith(LINK);
  });

  it('"Did something else" then "Just log a session" logs true and ticks no step', () => {
    renderToday(studyStore());
    fireEvent.click(screen.getByRole('button', { name: 'Did something else' }));
    const sheet = screen.getByRole('dialog', { name: 'What did you study?' });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Just log a session' }));
    expect(entry('personalStudy').value).toBe(true);
    expect(current.plans[0].steps.every((s) => s.doneOn === null)).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('"Did something else" can tick a different undone step', () => {
    renderToday(studyStore([daniel(1)]));
    fireEvent.click(screen.getByRole('button', { name: 'Did something else' }));
    const sheet = screen.getByRole('dialog', { name: 'What did you study?' });
    // Only undone steps are offered.
    expect(within(sheet).queryByRole('button', { name: 'Daniel 1' })).toBeNull();
    fireEvent.click(within(sheet).getByRole('button', { name: 'Daniel 4' }));
    expect(entry('personalStudy').value).toEqual({ stepId: 'd4' });
    expect(stepById('d4').doneOn).toBe('2026-10-06');
    expect(stepById('d2').doneOn).toBeNull();
  });

  it('undoing a study check-in un-ticks the step it ticked', () => {
    renderToday(studyStore());
    hold(checkButton('Personal study'));
    fireEvent.click(screen.getByRole('button', { name: 'Personal study', pressed: true }));
    expect(entry('personalStudy')).toBeUndefined();
    expect(stepById('d1').doneOn).toBeNull();
    expect(screen.getByText('Daniel · Daniel 1')).toBeInTheDocument();
  });

  it('finishing the last step celebrates; undoing it restores the project as active', () => {
    renderToday(studyStore([daniel(11)]));
    hold(checkButton('Personal study'));
    expect(current.plans[0].archivedOn).toBe('2026-10-06');
    expect(current.activePlan.personalStudy).toBeNull();
    expect(screen.getByText('Study plan finished: Daniel. Well done.')).toBeInTheDocument();
    // No waiting project: no offer.
    expect(screen.queryByRole('button', { name: 'Start next study plan' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Personal study', pressed: true }));
    expect(current.plans[0].archivedOn).toBeNull();
    expect(current.activePlan.personalStudy).toBe('pd');
    expect(stepById('d12').doneOn).toBeNull();
    expect(screen.queryByText('Study plan finished: Daniel. Well done.')).toBeNull();
    expect(screen.getByText('Daniel · Daniel 12')).toBeInTheDocument();
  });

  it('finishing with one waiting project offers it, and accepting makes it active', () => {
    renderToday(studyStore([daniel(11), acts()]));
    hold(checkButton('Personal study'));
    expect(screen.getByText('Study plan finished: Daniel. Well done.')).toBeInTheDocument();
    const picker = screen.getByRole('combobox', { name: 'Next study plan' });
    expect(within(picker).getByRole('option', { name: 'Acts' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start next study plan' }));
    expect(current.activePlan.personalStudy).toBe('pa');
    expect(screen.getByText('Acts is now your current study plan.')).toBeInTheDocument();
    // Focus moves to the confirmation, never to the page body.
    expect(document.activeElement).toBe(screen.getByText('Acts is now your current study plan.'));
    // The done row still shows the step today's check-in ticked.
    expect(screen.getByText('Daniel · Daniel 12')).toBeInTheDocument();
  });

  it('with no active project keeps the v5.0 row and logs a plain session', () => {
    renderToday(studyStore([daniel()], null));
    expect(screen.queryByRole('button', { name: 'Did something else' })).toBeNull();
    expect(screen.getByText('0 of 3 this week')).toBeInTheDocument();
    hold(checkButton('Personal study'));
    expect(entry('personalStudy').value).toBe(true);
    expect(stepById('d1').doneOn).toBeNull();
  });
});

const family = (done = {}) =>
  plan(
    'pf',
    'Proverbs',
    'family',
    steps('f', 'Proverbs', 6).map((s) => ({ ...s, doneOn: done[s.id] ?? null }))
  );

// Family worship on Tuesdays, so it is due on Tuesday 6 October.
const familyStore = (done = {}) =>
  makeStore(
    {
      plans: [family(done)],
      familyAgendas: {
        '2026-10-05': [
          { id: 'i1', kind: 'step', planId: 'pf', stepId: 'f1' },
          { id: 'i2', kind: 'step', planId: 'pf', stepId: 'f2' },
        ],
      },
    },
    { meetingDays: [2, 0], familyWorshipDay: 2 }
  );

describe('Today: family worship agenda', () => {
  it("lists the week's agenda items with their links", () => {
    renderToday(familyStore());
    const agenda = screen.getByRole('list', { name: "This week's family worship" });
    expect(within(agenda).getAllByRole('listitem')).toHaveLength(2);
    expect(within(agenda).getByText('Proverbs 1')).toBeInTheDocument();
    expect(within(agenda).getByText('Proverbs 2')).toBeInTheDocument();
    fireEvent.click(within(agenda).getByRole('button', { name: 'Open link for Proverbs 1' }));
    expect(openLink).toHaveBeenCalledWith(LINK);
  });

  it('the check-in marks both agenda steps done', () => {
    renderToday(familyStore());
    hold(checkButton('Family worship'));
    expect(entry('familyWorship').value).toEqual({ stepIds: ['f1', 'f2'] });
    expect(stepById('f1').doneOn).toBe('2026-10-06');
    expect(stepById('f2').doneOn).toBe('2026-10-06');
    expect(screen.getByText('Proverbs 1, done')).toBeInTheDocument();
  });

  it('with no agenda the row is plain and the check-in marks nothing', () => {
    renderToday(makeStore({}, { meetingDays: [2, 0], familyWorshipDay: 2 }));
    expect(screen.queryByRole('list', { name: "This week's family worship" })).toBeNull();
    hold(checkButton('Family worship'));
    expect(entry('familyWorship').value).toEqual({ stepIds: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Family worship', pressed: true }));
    expect(entry('familyWorship')).toBeUndefined();
  });

  it('undoing a family check-in un-ticks only the steps it marked', () => {
    // Proverbs 2 was marked done by hand earlier today, before the session.
    renderToday(familyStore({ f2: '2026-10-06' }));
    hold(checkButton('Family worship'));
    expect(entry('familyWorship').value).toEqual({ stepIds: ['f1'] });
    fireEvent.click(screen.getByRole('button', { name: 'Family worship', pressed: true }));
    expect(entry('familyWorship')).toBeUndefined();
    expect(stepById('f1').doneOn).toBeNull();
    expect(stepById('f2').doneOn).toBe('2026-10-06');
  });
});

describe('Today: v5.1 copy', () => {
  it('never says missed, broke, failed or lost', () => {
    const scenes = [
      () => renderToday(studyStore()),
      () => {
        const r = renderToday(studyStore());
        fireEvent.click(screen.getByRole('button', { name: 'Did something else' }));
        return r;
      },
      () => {
        const r = renderToday(studyStore([daniel(11), acts()]));
        hold(checkButton('Personal study'));
        return r;
      },
      () => {
        const r = renderToday(familyStore());
        hold(checkButton('Family worship'));
        return r;
      },
    ];
    for (const scene of scenes) {
      const { unmount } = scene();
      expect(document.body.textContent).not.toMatch(BANNED);
      unmount();
    }
    expect(JSON.stringify(en.fd.today)).not.toMatch(BANNED);
  });
});

describe('Today: fix round 1', () => {
  const row = (id) => screen.getByTestId(`row-${id}`);

  it('hides "Did something else" once the study row is done today', () => {
    renderToday(studyStore());
    hold(checkButton('Personal study'));
    expect(screen.queryByRole('button', { name: 'Did something else' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Personal study', pressed: true }));
    expect(screen.getByRole('button', { name: 'Did something else' })).toBeInTheDocument();
  });

  it('a done row shows and links the step today ticked, not the next one', () => {
    renderToday(studyStore());
    hold(checkButton('Personal study'));
    expect(within(row('personalStudy')).getByText('Daniel · Daniel 1')).toBeInTheDocument();
    expect(screen.queryByText('Daniel · Daniel 2')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open Daniel 1' }));
    expect(openLink).toHaveBeenCalledWith(LINK);
  });

  it('a done row from "Just log a session" shows the plan title only, with no step link', () => {
    renderToday(studyStore());
    fireEvent.click(screen.getByRole('button', { name: 'Did something else' }));
    fireEvent.click(screen.getByRole('button', { name: 'Just log a session' }));
    expect(within(row('personalStudy')).getByText('Daniel')).toBeInTheDocument();
    expect(screen.queryByText('Daniel · Daniel 1')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open Daniel 1' })).toBeNull();
  });

  it('announces a finished project through a live region mounted beforehand', () => {
    renderToday(studyStore([daniel(11)]));
    const live = screen.getByTestId('plan-finished-live');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live.textContent).toBe('');
    hold(checkButton('Personal study'));
    expect(screen.getByTestId('plan-finished-live')).toBe(live);
    expect(live.textContent).toContain('Study plan finished: Daniel. Well done.');
  });

  it('"Not now" closes the card and focuses the study row', () => {
    renderToday(studyStore([daniel(11), acts()]));
    hold(checkButton('Personal study'));
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByText('Study plan finished: Daniel. Well done.')).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Personal study', pressed: true })
    );
  });

  it('a refused hold says so and gives no encouragement', () => {
    checkInStudy.mockImplementationOnce((s) => s);
    renderToday(studyStore());
    hold(checkButton('Personal study'));
    expect(screen.getByRole('alert')).toHaveTextContent('That could not be logged. Try again.');
    expect(screen.getByRole('status').textContent).toBe('');
    expect(entry('personalStudy')).toBeUndefined();
  });

  it('study: check-in, undo, check-in again on the same day', () => {
    renderToday(studyStore());
    hold(checkButton('Personal study'));
    fireEvent.click(screen.getByRole('button', { name: 'Personal study', pressed: true }));
    expect(current.plans[0].steps.every((s) => s.doneOn === null)).toBe(true);
    hold(checkButton('Personal study'));
    expect(entry('personalStudy').value).toEqual({ stepId: 'd1' });
    expect(current.plans[0].steps.map((s) => s.doneOn)).toEqual([
      '2026-10-06',
      ...Array(11).fill(null),
    ]);
    expect(current.log.filter((e) => e.routine === 'personalStudy')).toHaveLength(1);
  });

  it('family: check-in, undo, check-in again on the same day', () => {
    renderToday(familyStore());
    hold(checkButton('Family worship'));
    fireEvent.click(screen.getByRole('button', { name: 'Family worship', pressed: true }));
    expect(current.plans[0].steps.every((s) => s.doneOn === null)).toBe(true);
    hold(checkButton('Family worship'));
    expect(entry('familyWorship').value).toEqual({ stepIds: ['f1', 'f2'] });
    expect(current.plans[0].steps.map((s) => s.doneOn)).toEqual([
      '2026-10-06',
      '2026-10-06',
      null,
      null,
      null,
      null,
    ]);
  });

  it('undoes a widget-style true family entry from Today (that day on the agenda steps)', () => {
    const s = familyStore({ f1: '2026-10-06', f2: '2026-10-06', f4: '2026-10-06' });
    renderToday({
      ...s,
      log: [...s.log, { routine: 'familyWorship', day: '2026-10-06', value: true }],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Family worship', pressed: true }));
    expect(entry('familyWorship')).toBeUndefined();
    expect(stepById('f1').doneOn).toBeNull();
    expect(stepById('f2').doneOn).toBeNull();
    // Not on the agenda: left alone.
    expect(stepById('f4').doneOn).toBe('2026-10-06');
  });

  it('shows the auto-filled agenda for a week with nothing stored, and the check-in keeps it', () => {
    renderToday({ ...familyStore(), familyAgendas: {} });
    const agenda = screen.getByRole('list', { name: "This week's family worship" });
    expect(within(agenda).getAllByRole('listitem')).toHaveLength(1);
    expect(within(agenda).getByText('Proverbs 1')).toBeInTheDocument();
    hold(checkButton('Family worship'));
    expect(entry('familyWorship').value).toEqual({ stepIds: ['f1'] });
    expect(current.familyAgendas['2026-10-05']).toHaveLength(1);
    expect(current.familyAgendas['2026-10-05'][0]).toMatchObject({ kind: 'step', stepId: 'f1' });
  });

  it('finishing a family plan shows the family copy and no project offer', () => {
    const done = { f1: '2026-10-01', f2: '2026-10-01', f3: '2026-10-01', f4: '2026-10-01' };
    const s = familyStore(done);
    renderToday({
      ...s,
      plans: [...s.plans, acts()],
      familyAgendas: {
        '2026-10-05': [
          { id: 'i5', kind: 'step', planId: 'pf', stepId: 'f5' },
          { id: 'i6', kind: 'step', planId: 'pf', stepId: 'f6' },
        ],
      },
    });
    hold(checkButton('Family worship'));
    expect(screen.getByText('Family plan finished: Proverbs. Well done.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start next study plan' })).toBeNull();
  });

  it('the next-project picker leaves out family, archived and active plans', () => {
    const old = plan('po', 'Old', 'study', steps('o', 'Old', 2, 2), { archivedOn: '2026-10-01' });
    const romans = plan('pr', 'Romans', 'study', steps('r', 'Romans', 16));
    renderToday(studyStore([daniel(11), acts(), old, family(), romans]));
    hold(checkButton('Personal study'));
    const picker = screen.getByRole('combobox', { name: 'Next study plan' });
    const names = within(picker)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(names).toEqual(['Acts', 'Romans']);
    fireEvent.change(picker, { target: { value: 'pr' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start next study plan' }));
    expect(current.activePlan.personalStudy).toBe('pr');
  });
});
