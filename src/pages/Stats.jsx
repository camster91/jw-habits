import { TrendingUp, Calendar, Target } from 'lucide-react';
import useProgressStore from '../stores/progressStore';

function Stats() {
  const {
    getDailyTextStreak,
    getBibleReadingStreak,
    getCompletionRate
  } = useProgressStore();

  const dailyTextStreak = getDailyTextStreak();
  const bibleReadingStreak = getBibleReadingStreak();
  const dailyText7Day = getCompletionRate('dailyText', 7);
  const dailyText30Day = getCompletionRate('dailyText', 30);
  const bibleReading7Day = getCompletionRate('bibleReading', 7);
  const bibleReading30Day = getCompletionRate('bibleReading', 30);

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-content p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Your Progress</h1>
            <p className="text-sm opacity-90">Track your spiritual routine</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
        {/* Current Streaks */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <Calendar className="w-5 h-5" />
              Current Streaks
            </h2>

            <div className="divider my-2"></div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Daily Text</span>
                  <span className="text-2xl font-bold text-primary">
                    {dailyTextStreak} days
                  </span>
                </div>
                <progress
                  className="progress progress-primary w-full"
                  value={dailyTextStreak}
                  max="30"
                ></progress>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Bible Reading</span>
                  <span className="text-2xl font-bold text-secondary">
                    {bibleReadingStreak} days
                  </span>
                </div>
                <progress
                  className="progress progress-secondary w-full"
                  value={bibleReadingStreak}
                  max="30"
                ></progress>
              </div>
            </div>
          </div>
        </div>

        {/* Completion Rates */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <Target className="w-5 h-5" />
              Completion Rates
            </h2>

            <div className="divider my-2"></div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-primary/10">
                <div className="text-3xl font-bold text-primary">{dailyText7Day}%</div>
                <div className="text-sm text-base-content/70 mt-1">
                  Daily Text (7 days)
                </div>
              </div>

              <div className="text-center p-4 rounded-lg bg-primary/10">
                <div className="text-3xl font-bold text-primary">{dailyText30Day}%</div>
                <div className="text-sm text-base-content/70 mt-1">
                  Daily Text (30 days)
                </div>
              </div>

              <div className="text-center p-4 rounded-lg bg-secondary/10">
                <div className="text-3xl font-bold text-secondary">{bibleReading7Day}%</div>
                <div className="text-sm text-base-content/70 mt-1">
                  Bible Reading (7 days)
                </div>
              </div>

              <div className="text-center p-4 rounded-lg bg-secondary/10">
                <div className="text-3xl font-bold text-secondary">{bibleReading30Day}%</div>
                <div className="text-sm text-base-content/70 mt-1">
                  Bible Reading (30 days)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="card bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-xl">
          <div className="card-body text-center">
            <h3 className="text-xl font-bold mb-2">
              {dailyTextStreak >= 30 || bibleReadingStreak >= 30
                ? "🏆 Outstanding Achievement!"
                : dailyTextStreak >= 14 || bibleReadingStreak >= 14
                ? "🎯 You're on fire!"
                : dailyTextStreak >= 7 || bibleReadingStreak >= 7
                ? "💪 Keep up the momentum!"
                : "🌱 Every journey begins with a single step"}
            </h3>
            <p className="text-sm opacity-90">
              {dailyTextStreak >= 30 || bibleReadingStreak >= 30
                ? "Your dedication to spiritual routine is truly inspiring!"
                : dailyTextStreak >= 14 || bibleReadingStreak >= 14
                ? "You're building excellent spiritual habits!"
                : dailyTextStreak >= 7 || bibleReadingStreak >= 7
                ? "Great progress! Consistency is the key to success."
                : "Start today and watch your spiritual routine flourish!"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Stats;
