import { useState, Suspense, lazy } from 'react';
import { format } from 'date-fns';
import { Calendar, GraduationCap, Target, FolderKanban, Sun, Moon, CloudSun } from 'lucide-react';
import DailyTasksSection from '../components/DailyTasksSection';
import { CardLoading } from '../components/LoadingSpinner';
import { haptics } from '../utils/native';

// Lazy load tab content for better performance
const MeetingCard = lazy(() => import('../components/MeetingCard'));
const StudyTab = lazy(() => import('../components/StudyTab'));
const GoalsTab = lazy(() => import('../components/GoalsTab'));
const ProjectsTab = lazy(() => import('../components/ProjectsTab'));

const TABS = [
  { id: 'meeting', label: 'Meeting', icon: Calendar, color: 'from-blue-500 to-indigo-600' },
  { id: 'study', label: 'Study', icon: GraduationCap, color: 'from-emerald-500 to-teal-600' },
  { id: 'goals', label: 'Goals', icon: Target, color: 'from-amber-500 to-orange-600' },
  { id: 'projects', label: 'Projects', icon: FolderKanban, color: 'from-purple-500 to-pink-600' },
];

function Home() {
  const [activeTab, setActiveTab] = useState('meeting');
  const today = format(new Date(), 'EEEE, MMMM d');
  const greeting = getGreeting();

  const handleTabChange = (tabId) => {
    if (tabId !== activeTab) {
      haptics.selection();
      setActiveTab(tabId);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'meeting':
        return <MeetingCard />;
      case 'study':
        return <StudyTab />;
      case 'goals':
        return <GoalsTab />;
      case 'projects':
        return <ProjectsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Modern Header */}
      <header
        className="relative bg-gradient-to-br from-primary via-primary to-blue-700"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Decorative blurs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-300/10 rounded-full blur-3xl" />
        </div>

        <div className="relative px-4 pt-6 pb-10">
          <div className="max-w-2xl mx-auto">
            {/* Date & Greeting */}
            <div className="flex items-center gap-2 text-primary-content/70 mb-1">
              <greeting.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{today}</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {greeting.text}
            </h1>
            <p className="text-primary-content/80 mt-1 text-sm">
              Track your spiritual progress
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-4 space-y-5 max-w-2xl">
        {/* Daily Tasks */}
        <section className="animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
              Today
            </h2>
          </div>
          <DailyTasksSection />
        </section>

        {/* Tab Navigation - Modern Pills */}
        <nav
          role="tablist"
          aria-label="Content sections"
          className="flex gap-2 overflow-x-auto scrollbar-hide py-1 -mx-4 px-4"
        >
          {TABS.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg shadow-${tab.color.split('-')[1]}-500/25`
                    : 'bg-base-100 text-base-content/60 hover:bg-base-100/80'
                }`}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <section
          id={`tabpanel-${activeTab}`}
          role="tabpanel"
          className="animate-slide-up"
        >
          <Suspense fallback={<CardLoading />}>
            {renderTabContent()}
          </Suspense>
        </section>
      </main>
    </div>
  );
}

// Get greeting based on time of day
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
