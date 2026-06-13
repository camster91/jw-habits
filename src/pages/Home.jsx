import { useState } from 'react';
import { Menu, BookOpen, Users, Heart, UsersRound, Plus, Check, Settings, ChevronRight, Info, Shield } from 'lucide-react';
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
    sub: 'Read the day\'s scripture passage (3 min)',
    Icon: BookOpen,
    color: 'blue',
  },
  {
    key: 'meeting',
    title: 'Meeting prep',
    sub: 'Prepare for midweek and weekend meetings',
    Icon: Users,
    color: 'green',
  },
  {
    key: 'prayer',
    title: 'Prayer',
    sub: 'Track morning, afternoon, and evening prayers',
    Icon: Heart,
    color: 'orange',
  },
  {
    key: 'familyWorship',
    title: 'Family worship',
    sub: 'Plan and log a weekly study with your family',
    Icon: UsersRound,
    color: 'purple',
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

  // Fresh user: no streak history AND onboarding not yet dismissed
  const [setupDismissed, setSetupDismissed] = useState(() => {
    try {
      return localStorage.getItem(HABIT_SETUP_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [picked, setPicked] = useState(() => new Set());
  const isFreshUser = currentStreak === 0 && longestStreak === 0;
  const showSetup = isFreshUser && !setupDismissed;

  const togglePick = (key) => {
    haptics.light();
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleStartRoutine = () => {
    haptics.success();
    if (picked.size === 0) {
      // They didn't pick anything — that's fine, the home view will just
      // show the daily text and prayers as the defaults.
      toast.info('No problem — you can pick habits any time from Settings.');
    } else {
      toast.success(`Started your routine with ${picked.size} habit${picked.size === 1 ? '' : 's'}.`);
    }
    try {
      localStorage.setItem(HABIT_SETUP_KEY, '1');
    } catch {
      // ignore
    }
    setSetupDismissed(true);
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
          {userName ? <span className="name">, {userName.length > 30 ? userName.slice(0, 30) + '…' : userName}</span> : ''}.
          <span className="sub">{formattedDate}</span>
        </h1>

        {/* Fresh user: setup flow. This replaces the previous
            "Start your first day" hero + the dense 0/0/0/0 streak
            card. The user picks the habits they want to track and
            the home view reorganizes around them. */}
        {showSetup && (
          <section className="mb-6" aria-label="Habit setup">
            <h2 className="text-lg font-semibold text-base-content mb-1">
              Build your daily routine
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Pick what you want to track. You can change this any time.
            </p>
            <div className="ios-grouped">
              {HABIT_OPTIONS.map((habit) => {
                const { key, title, sub, Icon, color } = habit;
                const isPicked = picked.has(key);
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
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleStartRoutine}
              className="btn btn-primary w-full mt-4"
            >
              {picked.size > 0
                ? `Start with ${picked.size} habit${picked.size === 1 ? '' : 's'}`
                : 'Start without picking'}
            </button>
            <button
              onClick={() => {
                haptics.light();
                try { localStorage.setItem(HABIT_SETUP_KEY, '1'); } catch (e) { void e; }
                setSetupDismissed(true);
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
            flow — returning users AND fresh users who finished
            the "Build your daily routine" picker. Hides only when
            the setup is still active (so the page doesn't show
            the daily text + prayers picker AND the empty cards). */}
        {!showSetup && (
          <>
            <h2 className="ios-section-h">{t('today.title', 'Today')}</h2>
            <div className="space-y-2">
              <DailyTasksSection />
              <PrayerTrackingCard />
            </div>
            <h2 className="ios-section-h">
              {t('bibleReading.heading', 'Bible reading')}
            </h2>
            <BibleReadingCard effectiveScheduleDay={effectiveScheduleDay} />
            <h2 className="ios-section-h">
              {t('familyWorship.title', 'Family worship')}
            </h2>
            <FamilyWorshipCard />
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

        {/* Footer links. Single column, both states. The previous
            design had two Get-Oriented rows + a "What success
            looks like" preview row + a footer — too much for a
            calm post-setup home. */}
        <div className="ios-grouped mt-2">
          <a href="/about" className="ios-row" style={{ textDecoration: 'none' }}>
            <div className="ios-icon" style={{ background: 'var(--ios-label-4)' }}>
              <Info />
            </div>
            <div className="body">
              <div className="title">How this app works</div>
              <div className="sub">3 minutes to read about what we track and why</div>
            </div>
            <ChevronRight className="ios-chev" />
          </a>
          <a href="/about" className="ios-row" style={{ textDecoration: 'none' }}>
            <div className="ios-icon" style={{ background: 'rgba(0,122,255,0.14)', color: 'var(--ios-blue)' }}>
              <Shield />
            </div>
            <div className="body">
              <div className="title">Unofficial third-party tool</div>
              <div className="sub">Not affiliated with jw.org. See /about for full disclaimer.</div>
            </div>
            <ChevronRight className="ios-chev" />
          </a>
        </div>

        {/* Unofficial disclaimer footer (always shown) */}
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
