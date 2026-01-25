import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, GraduationCap, Target, FolderKanban } from 'lucide-react';
import DailyTasksSection from '../components/DailyTasksSection';
import MeetingCard from '../components/MeetingCard';
import StudyTab from '../components/StudyTab';
import GoalsTab from '../components/GoalsTab';
import ProjectsTab from '../components/ProjectsTab';

const TABS = [
  { id: 'meeting', label: 'Meeting', icon: Calendar },
  { id: 'study', label: 'Study', icon: GraduationCap },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
];

function Home() {
  const [activeTab, setActiveTab] = useState('meeting');
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

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
      {/* Header */}
      <div className="bg-primary text-primary-content p-4 shadow-lg">
        <h1 className="text-xl font-bold">JW Progress</h1>
        <p className="text-xs opacity-90">{today}</p>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4 space-y-4 max-w-2xl">
        {/* Daily Tasks - Always Visible */}
        <section>
          <h2 className="text-sm font-semibold text-base-content/70 mb-2 px-1">Daily Tasks</h2>
          <DailyTasksSection />
        </section>

        {/* Tab Navigation */}
        <div className="tabs tabs-boxed bg-base-100 p-1 shadow-md">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab flex-1 gap-1 ${activeTab === tab.id ? 'tab-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <section>{renderTabContent()}</section>
      </div>
    </div>
  );
}

export default Home;
