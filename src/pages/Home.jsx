import { useState, Suspense, lazy } from 'react';
import { format } from 'date-fns';
import { Calendar, GraduationCap, Target, FolderKanban } from 'lucide-react';
import DailyTasksSection from '../components/DailyTasksSection';
import { CardLoading } from '../components/LoadingSpinner';
import { haptics } from '../utils/native';

// Lazy load tab content for better performance
const MeetingCard = lazy(() => import('../components/MeetingCard'));
const StudyTab = lazy(() => import('../components/StudyTab'));
const GoalsTab = lazy(() => import('../components/GoalsTab'));
const ProjectsTab = lazy(() => import('../components/ProjectsTab'));

const TABS = [
  { id: 'meeting', label: 'Meeting', icon: Calendar },
  { id: 'study', label: 'Study', icon: GraduationCap },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
];

function Home() {
  const [activeTab, setActiveTab] = useState('meeting');
  const today = format(new Date(), 'EEEE, MMMM d');

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
    <div className="min-h-screen bg-gradient-to-b from-base-200 to-base-300 pb-24">
      {/* Header with glass effect */}
      <header
        className="header-glass text-primary-content px-4 pb-4 pt-4 shadow-lg sticky top-0 z-40"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        <div className="max-w-2xl mx-auto">
          <p className="text-xs opacity-80 uppercase tracking-wider">{today}</p>
          <h1 className="text-2xl font-bold mt-0.5">Good {getGreeting()}</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 space-y-4 max-w-2xl">
        {/* Daily Tasks - Always Visible */}
        <section aria-labelledby="daily-tasks-heading" className="slide-up">
          <h2
            id="daily-tasks-heading"
            className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-3 px-1"
          >
            Today's Tasks
          </h2>
          <DailyTasksSection />
        </section>

        {/* Tab Navigation */}
        <nav
          role="tablist"
          aria-label="Content sections"
          className="tabs tabs-boxed bg-base-100/80 backdrop-blur-sm p-1.5 shadow-sm sticky top-20 z-30"
          style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                className={`tab flex-1 gap-1.5 font-medium ${
                  isActive ? 'tab-active bg-primary text-primary-content' : 'text-base-content/70'
                }`}
                onClick={() => handleTabChange(tab.id)}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="text-xs sm:text-sm">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <section
          id={`tabpanel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          className="fade-in"
        >
          <Suspense fallback={<CardLoading />}>
            {renderTabContent()}
          </Suspense>
        </section>
      </main>
    </div>
  );
}

// Helper function for time-based greeting
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

export default Home;
