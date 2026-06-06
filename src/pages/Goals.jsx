import { Target, FolderKanban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import GoalsTab from '../components/GoalsTab';
import ProjectsTab from '../components/ProjectsTab';
import PageHeader from '../components/PageHeader';
import { useState } from 'react';
import { haptics } from '../utils/native';

function Goals() {
  const [activeTab, setActiveTab] = useState('goals');
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <PageHeader
        title={t('goals.title')}
        subtitle={t('goals.subtitle')}
        icon={Target}
        blurColor="orange"
      />

      <main className="container mx-auto px-4 pt-4 max-w-2xl">
        {/* Tab Switcher */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { haptics.light(); setActiveTab('goals'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95 ${
              activeTab === 'goals'
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-base-200 text-base-content/60'
            }`}
          >
            <Target className="w-4 h-4" />
            {t('goals.goalsTab')}
          </button>
          <button
            onClick={() => { haptics.light(); setActiveTab('projects'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95 ${
              activeTab === 'projects'
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-base-200 text-base-content/60'
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