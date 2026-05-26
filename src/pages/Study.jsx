import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MeetingCard from '../components/MeetingCard';
import DeeperStudySection from '../components/DeeperStudySection';
import PageHeader from '../components/PageHeader';

function Study() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <PageHeader
        title={t('study.title')}
        subtitle={t('study.subtitle')}
        icon={BookOpen}
        gradient="from-primary via-primary to-blue-700"
      />

      <main className="container mx-auto px-4 pt-4 space-y-4 max-w-2xl">
        {/* Meeting Preparation */}
        <section>
          <MeetingCard />
        </section>

        {/* Deeper Study */}
        <section>
          <DeeperStudySection />
        </section>
      </main>
    </div>
  );
}

export default Study;