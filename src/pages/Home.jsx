import { Sun, Moon, CloudSun, Menu } from 'lucide-react';
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
      return { text: t('greeting.morning'), icon: Sun };
    }
    if (hour < 17) {
      return { text: t('greeting.afternoon'), icon: CloudSun };
    }
    return { text: t('greeting.evening'), icon: Moon };
  })();

  const GreetingIcon = greeting.icon;
  const formattedDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header */}
      <PageHeader
        title={greeting.text}
        subtitle={t('greeting.subtitle')}
        gradient="from-primary via-primary to-blue-700"
        titleSize="text-3xl"
        contentClass="pb-10"
        actions={
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-primary-content/70">
              <GreetingIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{formattedDate}</span>
            </div>
            <button
              onClick={openDrawer}
              className="btn btn-ghost btn-sm btn-square text-white/80 hover:text-white"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        }
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-4 space-y-5 max-w-2xl">
        {/* Daily Tasks + Prayer */}
        <section className="animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-base-content uppercase tracking-wider">
              {t('today.title')}
            </h2>
          </div>
          <div className="space-y-3">
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <DailyTasksSection />
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <PrayerTrackingCard />
            </div>
          </div>
        </section>

        {/* Bible Reading */}
        <section className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-base-content/80 uppercase tracking-wider">
              {t('bibleReading.heading')}
            </h2>
          </div>
          <BibleReadingCard />
        </section>

        {/* Family Worship */}
        <section className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-base-content/50 uppercase tracking-wider">
              {t('familyWorship.title')}
            </h2>
          </div>
          <FamilyWorshipCard />
        </section>

      </main>
    </div>
  );
}

export default Home;