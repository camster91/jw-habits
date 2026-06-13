import { Target, FolderKanban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import GoalsTab from '../components/GoalsTab';
import ProjectsTab from '../components/ProjectsTab';
import { useState } from 'react';
import { haptics } from '../utils/native';

function Goals() {
  // Preselect tab + header from URL: /projects → projects, /goals → goals
  const isProjectsRoute = typeof window !== 'undefined' && window.location?.pathname === '/projects';
  const [activeTab, setActiveTab] = useState(isProjectsRoute ? 'projects' : 'goals');
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <h1 className="ios-large-title">
        {activeTab === 'projects'
          ? <FolderKanban className="w-6 h-6 inline mr-2 text-primary/70" aria-hidden="true" />
          : <Target className="w-6 h-6 inline mr-2 text-primary/70" aria-hidden="true" />
        }
        {activeTab === 'projects' ? t('goals.projectsTitle', 'Projects') : t('goals.title', 'Goals')}
        <span className="sub">
          {activeTab === 'projects'
            ? t('goals.projectsSubtitle', 'Group goals into bigger projects')
            : t('goals.subtitle', 'Set and track your spiritual goals')}
        </span>
      </h1>

      <main className="container mx-auto px-4 pt-4 max-w-2xl">
        {/* Tab Switcher */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { haptics.light(); setActiveTab('goals'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95 ${
              activeTab === 'goals'
                ? 'bg-primary text-white'
                : 'bg-base-200 text-base-content/70'
            }`}
          >
            <Target className="w-4 h-4" />
            {t('goals.goalsTab')}
          </button>
          <button
            onClick={() => { haptics.light(); setActiveTab('projects'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95 ${
              activeTab === 'projects'
                ? 'bg-primary text-white'
                : 'bg-base-200 text-base-content/70'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            {t('goals.projectsTab')}
          </button>
        </div>

        {/* Content */}
        {activeTab === 'goals' ? <GoalsTab /> : <ProjectsTab />}
      </main>
    </div>
  );
}

export default Goals;