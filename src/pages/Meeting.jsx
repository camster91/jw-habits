import { Calendar } from 'lucide-react';
import MeetingCard from '../components/MeetingCard';
import PageHeader from '../components/PageHeader';

function Meeting() {
  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header */}
      <PageHeader
        title="Meeting Prep"
        subtitle="Bible reading & meeting preparation"
        icon={Calendar}
        gradient="from-blue-500 via-blue-600 to-indigo-700"
        blurColor="indigo"
      />

      {/* Content */}
      <main className="container mx-auto px-4 pt-4 space-y-4 max-w-2xl">
        <section className="animate-fade-in-up">
          <MeetingCard />
        </section>
      </main>
    </div>
  );
}

export default Meeting;
