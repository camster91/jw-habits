import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MeetingCard from '../components/MeetingCard';
import DeeperStudySection from '../components/DeeperStudySection';
import ReadingSection from '../components/ReadingSection';
import PageHeader from '../components/PageHeader';
import { haptics } from '../utils/native';

const TABS = [
  { id: 'meetings', label: 'study.meetingsTab', icon: null },
  { id: 'reading', label: 'study.readingTab', icon: null },
];

function Study() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('meetings');

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <PageHeader
        title={t('study.title')}
        subtitle={t('study.subtitle')}
        icon={BookOpen}
      />

      <main className="container mx-auto px-4 pt-4 space-y-4 max-w-2xl">
        {/* ── Tab bar ───────────────────────────────── */}
        <div className="tabs tabs-boxed">
          <button
            onClick={() => { haptics.light(); setTab('meetings'); }}
            className={`tab tab-sm ${tab === 'meetings' ? 'tab-active' : ''}`}
          >
            {t('study.meetingsTab', 'Meetings')}
          </button>
          <button
            onClick={() => { haptics.light(); setTab('reading'); }}
            className={`tab tab-sm ${tab === 'reading' ? 'tab-active' : ''}`}
          >
            {t('study.readingTab', 'Reading')}
          </button>
        </div>

        {tab === 'meetings' ? (
          <>
            <section><MeetingCard /></section>
            <section><DeeperStudySection /></section>
          </>
        ) : (
          <ReadingSection />
        )}
      </main>
    </div>
  );
}

export default Study;
