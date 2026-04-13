import { Sun, Moon, CloudSun, Menu, ExternalLink, Newspaper } from 'lucide-react';
import DailyTasksSection from '../components/DailyTasksSection';
import PrayerTrackingCard from '../components/PrayerTrackingCard';
import FamilyWorshipCard from '../components/FamilyWorshipCard';
import BibleReadingCard from '../components/BibleReadingCard';
import { useDrawer } from '../hooks/useDrawer';
import PageHeader from '../components/PageHeader';

function Home() {
  const today = new Date();
  const greeting = getGreeting();
  const { openDrawer } = useDrawer();
  const GreetingIcon = greeting.icon;
  const formattedDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

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

        {/* Bible Reading */}
        <section className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
              Bible Reading
            </h2>
          </div>
          <BibleReadingCard />
        </section>

        {/* What's New on JW.org */}
        <section className="animate-fade-in-up" style={{ animationDelay: '350ms' }}>
          <a
            href="https://www.jw.org/en/whats-new/"
            target="_blank"
            rel="noopener noreferrer"
            className="card bg-base-100 shadow-sm rounded-2xl hover:shadow-md transition-shadow active:scale-[0.98]"
          >
            <div className="card-body p-4 flex-row items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-2xl">
                <Newspaper className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm">What&apos;s New</h3>
                <p className="text-xs text-base-content/50">Latest from JW.org</p>
              </div>
              <ExternalLink className="w-4 h-4 text-base-content/40" />
            </div>
          </a>
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