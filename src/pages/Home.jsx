import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, BookMarked, CalendarRange, Church, Users, UsersRound, ArrowUpRight } from 'lucide-react';
import { getDailyTextLink, getMemorialRow, getThisWeekMeetingUrl, JW_ORG_SECTIONS } from '../utils/jwLibraryLinks';
import { getDailyReading } from '../utils/dailyBibleReading';

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
 *   jw-daily-habits-state = { date: 'YYYY-MM-DD', done: { text, bible, thisWeek, family, meeting, memorial? } }  // memorial is conditional
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
    if (!raw) return { date: todayKey(), done: {} };
    const parsed = JSON.parse(raw);
    // Per-day reset: if the saved date isn't today, start fresh.
    if (parsed.date !== todayKey()) {
      return { date: todayKey(), done: {} };
    }
    return parsed;
  } catch {
    return { date: todayKey(), done: {} };
  }
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
      const next = { date: prev.date, done: nextDone };
      saveState(next);
      // First-ever interaction: hide the hint forever.
      // Swallow any storage error (private mode, quota) — the
      // hint just stays visible until next interaction.
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

  // The 5 habit rows, in the order Cam listed them. Each
  // row has: a key (used for the done map), an icon
  // component, a color (used for the ios-icon background), a
  // title, an optional sub-text shown beneath the title, and
  // a href to the jw.org surface where the actual habit
  // happens.
  const ROWS = [
    {
      key: 'text',
      title: t('habit.text', 'Daily text'),
      sub: t('habit.textSub', "Read today's scripture passage on jw.org"),
      Icon: BookOpen,
      color: 'blue',
      href: getDailyTextLink(),
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
    },
    {
      key: 'meeting',
      title: t('habit.meeting', 'Meeting prep'),
      sub: t('habit.meetingSub', "This week's midweek + weekend workbook"),
      Icon: Users,
      color: 'green',
      href: JW_ORG_SECTIONS.meetingWorkbooks,
    },
    {
      key: 'family',
      title: t('habit.family', 'Family worship'),
      sub: t('habit.familySub', 'Talk prompts, videos, family Bible ideas'),
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

  return (
    <div className="min-h-screen bg-base-200 pb-16">
      {/* Sticky iOS top bar — title only. No hamburger, no
          settings gear, no other chrome. The app is one
          page. */}
      <div
        className="sticky top-0 z-30 backdrop-blur-lg bg-base-200/80 border-b border-base-300/30"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="container mx-auto px-4 max-w-2xl flex items-center justify-center h-12">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/80">
            {t('appName', 'JW Habits')}
          </span>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="ios-large-title">
          {greetingText}.
          <span className="sub">{formattedDate}</span>
        </h1>

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
            const { key, title, sub, color, href } = row;
            const RowIcon = row.Icon;
            const isDone = !!state.done[key];
            return (
              <div
                key={key}
                className="ios-row"
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
                  <div className="body min-w-0">
                    <div className="title truncate">{title}</div>
                    {sub && <div className="sub truncate">{sub}</div>}
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
                    className={`flex items-center justify-center w-7 h-7 rounded-md border-2 transition-colors ${
                      isDone
                        ? 'bg-primary border-primary text-primary-content'
                        : 'border-base-content/30'
                    }`}
                  >
                    {isDone && (
                      <svg
                        className="w-4 h-4"
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
            );
          })}
        </div>

        <div className="ios-footer">
          Unofficial third-party tool. Not affiliated with jw.org.
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}

export default Home;
