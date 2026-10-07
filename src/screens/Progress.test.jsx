// eslint-disable-next-line no-unused-vars -- used via JSX
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import i18n from 'i18next';
// eslint-disable-next-line no-unused-vars -- used via JSX
import { StoreContext } from '../data/useStore.js';
import { defaultStore } from '../domain/store.js';
import { withScheduleChange } from '../domain/schedule.js';
import { BOOKS } from '../domain/bible.js';
// eslint-disable-next-line no-unused-vars -- used via JSX
import Progress from './Progress.jsx';

// Tuesday 6 October 2026.
const TODAY = '2026-10-06';

function makeStore(over = {}, patch = {}) {
  const s = {
    ...defaultStore('2026-01-01', 'en'),
    onboardingDone: true,
    reading: {
      plan: 'ownPace',
      start: { book: 14, chapter: 1 },
      startedOn: '2026-01-01',
      countEarlierAsRead: true,
    },
    ...over,
  };
  return withScheduleChange(s, '2026-01-01', { meetingDays: [2, 0], ...patch });
}

function renderProgress(store) {
  const value = { store, update: () => {}, today: TODAY };
  return render(
    <StoreContext.Provider value={value}>
      <MemoryRouter>
        <Progress />
      </MemoryRouter>
    </StoreContext.Provider>
  );
}

const BANNED = /missed|broke|failed|lost/i;

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
afterEach(() => vi.useRealTimers());

describe('Progress', () => {
  it('fills 13 books when 13 are complete and says so', () => {
    // Start at book 14, earlier books counted: Genesis..2 Kings is 13 books.
    renderProgress(makeStore());
    const map = screen.getByRole('list', { name: 'Bible books' });
    const items = within(map).getAllByRole('listitem');
    expect(items).toHaveLength(66);
    expect(items[0]).toHaveAttribute('aria-label', 'Genesis, read');
    expect(items[65]).toHaveAttribute('aria-label', 'Revelation, not yet');
    expect(items.filter((i) => i.getAttribute('aria-label').endsWith(', read'))).toHaveLength(13);
    expect(screen.getByText('13 of 66 books')).toBeInTheDocument();
  });

  it('lists the 66 books in canonical order', () => {
    renderProgress(makeStore());
    const items = within(screen.getByRole('list', { name: 'Bible books' })).getAllByRole(
      'listitem'
    );
    BOOKS.forEach((b, i) => expect(items[i].getAttribute('aria-label')).toMatch(`${b.name},`));
  });

  it('shows a card only for routines enabled today', () => {
    const base = makeStore();
    const store = withScheduleChange(base, '2026-09-01', {
      enabled: { ...base.schedule[0].enabled, familyWorship: false },
    });
    renderProgress(store);
    expect(screen.getByRole('heading', { name: 'Daily text' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Family worship' })).not.toBeInTheDocument();
  });

  it('reads "8 of the last 8 meetings" for eight done meetings', () => {
    // Tuesdays and Sundays; log the 8 meetings before today.
    const days = [
      '2026-09-08',
      '2026-09-13',
      '2026-09-15',
      '2026-09-20',
      '2026-09-22',
      '2026-09-27',
      '2026-09-29',
      '2026-10-04',
    ];
    const log = days.map((day) => ({ routine: 'meetingPrep', day, value: true }));
    renderProgress(makeStore({ log }));
    const card = screen.getByRole('heading', { name: 'Meeting prep' }).closest('li');
    expect(within(card).getByText('8 of the last 8 meetings')).toBeInTheDocument();
    expect(within(card).getByText('8 in a row')).toBeInTheDocument();
    expect(within(card).getByText('8 days this year')).toBeInTheDocument();
  });

  it('omits the streak line when nothing has closed yet, and pluralises naturally', () => {
    const log = [{ routine: 'dailyText', day: TODAY, value: true }];
    renderProgress({
      ...makeStore({ log }),
      schedule: [{ ...makeStore().schedule[0], from: TODAY }],
    });
    const ministry = screen.getByRole('heading', { name: 'Ministry' }).closest('li');
    expect(within(ministry).queryByText(/in a row/)).not.toBeInTheDocument();
    expect(within(ministry).getByText('0 days this year')).toBeInTheDocument();
    const daily = screen.getByRole('heading', { name: 'Daily text' }).closest('li');
    expect(within(daily).getByText('1 day this year')).toBeInTheDocument();
  });

  it('marks read cells with an accent fill, solid border and a check; unread are dashed', () => {
    renderProgress(makeStore());
    const items = within(screen.getByRole('list', { name: 'Bible books' })).getAllByRole(
      'listitem'
    );
    const read = items[0];
    const unread = items[65];
    expect(read.className).toContain('bg-[var(--fd-accent)]');
    expect(read.className).toContain('border-solid');
    expect(read.querySelector('svg')).not.toBeNull();
    expect(unread.className).not.toContain('bg-[var(--fd-accent)]');
    expect(unread.className).toContain('border-dashed');
    expect(unread.querySelector('svg')).toBeNull();
    expect(items.filter((i) => i.querySelector('svg'))).toHaveLength(13);
  });

  it('shows a short visible abbreviation on each cell', () => {
    renderProgress(makeStore());
    const items = within(screen.getByRole('list', { name: 'Bible books' })).getAllByRole(
      'listitem'
    );
    const text = (name) => items[BOOKS.findIndex((b) => b.name === name)].textContent;
    expect(text('Genesis')).toBe('Gen');
    expect(text('1 Samuel')).toBe('1Sa');
    expect(text('Song of Solomon')).toBe('Son');
    expect(text('Psalms')).toBe('Psa');
  });

  it('reads a single closed occurrence as "of 1", never "of the last"', () => {
    const one = (key, done) => i18n.t(`fd.progress.${key}`, { count: 1, done });
    expect(one('recentDays', 1)).toBe('1 of 1 day');
    expect(one('recentWeeks', 0)).toBe('0 of 1 week');
    expect(one('recentMeetings', 1)).toBe('1 of 1 meeting');
    expect(one('recentMonths', 1)).toBe('1 of 1 month');
    expect(i18n.t('fd.wrapUp.meetingMoved', { count: 1, done: 1 })).toBe('1 of 1 meeting');
  });

  it('hides the recent line when nothing has closed yet', () => {
    const base = makeStore();
    renderProgress({ ...base, schedule: [{ ...base.schedule[0], from: TODAY }] });
    expect(screen.queryByText(/of the last/)).not.toBeInTheDocument();
  });

  it('renders no card list when no routine is enabled', () => {
    const base = makeStore();
    const none = Object.fromEntries(Object.keys(base.schedule[0].enabled).map((k) => [k, false]));
    renderProgress({ ...base, schedule: [{ ...base.schedule[0], enabled: none }] });
    expect(screen.queryByRole('heading', { name: 'Daily text' })).not.toBeInTheDocument();
    // Only the Bible-map list remains.
    expect(screen.getAllByRole('list')).toHaveLength(1);
  });

  it('shows the reading totals', () => {
    const log = [
      { routine: 'bibleReading', day: '2026-10-05', value: { chapters: [0, 1, 2] } },
      { routine: 'bibleReading', day: TODAY, value: { chapters: [3] } },
    ];
    renderProgress(makeStore({ log }));
    expect(screen.getByText('2 days of reading this year')).toBeInTheDocument();
    expect(screen.getByText('4 chapters')).toBeInTheDocument();
  });

  it('never uses discouraging words', () => {
    const { container } = renderProgress(makeStore());
    expect(container.textContent).not.toMatch(BANNED);
  });
});

describe('garden and levels', () => {
  it('shows the seed level for a new store', () => {
    renderProgress(makeStore({ reading: defaultStore(TODAY, 'en').reading }));
    expect(screen.getByText('Seed · Level 0')).toBeInTheDocument();
  });
  it('shows Sprout at 100 XP', () => {
    const log = Array.from({ length: 10 }, (_, i) => ({
      routine: 'dailyText',
      day: `2026-09-${String(i + 1).padStart(2, '0')}`,
      value: true,
    }));
    renderProgress(makeStore({ log }));
    expect(screen.getByText('Sprout · Level 1')).toBeInTheDocument();
  });
  it('keeps the garden and badges when points are hidden', () => {
    renderProgress(makeStore({ showGameLayer: false }));
    expect(screen.queryByText(/XP/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Level [0-9]/)).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Your garden:/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Badges' })).toBeInTheDocument();
  });
});
