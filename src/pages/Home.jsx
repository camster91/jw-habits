import DailyTextCard from '../components/DailyTextCard';
import BibleReadingCard from '../components/BibleReadingCard';
import MeetingCard from '../components/MeetingCard';
import StreakCard from '../components/StreakCard';
import QuickLinks from '../components/QuickLinks';
import { format } from 'date-fns';

function Home() {
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-content p-6 shadow-lg">
        <h1 className="text-2xl font-bold">JW Progress</h1>
        <p className="text-sm opacity-90 mt-1">{today}</p>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-2xl">
        <DailyTextCard />
        <BibleReadingCard />
        <MeetingCard />
        <StreakCard />
        <QuickLinks />
      </div>
    </div>
  );
}

export default Home;
