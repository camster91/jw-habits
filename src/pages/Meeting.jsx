import { Calendar } from 'lucide-react';
import MeetingCard from '../components/MeetingCard';

function Meeting() {
  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header */}
      <header
        className="relative bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-300/10 rounded-full blur-3xl" />
        </div>
        <div className="relative px-4 pt-6 pb-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-sm">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Meeting Prep</h1>
                <p className="text-white/70 text-sm">Bible reading & meeting preparation</p>
              </div>
            </div>
          </div>
        </div>
      </header>

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
