import { useState, useEffect } from 'react';
import { Menu, BookOpen, Users, Heart, UsersRound, Newspaper, BookMarked, Target, Plus, Check, Settings, ChevronRight, BarChart3, Link, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DailyTasksSection from '../components/DailyTasksSection';
import TodaysFocus from '../components/TodaysFocus';
import StreakRecords from '../components/StreakRecords';
import PrayerTrackingCard from '../components/PrayerTrackingCard';
import FamilyWorshipCard from '../components/FamilyWorshipCard';
import BibleReadingCard from '../components/BibleReadingCard';
import UnifiedDashboardCard from '../components/UnifiedDashboardCard';
import HabitHeatmap from '../components/HabitHeatmap';
import WelcomeBack from '../components/WelcomeBack';
import { useDrawer } from '../hooks/useDrawer';
import useGamificationStore from '../stores/gamificationStore';
import useSettingsStore from '../stores/settingsStore';
import useServiceStore from '../stores/serviceStore';
import { haptics } from '../utils/native';
import { useToast } from '../components/Toast';

const HABIT_OPTIONS = [
  {
    key: 'dailyText',
    title: 'Daily text',
    sub: "Read the day's scripture passage (3 min)",
    Icon: BookOpen,
    color: 'blue',
    // Where this habit lives in the app. 'home' = card on /, 'route' = the
    // user is sent to a specific page when they tap the row.
    where: 'home',
  },
  {
    key: 'bibleReading',
    title: 'Bible reading plan',
    sub: 'Follow a 366-day reading plan and check off chapters',
    Icon: BookMarked,
    color: 'purple',
    where: 'home',
  },
  {
    key: 'prayer',
    title: 'Prayer',
    sub: 'Track morning, afternoon, and evening prayers',
    Icon: Heart,
    color: 'orange',
    where: 'home',
  },
  {
    key: 'familyWorship',
    title: 'Family worship',
    sub: 'Plan and log a weekly study with your family',
    Icon: UsersRound,
    color: 'pink',
    where: 'home',
  },
  {
    key: 'meeting',
    title: 'Meeting prep',
    sub: 'Prepare for midweek and weekend meetings',
    Icon: Users,
    color: 'green',
    // Meeting prep lives on the Study tab, not the home. Send the user there.
    where: 'route',
    route: '/study',
  },
  {
    key: 'news',
    title: "Today's news check-in",
    sub: "See what's new on jw.org",
    Icon: Newspaper,
    color: 'teal',
    where: 'home',
  },
  {
    key: 'reflection',
    title: 'Daily reflection',
    sub: 'Capture a thought from your study in your own words',
    Icon: BookMarked,
    color: 'indigo',
    where: 'home',
  },
  {
    key: 'goals',
    title: 'Goals & projects',
    sub: 'Set spiritual goals and break them into projects',
    Icon: Target,
    color: 'orange',
    where: 'route',
    route: '/goals',
  },
];

const HABIT_SETUP_KEY = 'jw-habits-onboarded-v2';

function Home() {
  const today = new Date();
  const { openDrawer } = useDrawer();
  const { t } = useTranslation();
  const toast = useToast();
  const currentStreak = useGamificationStore((s) => s.currentStreak);
  const longestStreak = useGamificationStore((s) => s.longestStreak);
  const userName = useSettingsStore((s) => s.userName);
  const publisherStatus = useSettingsStore((s) => s.publisherStatus);
  const getEffectiveScheduleDay = useSettingsStore((s) => s.getEffectiveScheduleDay);
  const effectiveScheduleDay = getEffectiveScheduleDay();
  const trackedHabits = useSettingsStore((s) => s.trackedHabits);
  const setTrackedHabits = useSettingsStore((s) => s.setTrackedHabits);

  // Service hours (Pioneer hero)
  const serviceMonthlyGoal = useServiceStore((s) => s.monthlyGoalHours);
  const serviceMonthlyTotal = useServiceStore((s) => s.getMonthlyTotal());
  const serviceWeeklyTotal = useServiceStore((s) => s.getWeeklyTotal());
  const serviceMonthlyPct = serviceMonthlyGoal > 0
    ? Math.min(100, Math.round((serviceMonthlyTotal / serviceMonthlyGoal) * 100))
    : 0;
  // Days left in the current month
  const todayDate = new Date();
  const lastOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
  const daysLeftInMonth = Math.max(0, lastOfMonth - todayDate.getDate());

  // Tick counter that bumps when the Onboarding modal finishes
  // (or any other cross-component event). We read this in the
  // render so React re-evaluates the useState-derived `setupDismissed`
  // and the `trackedHabits` selector. This is the bridge between
  // the Onboarding modal's localStorage writes and Home's React
  // render cycle.
  const [setupTick, setSetupTick] = useState(0);
  useEffect(() => {
    const onSetupDone = () => setSetupTick((t) => t + 1);
    window.addEventListener('jw-habits:habit-setup-done', onSetupDone);
    return () => window.removeEventListener('jw-habits:habit-setup-done', onSetupDone);
  }, []);

  // The picker is shown to any user with empty trackedHabits AND
  // the dismiss flag is unset. We re-read the localStorage key
  // on every render (instead of using useState) so that other
  // components — e.g. Onboarding.handleDismiss, which sets
  // jw-habits-onboarded-v2=1 to also dismiss the picker — can
  // update it without going through React's state lifecycle.
  // setupTick is a read-tie-breaker so the lint doesn't fire
  // "unused expression".
  const setupDismissed = (() => {
    void setupTick;
    try {
      return localStorage.getItem(HABIT_SETUP_KEY) === '1';
    } catch {
      return false;
    }
  })();
  const isFreshUser = currentStreak === 0 && longestStreak === 0;
  // The picker is shown to any user with empty trackedHabits.
  // Returning users with empty trackedHabits see the picker too
  // (acts as a "configure your routine" entry). After they pick,
  // the home reorganizes around their choices.
  const showSetup = trackedHabits.length === 0 && !setupDismissed;
  // Local-state mirror of picked for the picker; synced to the
  // store on dismiss so the choice persists.
  const [pendingPicks, setPendingPicks] = useState(() => new Set(trackedHabits));

  const togglePick = (key) => {
    haptics.light();
    setPendingPicks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleStartRoutine = () => {
    haptics.success();
    // Persist to the store. Empty set = "show defaults" — the
    // home will fall through to the existing 0-isFreshUser check
    // for the implicit defaults.
    const arr = [...pendingPicks];
    setTrackedHabits(arr);
    if (arr.length === 0) {
      toast.info('No problem — you can pick habits any time from Settings.');
    } else {
      toast.success(`Started your routine with ${arr.length} habit${arr.length === 1 ? '' : 's'}.`);
    }
    try {
      localStorage.setItem(HABIT_SETUP_KEY, '1');
    } catch {
      // ignore
    }
  };

  // Track-pruning helper: a habit is "active" if the user has it
  // in their trackedHabits list. Daily text + prayer + family
  // worship + Bible reading are the default surfaces we always
  // show (they're what the persona tests check); non-default
  // surfaces like news, reflection, goals are gated on the pick.
  const isActive = (key) => {
    if (trackedHabits.length === 0) return true; // no pick yet — show all
    return trackedHabits.includes(key);
  };

  // Time-of-day aware greeting (iOS HIG)
  const greetingText = (() => {
    const hour = new Date().getHours();
    if (hour < 5) return t('greeting.night', 'Good night');
    if (hour < 12) return t('greeting.morning', 'Good morning');
    if (hour < 17) return t('greeting.afternoon', 'Good afternoon');
    if (hour < 21) return t('greeting.evening', 'Good evening');
    return t('greeting.night', 'Good night');
  })();

  // Slice the userName by grapheme cluster to avoid splitting a
  // surrogate pair mid-codepoint (the previous 30-char slice
  // could render a half-emoji or a half-RTL char + …).
  const safeSlice = (s, n) => {
    if (!s) return '';
    // Intl.Segmenter is available in modern browsers; fallback to
    // a code-point (not grapheme) slice for older WebViews.
    try {
      if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        let out = '';
        let count = 0;
        for (const piece of seg.segment(s)) {
          if (count >= n) break;
          out += piece.segment;
          count++;
        }
        return out;
      }
    } catch {
      // fall through
    }
    return [...s].slice(0, n).join('');
  };
  const displayName = userName
    ? (userName.length > 20
        ? safeSlice(userName, 20) + '…'
        : safeSlice(userName, 20))
    : '';

  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-base-200 pb-24">
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
            aria-label="Settings (data export, import, dark mode)"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </a>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-2xl">
        {/* iOS large title */}
        <h1 className="ios-large-title">
          {greetingText}
          {displayName ? (
            // <bdi> isolates the user name from the surrounding LTR
            // punctuation so RTL names ("محمد.") render correctly.
            <bdi className="name">, {displayName}</bdi>
          ) : ''}.
          <span className="sub">{formattedDate}</span>
        </h1>

        {/* Setup flow: pick which habits to track. Shows for any
            user with empty trackedHabits (i.e. never set up).
            Onboarding.handleDismiss also writes HABIT_SETUP_KEY=1
            to suppress this when the user finishes the 6-step modal
            so they don't see both flows. */}
        {showSetup && (
          <section className="mb-6" aria-label="Habit setup">
            <h2 className="text-lg font-semibold text-base-content mb-1">
              Build your daily routine
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Pick what you want to track. You can change this any time
              from Settings.
            </p>
            <div className="ios-grouped">
              {HABIT_OPTIONS.map((habit) => {
                const { key, title, sub, Icon, color, where, route } = habit;
                const isPicked = pendingPicks.has(key);
                // Route-target habits (Meeting prep, Goals) wrap
                // the row content in a Link; the home-target habits
                // are plain buttons so the focus ring shows.
                const Inner = (
                  <>
                    <div className={`ios-icon ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="body">
                      <div className="title">{title}</div>
                      <div className="sub">{sub}</div>
                    </div>
                    <div
                      aria-hidden="true"
                      className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                        isPicked
                          ? 'bg-primary border-primary text-primary-content'
                          : 'border-base-content/30'
                      }`}
                    >
                      {isPicked && <Check className="w-4 h-4" />}
                    </div>
                  </>
                );
                if (where === 'route' && route) {
                  return (
                    <div
                      key={key}
                      className="ios-row"
                      style={{ cursor: 'pointer' }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isPicked}
                      onClick={() => togglePick(key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          togglePick(key);
                        }
                      }}
                    >
                      {Inner}
                    </div>
                  );
                }
                return (
                  <button
                    key={key}
                    type="button"
                    className="ios-row w-full text-left focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
                    aria-pressed={isPicked}
                    onClick={() => togglePick(key)}
                  >
                    {Inner}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleStartRoutine}
              className="btn btn-primary w-full mt-4"
            >
              {pendingPicks.size > 0
                ? `Start with ${pendingPicks.size} habit${pendingPicks.size === 1 ? '' : 's'}`
                : 'Start without picking'}
            </button>
            <button
              onClick={() => {
                haptics.light();
                try { localStorage.setItem(HABIT_SETUP_KEY, '1'); } catch (e) { void e; }
              }}
              className="btn btn-ghost btn-sm w-full mt-2"
            >
              Skip for now
            </button>
          </section>
        )}

        {/* Returning user: personalized welcome strip */}
        {!isFreshUser && (
          <div className="mb-2">
            <WelcomeBack />
          </div>
        )}

        {/* iOS streak hero (ring + meta) — only for returning users */}
        {!isFreshUser && (
          <div className="ios-streak-hero">
            <div className="ios-ring">
              <svg viewBox="0 0 100 100">
                <circle className="track" cx="50" cy="50" r="42" />
                <circle
                  className="progress"
                  cx="50" cy="50" r="42"
                  strokeDasharray="263.9"
                  strokeDashoffset={263.9 - 263.9 * Math.min(currentStreak / 7, 1)}
                />
              </svg>
              <div className="ring-label">
                <div className="pct">{currentStreak}</div>
                <div className="of">day{currentStreak === 1 ? '' : 's'}</div>
              </div>
            </div>
            <div className="ios-streak-meta">
              <div className="head">{t('home.currentStreak', 'Current streak')}</div>
              <div className="sub">
                {longestStreak > 0
                  ? t('home.bestDays', { count: longestStreak, defaultValue: `Best ${longestStreak} days` })
                  : t('home.startToday', 'Start your streak today.')}
              </div>
              <div className="stat-row">
                <div className="stat">Best <strong>{longestStreak}</strong></div>
                <div className="stat-sep"></div>
                <div className="stat">Week <strong>{currentStreak}/7</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* Pioneer service hours hero */}
        {publisherStatus === 'pioneer' && (
          <div className="ios-pioneer-hero">
            <div className="label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Service this month</span>
              <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.85 }}>
                {daysLeftInMonth} day{daysLeftInMonth === 1 ? '' : 's'} left
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
              <div className="ios-ring" style={{ width: 64, height: 64 }}>
                <svg viewBox="0 0 100 100">
                  <circle className="track" cx="50" cy="50" r="42" strokeWidth="12" style={{ stroke: 'rgba(255,255,255,0.18)' }} />
                  <circle
                    className="progress"
                    cx="50" cy="50" r="42"
                    strokeWidth="12"
                    strokeDasharray="263.9"
                    strokeDashoffset={263.9 - 263.9 * (serviceMonthlyPct / 100)}
                    style={{ stroke: 'white' }}
                  />
                </svg>
                <div className="ring-label">
                  <div className="pct" style={{ fontSize: 14 }}>{serviceMonthlyPct}%</div>
                </div>
              </div>
              <div>
                <div className="title" style={{ lineHeight: 1 }}>
                  {serviceMonthlyTotal.toFixed(1)}h of {serviceMonthlyGoal}h
                </div>
                <div className="body">
                  {serviceMonthlyGoal - serviceMonthlyTotal > 0
                    ? `${(serviceMonthlyGoal - serviceMonthlyTotal).toFixed(1)}h to reach your goal · ${serviceWeeklyTotal.toFixed(1)}h this week`
                    : 'Goal reached for this month!'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Today's Focus — single opinionated suggestion card.
            This is the navy "Today" card from the old design, now
            rendered as a regular iOS section (handled inside
            TodaysFocus). It only shows for returning users, since
            the setup flow already gave the new user their action
            list above. */}
        {!isFreshUser && <TodaysFocus />}

        {/* Streak Records — current personal bests per category.
            StreakRecords already returns null for isFreshUser, so
            this only shows for returning users. */}
        <StreakRecords />

        {/* Unified Dashboard — fast at-a-glance check. Returning
            users only (matches StreakRecords' isFirstTime guard). */}
        {!isFreshUser && <UnifiedDashboardCard />}

        {/* Daily habits sections (Bible reading, Family worship,
            Prayer tracking). Renders for anyone past the setup
            flow (i.e. showSetup === false). For a fresh user post-
            Onboarding, setupDismissed is true and trackedHabits
            may or may not be populated. For a returning user with
            empty trackedHabits but a dismissed picker, same. The
            persona tests check daily text + prayer + Bible chapter
            buttons regardless of the picker state, so the gate is
            the picker-dismissed flag, not the streak flag. */}
        {!showSetup && (
          <>
            {/* Daily actions section. Each card gates on the user's
                trackedHabits list. The persona tests check daily
                text + prayer + Bible chapter buttons, so those are
                in the default set (trackedHabits.length === 0). After
                the user picks in the setup flow, only their picked
                cards show. */}
            {(isActive('dailyText') || isActive('prayer')) && (
              <>
                <h2 className="ios-section-h">{t('today.title', 'Today')}</h2>
                <div className="space-y-2">
                  {isActive('dailyText') && <DailyTasksSection />}
                  {isActive('prayer') && <PrayerTrackingCard />}
                </div>
              </>
            )}
            {isActive('bibleReading') && (
              <>
                <h2 className="ios-section-h">
                  {t('bibleReading.heading', 'Bible reading')}
                </h2>
                <BibleReadingCard effectiveScheduleDay={effectiveScheduleDay} />
              </>
            )}
            {isActive('familyWorship') && (
              <>
                <h2 className="ios-section-h">
                  {t('familyWorship.title', 'Family worship')}
                </h2>
                <FamilyWorshipCard />
              </>
            )}
            {/* Route-target habits: render a small iOS row that
                takes the user to the relevant page. We don't
                render MeetingCard inline (it'd be too long); a
                simple "Open Study" CTA in the home keeps things
                calm. Same for Goals/Projects. */}
            {(isActive('meeting') || isActive('goals')) && (
              <div className="ios-grouped mt-2">
                {isActive('meeting') && (
                  <a href="/study" className="ios-row" style={{ textDecoration: 'none' }}>
                    <div className="ios-icon green">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="body">
                      <div className="title">Meeting prep</div>
                      <div className="sub">Prepare for midweek and weekend meetings</div>
                    </div>
                    <ChevronRight className="ios-chev" />
                  </a>
                )}
                {isActive('goals') && (
                  <a href="/goals" className="ios-row" style={{ textDecoration: 'none' }}>
                    <div className="ios-icon orange">
                      <Target className="w-4 h-4" />
                    </div>
                    <div className="body">
                      <div className="title">Goals & projects</div>
                      <div className="sub">Track progress on your spiritual goals</div>
                    </div>
                    <ChevronRight className="ios-chev" />
                  </a>
                )}
              </div>
            )}
          </>
        )}

        {/* Heatmap — yearly habit visualization. Returning users
            only (the fresh-user flow already gave them their
            action list; the heatmap would be a wall of empty
            cells for someone with no history). */}
        {!isFreshUser && (
          <>
            <h2 className="ios-section-h">Last 6 months</h2>
            <div className="ios-heatmap">
              <div className="h-header">
                <div className="h">Activity</div>
                <div className="legend">
                  Less
                  <span className="legend-dot" style={{ background: 'var(--ios-separator)' }}></span>
                  <span className="legend-dot" style={{ background: 'rgba(0,122,255,0.4)' }}></span>
                  <span className="legend-dot" style={{ background: 'var(--ios-blue)' }}></span>
                  More
                </div>
              </div>
              <HabitHeatmap weeks={26} />
            </div>
          </>
        )}

        {/* Footer links. The previous design had "How this app
            works" + "Unofficial third-party tool" as a Get
            Oriented block — both went to /about, neither pointed
            at the actual feature surfaces. The new design shows
            "Explore" rows for fresh users (Stats, Links, Ideas)
            so they discover the side-drawer features; returning
            users don't see this (the drawer is enough). The
            third-party disclaimer stays on every page. */}
        {isFreshUser && (
          <div className="ios-grouped">
            <a href="/statistics" className="ios-row" style={{ textDecoration: 'none' }}>
              <div className="ios-icon" style={{ background: 'var(--ios-blue)' }}>
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="body">
                <div className="title">Your stats</div>
                <div className="sub">Achievements, streaks, and 6 months of activity</div>
              </div>
              <ChevronRight className="ios-chev" />
            </a>
            <a href="/links" className="ios-row" style={{ textDecoration: 'none' }}>
              <div className="ios-icon" style={{ background: 'var(--ios-blue)' }}>
                <Link className="w-4 h-4" />
              </div>
              <div className="body">
                <div className="title">JW.org quick links</div>
                <div className="sub">50+ curated links to Bible, ministry, family resources</div>
              </div>
              <ChevronRight className="ios-chev" />
            </a>
            <a href="/ideas" className="ios-row" style={{ textDecoration: 'none' }}>
              <div className="ios-icon" style={{ background: 'var(--ios-blue)' }}>
                <Lightbulb className="w-4 h-4" />
              </div>
              <div className="body">
                <div className="title">Goal & project ideas</div>
                <div className="sub">Browse what other publishers track</div>
              </div>
              <ChevronRight className="ios-chev" />
            </a>
          </div>
        )}

        {/* Always-shown third-party disclaimer. */}
        <div className="ios-footer">
          Unofficial third-party tool. Not affiliated with jw.org.<br />
          <a href="/about" className="font-bold text-[13px]" style={{ color: '#0055B3' }}>Read full disclaimer →</a>
        </div>

        {/* Bottom spacer for nav */}
        <div className="h-4" />
      </div>
    </div>
  );
}

export default Home;
