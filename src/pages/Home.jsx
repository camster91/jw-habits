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
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

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
      {/* Header with safe area */}
      <header
        className="bg-primary text-primary-content p-4 shadow-lg"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        <h1 className="text-xl font-bold">JW Progress</h1>
        <p className="text-xs opacity-90">{today}</p>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 space-y-4 max-w-2xl">
        {/* Daily Tasks - Always Visible */}
        <section aria-labelledby="daily-tasks-heading">
          <h2
            id="daily-tasks-heading"
            className="text-sm font-semibold text-base-content/70 mb-2 px-1"
          >
            Daily Tasks
          </h2>
          <DailyTasksSection />
        </section>

        {/* Tab Navigation */}
        <nav
          role="tablist"
          aria-label="Content sections"
          className="tabs tabs-boxed bg-base-100 p-1 shadow-md"
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
                className={`tab flex-1 gap-1 transition-all ${isActive ? 'tab-active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <section
          id={`tabpanel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
        >
          <Suspense fallback={<CardLoading />}>
            {renderTabContent()}
          </Suspense>
        </section>
      </main>
    </div>
  );
}

export default Home;
