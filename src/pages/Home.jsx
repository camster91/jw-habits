import { Sun, Moon, CloudSun, Menu, Sparkles, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DailyTasksSection from '../components/DailyTasksSection';
import SmartSuggestions from '../components/SmartSuggestions';
import StreakRecords from '../components/StreakRecords';
import PrayerTrackingCard from '../components/PrayerTrackingCard';
import FamilyWorshipCard from '../components/FamilyWorshipCard';
import BibleReadingCard from '../components/BibleReadingCard';
import UnifiedDashboardCard from '../components/UnifiedDashboardCard';
import StreakRing from '../components/StreakRing';
import HabitHeatmap from '../components/HabitHeatmap';
import '../components/SmartSuggestions.css';
import { useDrawer } from '../hooks/useDrawer';
import useGamificationStore from '../stores/gamificationStore';
import PageHeader from '../components/PageHeader';

function Home() {
  const today = new Date();
  const { openDrawer } = useDrawer();
  const { t } = useTranslation();
  const currentStreak = useGamificationStore((s) => s.currentStreak);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return { text: t('greeting.morning'), icon: Sun, color: 'from-amber-400 to-orange-500' };
    }
    if (hour < 17) {
      return { text: t('greeting.afternoon'), icon: CloudSun, color: 'from-sky-400 to-blue-500' };
    }
    return { text: t('greeting.evening'), icon: Moon, color: 'from-indigo-500 to-purple-600' };
  })();

  const GreetingIcon = greeting.icon;
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* ── Hero Header ── */}
      <PageHeader
        title={greeting.text}
        subtitle={t('greeting.subtitle')}
        gradient="from-primary via-primary to-blue-700"
        titleSize="text-3xl"
        contentClass="pb-6"
        actions={
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={openDrawer}
              className="btn btn-ghost btn-sm btn-square text-white/80 hover:text-white -ml-2"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                ⌘K
              </kbd>
              <span className="text-xs font-medium text-white/50 tracking-wide uppercase">
                {t('appName')}
              </span>
            </div>
          </div>
        }
      />

      {/* ── Hero Greeting + Mini Streak (overlaps header bottom) ── */}
      <div className="container mx-auto px-4 -mt-6 max-w-2xl relative z-10">
        <div className="animate-fade-in-up">
          <div className="card bg-base-100 shadow-xl border border-base-300/50 overflow-hidden">
            <div className="card-body p-5">
              <div className="flex items-center gap-4">
                {/* Animated greeting icon */}
                <div className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${greeting.color} flex items-center justify-center shadow-lg animate-gentle-pulse`}>
                  <GreetingIcon className="w-7 h-7 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-base-content truncate">
                    {greeting.text}, Cam
                  </h2>
                  <p className="text-sm text-base-content/60 mt-0.5">
                    {formattedDate}
                  </p>
                </div>
                {/* Live streak ring */}
                <div className="flex-shrink-0">
                  <StreakRing
                    current={currentStreak}
                    longest={currentStreak}
                    size={60}
                    stroke={4}
                    color="text-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="container mx-auto px-4 pt-4 space-y-4 max-w-2xl">
        {/* ── Smart Suggestions ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '30ms' }}>
          <SmartSuggestions />
        </section>

        {/* ── Streak Records ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '40ms' }}>
          <StreakRecords />
        </section>

        {/* ── Unified Dashboard ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          <UnifiedDashboardCard />
        </section>

        {/* ── Daily Spiritual Routine ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
              {t('today.title')}
            </h2>
          </div>
          <div className="space-y-3">
            <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <DailyTasksSection />
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
              <PrayerTrackingCard />
            </div>
          </div>
        </section>

        {/* ── Bible Reading ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 rounded-full bg-accent" />
            <h2 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
              {t('bibleReading.heading')}
            </h2>
          </div>
          <BibleReadingCard />
        </section>

        {/* ── Family Worship ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '350ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 rounded-full bg-secondary" />
            <h2 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
              {t('familyWorship.title')}
            </h2>
          </div>
          <FamilyWorshipCard />
        </section>

        {/* ── Heatmap — yearly habit visualization ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <div className="card bg-base-100 shadow-md border border-base-300/50">
            <div className="card-body p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1 h-4 rounded-full bg-info" />
                <h2 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
                  Last 6 months
                </h2>
              </div>
              <HabitHeatmap weeks={26} />
            </div>
          </div>
        </section>

        {/* Bottom spacer for nav */}
        <div className="h-4" />
      </main>
    </div>
  );
}

export default Home;
