import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, BookMarked, Heart, Users, UsersRound, ArrowUpRight, Menu, Settings } from 'lucide-react';
import { useDrawer } from '../hooks/useDrawer';
import useSettingsStore from '../stores/settingsStore';
import { getDailyTextLink, JW_ORG_SECTIONS } from '../utils/jwLibraryLinks';
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
 *   jw-daily-habits-state = { date: 'YYYY-MM-DD', done: { text, bible, prayer, family, meeting } }
 *
 * When the user opens the app on a new day, the per-day state
 * resets automatically. Yesterday's checks don't carry over.
 *
 * The page is intentionally minimal. No streak, no XP, no
 * timer, no "see you tomorrow" celebration, no toasts. Just
 * five rows, each with a link to do the actual habit on
 * jw.org and a checkbox to mark it done.
 */

const STATE_KEY = 'jw-daily-habits-state';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
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
  const { openDrawer } = useDrawer();
  const userName = useSettingsStore((s) => s.userName);
  // Initialize from localStorage. We re-read on `storage` events
  // and on visibilitychange so the checkbox state stays current
  // across tabs and on wake-from-sleep.
  const [state, setState] = useState(loadState);

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
      return next;
    });
  };

  // Resolve the daily Bible reading target for today. Falls back
  // to a generic Bible link if the daily-reading util doesn't
  // have an entry for today's ISO date.
  const dailyReading = (() => {
    try {
      return getDailyReading(new Date());
    } catch {
      return null;
    }
  })();
  const bibleHref = dailyReading && dailyReading.url
    ? dailyReading.url
    : JW_ORG_SECTIONS.bibles;

  // The five habit rows, in the order Cam listed them. Each
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
      key: 'prayer',
      title: t('habit.prayer', 'Prayer'),
      sub: t('habit.prayerSub', 'Articles, music, a moment to pause'),
      Icon: Heart,
      color: 'orange',
      href: JW_ORG_SECTIONS.peaceAndHappiness,
    },
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
      {/* Sticky iOS top bar */}
      <div
        className="sticky top-0 z-30 backdrop-blur-lg bg-base-200/80 border-b border-base-300/30"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="container mx-auto px-4 max-w-2xl flex items-center justify-between h-12">
          <button
            onClick={openDrawer}
            className="btn btn-ghost btn-sm btn-square -ml-2 text-base-content/70"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/70">
            {t('appName', 'JW Habits')}
          </span>
          <a
            href="/settings"
            className="btn btn-ghost btn-sm btn-square -mr-2 text-base-content/70"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </a>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="ios-large-title">
          {greetingText}
          {userName ? (
            <bdi className="name">, {userName.length > 20 ? userName.slice(0, 20) + '…' : userName}</bdi>
          ) : ''}.
          <span className="sub">{formattedDate}</span>
        </h1>

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
                  <ArrowUpRight className="ios-chev text-base-content/50 shrink-0" />
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

        {/* Reset — a tiny utility, not a celebration. Tapping
            it just wipes the done map for today. */}
        {Object.values(state.done).some(Boolean) && (
          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={() => {
                saveState({ date: todayKey(), done: {} });
                setState({ date: todayKey(), done: {} });
              }}
              className="btn btn-ghost btn-sm text-base-content/60"
            >
              {t('habit.reset', 'Reset today')}
            </button>
          </div>
        )}

        <div className="ios-footer">
          Unofficial third-party tool. Not affiliated with jw.org.<br />
          <a href="/about" className="font-bold text-[13px]" style={{ color: '#0055B3' }}>About →</a>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}

export default Home;
