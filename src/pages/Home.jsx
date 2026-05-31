import { Sun, Moon, CloudSun, Menu, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DailyTasksSection from '../components/DailyTasksSection';
import PrayerTrackingCard from '../components/PrayerTrackingCard';
import FamilyWorshipCard from '../components/FamilyWorshipCard';
import BibleReadingCard from '../components/BibleReadingCard';
import { useDrawer } from '../hooks/useDrawer';
import PageHeader from '../components/PageHeader';

function Home() {
  const today = new Date();
  const { openDrawer } = useDrawer();
  const { t } = useTranslation();

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
  const formattedDateShort = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
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
            <span className="text-xs font-medium text-white/50 tracking-wide uppercase">
              {t('appName')}
            </span>
          </div>
        }
      />

      {/* ── Hero Greeting Card (overlaps header bottom) ── */}
      <div className="container mx-auto px-4 -mt-6 max-w-2xl relative z-10">
        <div className="animate-fade-in-up">
          <div className="card bg-base-100 shadow-xl border border-base-300/50 overflow-hidden">
            <div className="card-body p-5">
              <div className="flex items-center gap-4">
                {/* Animated icon */}
                <div className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${greeting.color} flex items-center justify-center shadow-lg animate-gentle-pulse`}>
                  <GreetingIcon className="w-7 h-7 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-base-content truncate">
                    {greeting.text}, Cam
                  </h2>
                  <p className="text-sm text-base-content/60 mt-0.5">
                    {formattedDate}
                  </p>
                </div>
                {/* Streak placeholder (replaced by #43 dashboard) */}
                <div className="ml-auto flex-shrink-0 text-center">
                  <div className="text-2xl font-black text-primary">—</div>
                  <div className="text-[10px] text-base-content/40 uppercase tracking-wider">
                    {t('stats.streak')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="container mx-auto px-4 pt-5 space-y-6 max-w-2xl">
        {/* ── Daily Spiritual Routine ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
              {t('today.title')}
            </h2>
          </div>
          <div className="space-y-3">
            <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <DailyTasksSection />
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <PrayerTrackingCard />
            </div>
          </div>
        </section>

        {/* ── Bible Reading ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 rounded-full bg-accent" />
            <h2 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
              {t('bibleReading.heading')}
            </h2>
          </div>
          <BibleReadingCard />
        </section>

        {/* ── Family Worship ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 rounded-full bg-secondary" />
            <h2 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
              {t('familyWorship.title')}
            </h2>
          </div>
          <FamilyWorshipCard />
        </section>

        {/* Bottom spacer for nav */}
        <div className="h-4" />
      </main>
    </div>
  );
}

export default Home;
