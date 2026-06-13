import { Menu, Sparkles, Info, Shield, TrendingUp, Settings } from 'lucide-react';
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

function Home() {
  const today = new Date();
  const { openDrawer } = useDrawer();
  const { t } = useTranslation();
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

  // Fresh user: no streak history
  const isFreshUser = currentStreak === 0 && longestStreak === 0;

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* iOS-style top bar (replaces PageHeader gradient) */}
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

        {/* Returning user: personalized welcome strip */}
        {!isFreshUser && (
          <div className="mb-2">
            <WelcomeBack />
          </div>
        )}

        {/* Fresh user: welcoming empty state */}
        {isFreshUser && (
          <div className="ios-empty">
            <div className="art">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="h">{t('home.startYourFirstDay', 'Start your first day')}</h2>
            <div className="sub">
              {t('home.startYourFirstDayDesc',
                'Read today\'s text and check in. That\'s it. Your first streak begins on day one.'
              )}
            </div>
          </div>
        )}

        {/* iOS streak hero (ring + meta) */}
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

        {/* Pioneer service hours hero — shown only for pioneers */}
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

        {/* Today's Focus — single opinionated suggestion card */}
        <TodaysFocus />

        {/* Streak Records — current personal bests per category */}
        <StreakRecords />

        {/* Unified Dashboard — fast at-a-glance check */}
        <UnifiedDashboardCard />

        {/* Today's habits — PrayerTrackingCard renders its own iOS group */}
        <h2 className="ios-section-h">{t('today.title', 'Today')}</h2>
        <div className="space-y-2">
          <DailyTasksSection />
          <PrayerTrackingCard />
        </div>

        {/* Bible reading */}
        <h2 className="ios-section-h">
          {t('bibleReading.heading', 'Bible reading')}
        </h2>
        <BibleReadingCard effectiveScheduleDay={effectiveScheduleDay} />

        {/* Family worship */}
        <h2 className="ios-section-h">
          {t('familyWorship.title', 'Family worship')}
        </h2>
        <FamilyWorshipCard />

        {/* Fresh user: small hint about what success looks like — inline
            iOS list row instead of a large card. */}
        {isFreshUser && (
          <div className="ios-grouped">
            <div className="ios-row" style={{ cursor: 'default' }}>
              <div className="ios-icon jw-blue">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="body">
                <div className="title">What success looks like</div>
                <div className="sub">
                  A few quiet days in a row are normal. The grid doesn't have
                  to be perfect to count.
                </div>
              </div>
              <div
                aria-hidden="true"
                className="flex gap-0.5 ml-auto"
                title="Preview of a 30-day streak grid"
              >
                {[1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0].map((v, i) => (
                  <span
                    key={i}
                    className={`inline-block w-1.5 h-3 rounded-sm ${v ? 'bg-primary' : 'bg-base-content/15'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Heatmap — yearly habit visualization (hidden for fresh users; replaced by preview above) */}
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

        {/* Secondary actions (visible on Day 1) */}
        {isFreshUser && (
          <>
            <h2 className="ios-section-h">Get oriented</h2>
            <div className="ios-grouped">
              <a href="/about" className="ios-row" style={{ textDecoration: 'none' }}>
                <div className="ios-icon" style={{ background: 'var(--ios-label-4)' }}>
                  <Info />
                </div>
                <div className="body">
                  <div className="title">How this app works</div>
                  <div className="sub">3 minutes to read about what we track and why</div>
                </div>
                <svg className="ios-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </a>
              <a href="/about" className="ios-row" style={{ textDecoration: 'none' }}>
                <div className="ios-icon" style={{ background: 'rgba(0,122,255,0.14)', color: 'var(--ios-blue)' }}>
                  <Shield />
                </div>
                <div className="body">
                  <div className="title">Unofficial third-party tool</div>
                  <div className="sub">Not affiliated with jw.org. See /about for full disclaimer.</div>
                </div>
                <svg className="ios-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </a>
            </div>
          </>
        )}

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
