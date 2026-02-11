import { Suspense, lazy } from 'react';
import { format } from 'date-fns';
import { Sun, Moon, CloudSun, Menu } from 'lucide-react';
import DailyTasksSection from '../components/DailyTasksSection';
import PrayerTrackingCard from '../components/PrayerTrackingCard';
import FamilyWorshipCard from '../components/FamilyWorshipCard';
import { CardLoading } from '../components/LoadingSpinner';
import { useDrawer } from '../components/SideDrawer';

// Lazy load StudyTab for the daily Bible reading section
const StudyTab = lazy(() => import('../components/StudyTab'));

function Home() {
  const today = format(new Date(), 'EEEE, MMMM d');
  const greeting = getGreeting();
  const { openDrawer } = useDrawer();

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header */}
      <header
        className="relative bg-gradient-to-br from-primary via-primary to-blue-700"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-300/10 rounded-full blur-3xl" />
        </div>

        <div className="relative px-4 pt-6 pb-10">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-primary-content/70">
                <greeting.icon className="w-4 h-4" />
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
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {greeting.text}
            </h1>
            <p className="text-primary-content/80 mt-1 text-sm">
              Build your spiritual habits
            </p>
          </div>
        </div>
      </header>

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
