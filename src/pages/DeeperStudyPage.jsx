import { useTranslation } from 'react-i18next';
import DeeperStudySection from '../components/DeeperStudySection';
import PageHeader from '../components/PageHeader';
import { GraduationCap } from 'lucide-react';

function DeeperStudyPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <PageHeader
        title={t('study.deeperStudy')}
        subtitle={t('study.researchTools')}
        icon={GraduationCap}
      />

      <main className="container mx-auto px-4 pt-4 space-y-4 max-w-2xl">
        <DeeperStudySection />
      </main>
    </div>
  );
}

export default DeeperStudyPage;
