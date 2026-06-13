import { useTranslation } from 'react-i18next';
import DeeperStudySection from '../components/DeeperStudySection';
import { GraduationCap } from 'lucide-react';

function DeeperStudyPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <h1 className="ios-large-title"><GraduationCap className="w-6 h-6 inline mr-2 text-primary/70" aria-hidden="true" />
        {t("study.deeperStudy")}
        <span className="sub">{t("study.researchTools")}</span>
      </h1>

      <main className="container mx-auto px-4 pt-4 space-y-4 max-w-2xl">
        <DeeperStudySection />
      </main>
    </div>
  );
}

export default DeeperStudyPage;
