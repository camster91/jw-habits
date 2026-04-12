import { Suspense, lazy } from 'react';
import { format } from 'date-fns';
import { Sun, Moon, CloudSun, Menu } from 'lucide-react';
import DailyTasksSection from '../components/DailyTasksSection';
import PrayerTrackingCard from '../components/PrayerTrackingCard';
import FamilyWorshipCard from '../components/FamilyWorshipCard';
import { CardLoading } from '../components/LoadingSpinner';
import { useDrawer } from '../hooks/useDrawer';
import PageHeader from '../components/PageHeader';

// Lazy load StudyTab for the daily Bible reading section
const StudyTab = lazy(() => import('../components/StudyTab'));

function Home() {
  const today = format(new Date(), 'EEEE, MMMM d');
  const greeting = getGreeting();
  const { openDrawer } = useDrawer();
  const GreetingIcon = greeting.icon;

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header */}
      <PageHeader
        title={greeting.text}
        subtitle="Build your spiritual habits"
        gradient="from-primary via-primary to-blue-700"
        titleSize="text-3xl"
        contentClass="pb-10"
        actions={
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-primary-content/70">
              <GreetingIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{today}</span>
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
        {/* Daily Tasks */}
        <section className="animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
              Today
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

        {/* Family Worship */}
        <section className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
              This Week
            </h2>
          </div>
          <FamilyWorshipCard />
        </section>

        {/* Daily Bible Reading + Deeper Study */}
        <section className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
              Study
            </h2>
          </div>
          <Suspense fallback={<CardLoading />}>
            <StudyTab />
          </Suspense>
        </section>
      </main>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return { text: 'Good Morning', icon: Sun };
  }
  if (hour < 17) {
    return { text: 'Good Afternoon', icon: CloudSun };
  }
  return { text: 'Good Evening', icon: Moon };
}

export default Home;
