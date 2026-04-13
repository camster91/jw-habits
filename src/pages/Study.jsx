import { BookOpen } from 'lucide-react';
import MeetingCard from '../components/MeetingCard';
import DeeperStudySection from '../components/DeeperStudySection';
import PageHeader from '../components/PageHeader';

function Study() {
  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <PageHeader
        title="Study"
        subtitle="Meeting prep & deeper study"
        icon={BookOpen}
        gradient="from-blue-500 via-indigo-500 to-purple-600"
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