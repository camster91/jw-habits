import { Target, FolderKanban } from 'lucide-react';
import GoalsTab from '../components/GoalsTab';
import ProjectsTab from '../components/ProjectsTab';
import PageHeader from '../components/PageHeader';
import { useState } from 'react';
import { haptics } from '../utils/native';

function Goals() {
  const [activeTab, setActiveTab] = useState('goals');

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <PageHeader
        title="Goals"
        subtitle="Set and track your spiritual goals"
        icon={Target}
        gradient="from-amber-500 via-amber-600 to-orange-600"
        blurColor="orange"
      />

      <main className="container mx-auto px-4 pt-4 max-w-2xl">
        {/* Tab Switcher */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { haptics.light(); setActiveTab('goals'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95 ${
              activeTab === 'goals'
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                : 'bg-base-200 text-base-content/60'
            }`}
          >
            <Target className="w-4 h-4" />
            Goals
          </button>
          <button
            onClick={() => { haptics.light(); setActiveTab('projects'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95 ${
              activeTab === 'projects'
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                : 'bg-base-200 text-base-content/60'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            Projects
          </button>
        </div>

        {/* Content */}
        {activeTab === 'goals' ? <GoalsTab /> : <ProjectsTab />}
      </main>
    </div>
  );
}

export default Goals;