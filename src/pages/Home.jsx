import { useState, useEffect } from 'react';
import { Menu, BookOpen, BookMarked, Heart, UsersRound, Users, Newspaper, Settings, ChevronRight, ArrowUpRight, ArrowRight, Sparkles, Check, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDrawer } from '../hooks/useDrawer';
import useSettingsStore from '../stores/settingsStore';
import { getDailyTextLink, JW_ORG_SECTIONS } from '../utils/jwLibraryLinks';
import { haptics } from '../utils/native';

/**
 * Home — the launchpad, with the morning routine as the front
 * door. Layout (top to bottom):
 *   1. Top bar (hamburger + title + settings)
 *   2. iOS large title (small: just the date)
 *   3. Morning routine status card (primary CTA, links to /routine)
 *   4. "All habits" link-out to the 6-row directory (secondary)
 *   5. Footer disclaimer
 *
 * The 6 link-out rows are no longer the primary surface. They
 * live at /habits and are reachable via the "All habits" link.
 * The drawer (hamburger) also links to /habits for power users.
 */

const ROUTINE_KEY = 'jw-routine-state';

function getTodayRoutineState() {
  try {
    const raw = localStorage.getItem(ROUTINE_KEY);
    if (!raw) return { stepsDone: 0, allDone: false, hasText: false, hasPrayer: false, hasReflection: false };
    const parsed = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (parsed.date !== today) return { stepsDone: 0, allDone: false, hasText: false, hasPrayer: false, hasReflection: false };
    const text = !!parsed.textRead;
    const prayer = !!parsed.prayed;
    const reflection = !!parsed.reflected;
    return {
      stepsDone: (text ? 1 : 0) + (prayer ? 1 : 0) + (reflection ? 1 : 0),
      allDone: text && prayer && reflection,
      hasText: text,
      hasPrayer: prayer,
      hasReflection: reflection,
    };
  } catch {
    return { stepsDone: 0, allDone: false, hasText: false, hasPrayer: false, hasReflection: false };
  }
}

function Home() {
  const today = new Date();
  const { openDrawer } = useDrawer();
  const { t } = useTranslation();
  const userName = useSettingsStore((s) => s.userName);
  // Tick to re-read routine state when /routine dispatches a
  // 'jw-habits:habit-setup-done' event. Same event the picker
  // used before — re-purposed for routine completions.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener('jw-habits:habit-setup-done', onChange);
    // Also re-read on storage events in case the user does
    // routine work in another tab.
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('jw-habits:habit-setup-done', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  // Daily refresh — when the user opens the app on a new day,
  // the routine state should reset. Listen to the page becoming
  // visible (covers tab-switching and screen-on events).
  useEffect(() => {
    const onVis = () => setTick((t) => t + 1);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Read the routine state. `tick` is a read-tie-breaker so
  // the linter doesn't fire "unused expression".
  void tick;
  const routine = getTodayRoutineState();

  // Time-of-day aware title — collapsed to just the time, not
  // a long greeting. The morning routine IS the greeting.
  const timeOfDayText = (() => {
    const hour = today.getHours();
    if (hour < 5) return t('home.night', 'Late night');
    if (hour < 12) return t('home.morning', 'Good morning');
    if (hour < 17) return t('home.afternoon', 'Good afternoon');
    if (hour < 21) return t('home.evening', 'Good evening');
    return t('home.night', 'Good night');
  })();

  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-base-200 pb-16">
      {/* iOS-style top bar */}
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
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/70">
              {t('appName', 'JW Habits')}
            </span>
          </div>
          <a
            href="/settings"
            className="btn btn-ghost btn-sm btn-square -mr-2 text-base-content/70"
            aria-label="Settings (theme, dark mode)"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </a>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-2xl">
        {/* iOS large title — compact: time + date. */}
        <h1 className="ios-large-title">
          {timeOfDayText}
          {userName ? (
            <bdi className="name">, {userName.length > 20 ? userName.slice(0, 20) + '…' : userName}</bdi>
          ) : ''}.
          <span className="sub">{formattedDate}</span>
        </h1>

        {/* === Primary surface: Morning routine status card === */}
        <RoutineCard routine={routine} />

        {/* === Secondary surface: All habits (the 6-row directory) === */}
        <h2 className="ios-section-h">
          {t('home.allHabits', 'All habits')}
        </h2>
        <a
          href="/habits"
          className="ios-row focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
        >
          <div className="ios-icon purple">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="body">
            <div className="title">{t('home.openDirectory', 'Open the habits directory')}</div>
            <div className="sub">{t('home.openDirectorySub', 'Daily text, Bible reading, prayer, meeting prep, news')}</div>
          </div>
          <ArrowRight className="ios-chev" />
        </a>

        {/* === Footer: minimal. No more "what's NOT in this app" — that's
            now in the About page. === */}
        <div className="ios-footer">
          Unofficial third-party tool. Not affiliated with jw.org.<br />
          <a href="/about" className="font-bold text-[13px]" style={{ color: '#0055B3' }}>About this app →</a>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}

/**
 * RoutineCard — the home's primary CTA. Shows the current state
 * of today's morning routine and links to /routine for the
 * full flow. Compact, single-card, no rows.
 */
function RoutineCard({ routine }) {
  const { t } = useTranslation();
  const dailyTextLink = getDailyTextLink();

  if (routine.allDone) {
    // All 3 done — show a calm, completed card.
    return (
      <a
        href="/routine"
        className="block ios-grouped focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
        style={{ textDecoration: 'none' }}
      >
        <div className="p-5 flex items-center gap-4">
          <div
            className="ios-icon"
            style={{ background: 'var(--ios-green, #34C759)', width: 40, height: 40, borderRadius: 10 }}
          >
            <Check className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold text-base-content">
              {t('home.routineDone', "Today's routine is done")}
            </div>
            <div className="text-sm text-base-content/60 mt-0.5">
              {t('home.routineDoneSub', 'See you tomorrow morning.')}
            </div>
          </div>
          <ChevronRight className="ios-chev" />
        </div>
      </a>
    );
  }

  // Not done yet — primary CTA. Color shifts based on progress:
  //   0/3 → blue (untouched)
  //   1-2/3 → indigo (in progress)
  const color = routine.stepsDone === 0 ? 'blue' : 'indigo';

  return (
    <a
      href="/routine"
      className="block ios-grouped focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
      style={{ textDecoration: 'none' }}
    >
      <div className="p-5 flex items-center gap-4">
        <div
          className={`ios-icon ${color}`}
          style={{ width: 40, height: 40, borderRadius: 10 }}
        >
          <Sun className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-semibold text-base-content">
            {routine.stepsDone === 0
              ? t('home.startMorning', 'Start your morning routine')
              : t('home.continueMorning', 'Continue your morning routine')}
          </div>
          <div className="text-sm text-base-content/60 mt-0.5">
            {routine.stepsDone === 0
              ? t('home.startMorningSub', 'Read the text, pray, reflect — 5 minutes.')
              : t('home.continueMorningSub', { defaultValue: `${3 - routine.stepsDone} of 3 left today.`, done: 3 - routine.stepsDone })}
          </div>
        </div>
        <ChevronRight className="ios-chev" />
      </div>
      {/* Subtle link-out hint for the daily text — the routine's
          first step. Tappable, but visually secondary. */}
      <a
        href={dailyTextLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-5 py-2.5 text-sm text-primary border-t border-base-300/30 hover:bg-base-200/50"
        onClick={(e) => {
          e.stopPropagation();
          haptics.light();
        }}
      >
        <BookOpen className="w-4 h-4" />
        <span className="flex-1">{t('home.openTodaysText', "Open today's text on jw.org")}</span>
        <ArrowUpRight className="w-4 h-4 text-base-content/50" />
      </a>
    </a>
  );
}

/**
 * AllHabitsPage — the old 6-row directory, now living at /habits.
 * This is the surface power users navigate to from the home's
 * "All habits" link or the side drawer.
 */
const HABIT_ROWS = [
  {
    key: 'dailyText',
    title: 'Daily text',
    sub: "Read today's scripture passage (3 min)",
    Icon: BookOpen,
    color: 'blue',
    href: getDailyTextLink(),
  },
  {
    key: 'bible',
    title: 'Bible reading',
    sub: 'Open the New World Translation study Bible',
    Icon: BookMarked,
    color: 'purple',
    href: JW_ORG_SECTIONS.bibles,
  },
  {
    key: 'prayer',
    title: 'Prayer',
    sub: 'Articles, music, and a moment to pause',
    Icon: Heart,
    color: 'orange',
    href: JW_ORG_SECTIONS.peaceAndHappiness,
  },
  {
    key: 'familyWorship',
    title: 'Family worship',
    sub: 'Talk prompts, videos, and family Bible ideas',
    Icon: UsersRound,
    color: 'pink',
    href: JW_ORG_SECTIONS.marriageAndFamily,
  },
  {
    key: 'meeting',
    title: 'Meeting prep',
    sub: "This week's midweek + weekend workbook",
    Icon: Users,
    color: 'green',
    href: JW_ORG_SECTIONS.meetingWorkbooks,
  },
  {
    key: 'news',
    title: "What's new on jw.org",
    sub: 'Latest articles, videos, and releases',
    Icon: Newspaper,
    color: 'teal',
    href: JW_ORG_SECTIONS.news,
  },
];

export function AllHabitsPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-base-200 pb-16">
      <h1 className="ios-large-title">
        {t('habits.title', 'All habits')}
        <span className="sub">{t('habits.subtitle', 'One-tap links to jw.org surfaces')}</span>
      </h1>
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="ios-grouped" aria-label="All habits">
          {HABIT_ROWS.map((habit) => {
            const { key, title, sub, href, color } = habit;
            const IconComponent = habit.Icon;
            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="ios-row focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
              >
                <div className={`ios-icon ${color}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="body">
                  <div className="title">{title}</div>
                  <div className="sub">{sub}</div>
                </div>
                <ArrowUpRight className="ios-chev text-base-content/50" />
              </a>
            );
          })}
        </div>
        <div className="ios-footer">
          Each link opens in your browser. Your reading list isn't
          stored here — it stays on jw.org.
        </div>
      </div>
    </div>
  );
}

export default Home;
