import { Flame } from 'lucide-react';
import useProgressStore from '../stores/progressStore';

function StreakCard() {
  const { getDailyTextStreak, getBibleReadingStreak, getCompletionRate } = useProgressStore();

  const dailyTextStreak = getDailyTextStreak();
  const bibleReadingStreak = getBibleReadingStreak();
  const dailyTextWeekRate = getCompletionRate('dailyText', 7);
  const bibleReadingWeekRate = getCompletionRate('bibleReading', 7);

  return (
    <div className="card bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-xl">
      <div className="card-body">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-6 h-6" />
          <h2 className="card-title text-lg">Your Streaks</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{dailyTextStreak}</div>
            <div className="text-sm opacity-90">Daily Text</div>
            <div className="text-xs opacity-75 mt-1">
              {dailyTextWeekRate}% this week
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold">{bibleReadingStreak}</div>
            <div className="text-sm opacity-90">Bible Reading</div>
            <div className="text-xs opacity-75 mt-1">
              {bibleReadingWeekRate}% this week
            </div>
          </div>
        </div>

        {(dailyTextStreak > 0 || bibleReadingStreak > 0) && (
          <div className="mt-4 text-center">
            <p className="text-sm opacity-90">
              {dailyTextStreak >= 7 && bibleReadingStreak >= 7
                ? "🎉 Amazing! Keep up the great work!"
                : dailyTextStreak >= 3 || bibleReadingStreak >= 3
                ? "💪 You're doing great! Keep it up!"
                : "🌱 Great start! Consistency is key!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default StreakCard;
