import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReadingSection from '../components/ReadingSection';
import PageHeader from '../components/PageHeader';

function StudyReading() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <PageHeader
        title={t('study.readingTab')}
        subtitle={t('bibleReading.title')}
        icon={BookOpen}
        gradient="from-primary via-primary to-blue-700"
      />

      <main className="container mx-auto px-4 pt-4 space-y-4 max-w-2xl">
        <ReadingSection />
      </main>
    </div>
  );
}

export default StudyReading;
