import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReadingSection from '../components/ReadingSection';

function StudyReading() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <h1 className="ios-large-title"><BookOpen className="w-6 h-6 inline mr-2 text-primary/70" aria-hidden="true" />
        {t("study.readingTab")}
        <span className="sub">{t("bibleReading.title")}</span>
      </h1>

      <main className="container mx-auto px-4 pt-4 space-y-4 max-w-2xl">
        <ReadingSection />
      </main>
    </div>
  );
}

export default StudyReading;
