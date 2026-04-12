import { getDayOfYear } from 'date-fns';
import useSettingsStore from '../stores/settingsStore';
import BibleReadingCard from './BibleReadingCard';
import DeeperStudySection from './DeeperStudySection';

function StudyTab() {
  const calendarDayOfYear = getDayOfYear(new Date());

  const {
    bibleReadingSchedule,
    getEffectiveScheduleDay,
  } = useSettingsStore();

  // Get effective schedule day (custom or default)
  const effectiveScheduleDay = getEffectiveScheduleDay(calendarDayOfYear);

  return (
    <div className="space-y-4">
      <BibleReadingCard
        effectiveScheduleDay={effectiveScheduleDay}
        bibleReadingSchedule={bibleReadingSchedule}
      />
      <DeeperStudySection />
    </div>
  );
}

export default StudyTab;