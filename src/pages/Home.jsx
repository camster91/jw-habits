import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, BookMarked, CalendarRange, Church, Sparkles, Users, UsersRound, ArrowUpRight } from 'lucide-react';
import { getDailyTextLink, getMemorialRow, getThisWeekMeetingUrl, getTodayRow, JW_ORG_SECTIONS } from '../utils/jwLibraryLinks';
import { getDailyReading } from '../utils/dailyBibleReading';
import { bibleReadingProgress, dailyTextProgress } from '../utils/habitProgress';

/**
 * Home — the only in-app page. Five habit rows:
 *   1. Daily text         → opens jw.org
 *   2. Bible reading     → opens today's reading on jw.org
 *   3. Prayer            → links to a quiet reflection page
 *   4. Family worship     → links to family resources
 *   5. Meeting prep      → links to this week's workbook
 *
 * Each row has two tap targets:
 *   - the title / icon / link arrow: open the jw.org surface
 *   - the checkbox on the right: mark "done" (persisted in
 *     localStorage; no toast, no animation, no "complete" card)
 *
 * State: a single localStorage key per day,
 *   jw-daily-habits-state = { date: 'YYYY-MM-DD', done: { today, text, bible, thisWeek, family, meeting, memorial? } }  // memorial is conditional
 *
 * When the user opens the app on a new day, the per-day state
 * resets automatically. Yesterday's checks don't carry over.
 *
 * The page is intentionally minimal. No streak, no XP, no
 * timer, no "see you tomorrow" celebration, no toasts, no
 * settings menu, no hamburger. Just five rows, each with a
 * link to do the actual habit on jw.org and a checkbox to
 * mark it done. The actual content lives on jw.org, not in
 * this app — we only track progress.
 */

const STATE_KEY = 'jw-daily-habits-state';
const FIRST_DONE_KEY = 'jw-habits-first-done';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// True after the user has tapped any checkbox at least once
// in their lifetime on this device. Persisted across per-day
// resets so the first-launch hint shows exactly once, ever.
function hasInteracted() {
  try {
    return localStorage.getItem(FIRST_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return { date: todayKey(), done: {}, history: [] };
    const parsed = JSON.parse(raw);
    // Per-day reset: if the saved date isn't today, start fresh.
    if (parsed.date !== todayKey()) {
      // History is preserved across day-rollover — only the
      // done map resets. We prune history to the last 7 days
      // (including today) below.
      const history = pruneHistory(parsed.history || [], todayKey());
      return { date: todayKey(), done: {}, history };
    }
    // Always prune on load in case the user installed the app
    // a long time ago and has stale entries.
    const history = pruneHistory(parsed.history || [], todayKey());
    return { ...parsed, history };
  } catch {
    return { date: todayKey(), done: {}, history: [] };
  }
}

// Prune a history array of ISO date strings to the most
// recent 7 days (inclusive of today). The returned array is
// sorted oldest→newest so the render can iterate it as a
// timeline. Duplicates are removed.
function pruneHistory(history, today) {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 6); // 7 days back inclusive
  const seen = new Set();
  const out = [];
  for (const d of history) {
    if (!d || typeof d !== 'string') continue;
    if (seen.has(d)) continue;
    if (d >= cutoff.toISOString().slice(0, 10) && d <= today) {
      seen.add(d);
      out.push(d);
    }
  }
  // Sort oldest→newest
  out.sort();
  return out;
}

function saveState(state) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private-mode errors
  }
}

function Home() {
  const { t } = useTranslation();
  // Initialize from localStorage. We re-read on `storage` events
  // and on visibilitychange so the checkbox state stays current
  // across tabs and on wake-from-sleep. If the saved state's
  // date is from a previous day, we write a fresh empty state
  // for today so the localStorage key always reflects the
  // current day (yesterday's per-day state never carries over).
  const [state, setState] = useState(() => {
    const loaded = loadState();
    if (Object.keys(loaded.done).length === 0) {
      // First-ever mount OR per-day reset just happened.
      // Make sure localStorage is in sync with what we
      // returned.
      saveState(loaded);
    }
    return loaded;
  });

  useEffect(() => {
    const refresh = () => setState(loadState());
    const onStorage = (e) => { if (e.key === STATE_KEY) refresh(); };
    const onVisible = () => { if (!document.hidden) refresh(); };
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const toggle = (key) => {
    setState((prev) => {
      const nextDone = { ...prev.done, [key]: !prev.done[key] };
      // History: maintain a rolling 7-day list of dates where
      // ANY habit was checked. When the user toggles a checkbox
      // on, we add today's date (if not already in the list).
      // When they toggle off the last checkbox of the day,
      // we REMOVE today's date. This keeps history accurate
      // without forcing an off-day to be recorded.
      let history = prev.history || [];
      const anyChecked = Object.values(nextDone).some(Boolean);
      const todayStr = prev.date;
      const todayInHistory = history.includes(todayStr);
      if (anyChecked && !todayInHistory) {
        history = pruneHistory([...history, todayStr], todayStr);
      } else if (!anyChecked && todayInHistory) {
        history = history.filter((d) => d !== todayStr);
      }
      const next = { date: prev.date, done: nextDone, history };
      saveState(next);
      // First-ever interaction: hide the hint forever.
      try { localStorage.setItem(FIRST_DONE_KEY, '1'); } catch { /* swallow */ }
      return next;
    });
  };

  // Resolve the daily Bible reading target for today. The
  // util is sync (no fetch) so this returns instantly.
  const dailyReading = getDailyReading(new Date());
  const bibleHref = dailyReading && dailyReading.url
    ? dailyReading.url
    : JW_ORG_SECTIONS.bibles;

  // "This week" — the current meeting-week URL, computed
  // once per render. Used for the This-week row's href and
  // sub-text. No content from jw.org is displayed.
  const thisWeek = getThisWeekMeetingUrl(new Date());

  // "Memorial" — a date-aware row that ONLY shows in the
  // ~30-day window before the annual Memorial of Christ's
  // Death. For known years (2024-2029) the sub-text shows
  // the exact date; for unknown years (2030+) it shows
  // "See jw.org for the date" and links to the year-agnostic
  // Memorial page. The row is hidden entirely outside
  // March/April. The function is null-safe (returns null
  // when the row should not appear).
  const memorial = getMemorialRow(new Date());

  // Progress metadata for rows that show a thin progress bar.
  // Both are calendar-based — no fetch, no jw.org content.
  const bibleProgress = bibleReadingProgress(new Date());
  const textProgress = dailyTextProgress(new Date());

  // "Today" — a day-of-week-aware row that tells the user
  // what's the most relevant JW thing right now. Title flips
  // to "Tonight" on Tuesday (meeting day) and sub-text
  // changes per day (Midweek Meeting Prep, Field Service,
  // Public Meeting). Always rendered as the first habit
  // row, above the weekly rows. null-safe (returns null
  // if today is invalid, which won't happen in practice).
  const todayRow = getTodayRow(new Date());

  // The 5 habit rows, in the order Cam listed them. Each
  // row has: a key (used for the done map), an icon
  // component, a color (used for the ios-icon background), a
  // title, an optional sub-text shown beneath the title, and
  // a href to the jw.org surface where the actual habit
  // happens.
  const ROWS = [
    // "Today" — a day-of-week-aware row at the top of the
    // habit list. Tells the user what's the relevant JW
    // thing right now. Title flips to "Tonight" on Tuesday
    // (meeting day). Sub-text changes per day. The href is
    // always a public jw.org URL. The row is always shown
    // (getTodayRow never returns null for a valid date).
    ...(todayRow ? [{
      key: 'today',
      title: todayRow.title,
      sub: todayRow.sub,
      Icon: Sparkles,
      color: 'indigo',
      href: todayRow.href,
    }] : []),
    {
      key: 'text',
      title: t('habit.text', 'Daily text'),
      // Calendar-based day-of-month counter — honest metadata,
      // not a claim about jw.org publishing cadence.
      sub: textProgress.label,
      Icon: BookOpen,
      color: 'blue',
      href: getDailyTextLink(),
      progress: textProgress,
    },
    {
      key: 'bible',
      title: t('habit.bible', 'Daily Bible reading'),
      sub: dailyReading
        ? t('habit.bibleSubToday', { defaultValue: `Today: ${dailyReading.label || 'open the reading'}`, today: dailyReading.label || '' })
        : t('habit.bibleSub', 'Open the New World Translation study Bible'),
      Icon: BookMarked,
      color: 'purple',
      href: bibleHref,
      progress: bibleProgress,
    },
    {
      // Meeting prep — 3 MWB sections shown as sub-row labels.
      // jw.org doesn't expose section-anchored URLs that work
      // (verified 2026-06-30: all 4 candidate URLs 404), so
      // the sub-rows are informational navigation hints, not
      // separate links. The main row's href still opens the
      // weekly schedule where all 3 sections are listed.
      key: 'meeting',
      title: t('habit.meeting', 'Meeting prep'),
      sub: t('habit.meetingSub', "This week's midweek + weekend workbook"),
      subRows: [
        { key: 'treasures',    label: t('habit.treasures',    'Treasures from God\'s Word') },
        { key: 'ministry',     label: t('habit.ministry',     'Apply Yourself to the Field Ministry') },
        { key: 'living',       label: t('habit.living',       'Living as Christians') },
      ],
      Icon: Users,
      color: 'green',
      href: JW_ORG_SECTIONS.meetingWorkbooks,
    },
    {
      // Family worship — 3 timing suggestions as sub-row
      // labels. Not separate links because the destination
      // page is the same generic landing; the timing
      // suggestions are planning aids for the user.
      key: 'family',
      title: t('habit.family', 'Family worship'),
      sub: t('habit.familySub', 'Talk prompts, videos, family Bible ideas'),
      subRows: [
        { key: '15', label: t('habit.family15', '15 minutes') },
        { key: '30', label: t('habit.family30', '30 minutes') },
        { key: '60', label: t('habit.family60', '60 minutes') },
      ],
      Icon: UsersRound,
      color: 'pink',
      href: JW_ORG_SECTIONS.marriageAndFamily,
    },
    {
      // "This week" — replaces the old Prayer row. The href
      // is computed from today's date (Mon-Sun ISO week, in
      // local time) and points at the public jw.org MWB
      // schedule page for that week. The sub-text shows the
      // date range, not the meeting content. No content from
      // jw.org is displayed in the app.
      key: 'thisWeek',
      title: t('habit.thisWeek', 'This week'),
      sub: thisWeek.weekOf,
      Icon: CalendarRange,
      color: 'teal',
      href: thisWeek.url,
    },
    // Memorial — a 6th row that ONLY appears within the
    // 30-day window before the annual Memorial. Hidden
    // entirely outside March/April. The icon (Church) and
    // color (indigo) are chosen to read as a special,
    // solemn event — distinct from the weekly habits.
    ...(memorial ? [{
      key: 'memorial',
      title: t('habit.memorial', 'Memorial'),
      sub: memorial.sub,
      Icon: Church,
      color: 'indigo',
      href: memorial.href,
    }] : []),
  ];

  const greetingText = (() => {
    const hour = new Date().getHours();
    if (hour < 5) return t('greeting.night', 'Good night');
    if (hour < 12) return t('greeting.morning', 'Good morning');
    if (hour < 17) return t('greeting.afternoon', 'Good afternoon');
    if (hour < 21) return t('greeting.evening', 'Good evening');
    return t('greeting.night', 'Good night');
  })();

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // The week strip — a compact Mon..Sun row at the top of
  // the home that gives the user a "where am I in the week"
  // visual signal. Today is bold + tinted; other days are
  // muted. Pure date math, no content from jw.org. The
  // strip is local-time Mon..Sun (jw.org uses Mon..Sun
  // week boundaries too — they coincide).
  //
  // Layout: 7 equally-spaced columns. Each column shows the
  // 3-letter weekday + the day-of-month number. The "today"
  // column has a small accent background + bold weight so
  // it pops without being noisy.
  const weekStrip = (() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    // weekday 0=Sun..6=Sat; we want Mon..Sun so the offset
    // from Mon is (weekday + 6) % 7.
    const dow = start.getDay();
    const offsetToMonday = (dow + 6) % 7;
    start.setDate(start.getDate() - offsetToMonday);
    const dayLetters = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      // fullDate is the ISO YYYY-MM-DD string for the dot
      // strip to match against the per-day history array.
      const fullDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        label: dayLetters[i],
        date: d.getDate(),
        fullDate,
        isToday:
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate(),
      });
    }
    return days;
  })();

  return (
    <div className="min-h-screen bg-base-200 pb-16">
      {/* Sticky iOS top bar — title only. No hamburger, no
          settings gear, no other chrome. The app is one
          page. */}
      <header
        className="sticky top-0 z-30 backdrop-blur-lg bg-base-200/80 border-b border-base-300/30"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="container mx-auto px-4 max-w-2xl flex items-center justify-center h-12">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/80">
            {t('appName', 'JW Habits')}
          </span>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-2xl">
        <h1 className="ios-large-title">
          {greetingText}.
          <span className="sub">{formattedDate}</span>
        </h1>

        {/* Week strip — Mon..Sun with today highlighted. A
            visual signal of "where am I in the week" placed
            between the date and the first-launch hint / habit
            list. The 7 columns share the width of the 5-row
            habit card below, so the strip feels like part of
            the same surface. */}
        <div
          className="grid grid-cols-7 gap-1 mb-4 text-center text-xs select-none"
          aria-label="This week"
        >
          {weekStrip.map((d, i) => (
            <div
              key={i}
              className={
                'py-1.5 rounded-md ' +
                (d.isToday
                  ? 'bg-primary text-primary-content font-bold'
                  // /80 keeps the inactive days visually subdued
                  // while clearing the WCAG AA 4.5:1 contrast
                  // threshold against bg-base-200. /60 was 2.81:1
                  // and 3.93:1 — axe-core flagged both as serious.
                  : 'text-base-content/80')
              }
            >
              <div className="text-[10px] uppercase tracking-wider">
                {d.label}
              </div>
              <div className="text-base font-semibold leading-tight">
                {d.date}
              </div>
            </div>
          ))}
        </div>

        {/* Weekly dots — a row of 7 small dots showing
            which days this week the user has checked off at
            least one habit. Filled = checked that day, hollow
            = missed. Pure local state
            (jw-daily-habits-state.history). No content from
            jw.org. The dots are aligned under the week-strip
            columns so the user can see "I checked Tuesday
            (col 1) and Thursday (col 3)" at a glance. */}
        <div
          className="grid grid-cols-7 gap-1 mb-4 select-none"
          aria-label="This week checked"
        >
          {weekStrip.map((d, i) => {
            const wasChecked = state.history && state.history.includes(d.fullDate);
            return (
              <div
                key={i}
                className="flex items-center justify-center py-1"
                title={wasChecked ? `${d.fullDate} — checked` : `${d.fullDate} — no check`}
              >
                <span
                  className={
                    'inline-block w-2 h-2 rounded-full ' +
                    (wasChecked
                      ? 'bg-primary'
                      : 'border border-base-content/30 bg-transparent')
                  }
                />
              </div>
            );
          })}
        </div>

        {/* First-launch hint. Shows exactly once, ever, until the
            user taps any checkbox. Then it disappears forever
            (the jw-habits-first-done localStorage key is set in
            toggle() and survives per-day resets). The hint is
            intentionally below the date and above the rows so
            it reads naturally as a "what is this screen" note.
            text-base-content/80 (instead of /70) so it stays
            readable in dark mode where /70 sits too close to
            the card surface. */}
        {!hasInteracted() && (
          <p
            className="text-sm text-base-content/80 mt-1 mb-4 px-1"
            role="note"
          >
            {t('home.firstRunHint', 'Tap a row to open jw.org. Tap the checkbox when done.')}
          </p>
        )}

        {/* The five habit rows. Each row is its own card; the
            left side opens jw.org, the right side is a
            checkbox. No toast, no animation, no "complete" card. */}
        <div className="ios-grouped">
          {ROWS.map((row) => {
            const { key, title, sub, color, href, progress, subRows } = row;
            const RowIcon = row.Icon;
            const isDone = !!state.done[key];
            return (
              <div key={key}>
                <div
                  className="ios-row"
                  // Dim the entire row + strike-through the title
                  // when the habit is marked done. Same iOS Reminders
                  // pattern — no animation, no toast, just a quiet
                  // visual signal. The row is still tappable to
                  // open jw.org.
                  style={isDone ? { opacity: 0.55 } : undefined}
                >
                  {/* Left: link to jw.org */}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    aria-label={`${title} — opens jw.org in a new tab`}
                  >
                    <div className={`ios-icon ${color}`}>
                      <RowIcon className="w-4 h-4" />
                    </div>
                    <div className="body min-w-0 flex-1">
                      <div className={`title truncate ${isDone ? 'line-through' : ''}`}>{title}</div>
                      {sub && <div className="sub truncate">{sub}</div>}
                      {/* Progress bar — only for rows that have a
                          progress object (Daily text, Bible reading).
                          Thin, faded track + primary fill. 100% width
                          of the title area, so it visually anchors
                          below the sub-text. Pure metadata, no jw.org
                          content implied. */}
                      {progress && (
                        <div
                          className="mt-1.5 h-1 w-full rounded-full bg-base-content/15 overflow-hidden"
                          role="progressbar"
                          aria-valuenow={progress.current}
                          aria-valuemin={0}
                          aria-valuemax={progress.total}
                          aria-label={progress.label}
                        >
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.round(progress.pct * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <ArrowUpRight className="ios-chev text-base-content/60 shrink-0" />
                  </a>
                  {/* Right: checkbox. Tapping it marks the habit done
                      (or un-done). No animation, no toast, no
                      celebration — just a quiet tick. */}
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className="ml-3 shrink-0"
                    aria-label={isDone ? `Mark ${title} as not done` : `Mark ${title} as done`}
                    aria-pressed={isDone}
                  >
                    <span
                      className={`ios-checkbox ${isDone ? 'done' : 'empty'}`}
                    >
                      {isDone && (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                  </button>
                </div>
                {/* Sub-rows: 3-section breakdown for Meeting prep
                    (Treasures / Ministry / Living) and 3 timing
                    options for Family worship. These are
                    informational labels — they do NOT have separate
                    links (jw.org doesn't expose section-anchored
                    URLs that work, and timing doesn't change the
                    destination). They sit visually nested under
                    their parent row. */}
                {subRows && subRows.length > 0 && (
                  <div
                    className="ml-12 mr-12 mb-2 -mt-1 text-xs text-base-content/60"
                    aria-label={`${title} options`}
                  >
                    {subRows.map((s, i) => (
                      <div
                        key={s.key}
                        className={`py-1 flex items-center gap-2 ${i < subRows.length - 1 ? 'border-b border-base-content/5' : ''}`}
                      >
                        <span className="w-1 h-1 rounded-full bg-base-content/30 shrink-0" aria-hidden="true" />
                        <span className="truncate">{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <footer className="ios-footer">
          Unofficial third-party tool. Not affiliated with jw.org.
        </footer>

        <div className="h-4" />
      </main>
    </div>
  );
}

export default Home;
