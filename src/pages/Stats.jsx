import { useState } from 'react';
import { TrendingUp, Calendar, Target, Trophy, Star, Flame, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import useProgressStore from '../stores/progressStore';
import useGamificationStore from '../stores/gamificationStore';
import { haptics } from '../utils/native';

function Stats() {
  const [showAllAchievements, setShowAllAchievements] = useState(false);

  const {
    getDailyTextStreak,
    getBibleReadingStreak,
    getCompletionRate
  } = useProgressStore();

  const {
    getAllAchievements,
    getStats,
    getLevel,
    getPointsToNextLevel,
  } = useGamificationStore();

  const dailyTextStreak = getDailyTextStreak();
  const bibleReadingStreak = getBibleReadingStreak();
  const dailyText7Day = getCompletionRate('dailyText', 7);
  const dailyText30Day = getCompletionRate('dailyText', 30);
  const bibleReading7Day = getCompletionRate('bibleReading', 7);
  const bibleReading30Day = getCompletionRate('bibleReading', 30);

  const stats = getStats();
  const level = getLevel();
  const pointsToNext = getPointsToNextLevel();
  const achievements = getAllAchievements();
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

  const displayedAchievements = showAllAchievements
    ? achievements
    : [...unlockedAchievements.slice(0, 4), ...lockedAchievements.slice(0, 2)];

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-blue-700 text-primary-content p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Your Progress</h1>
            <p className="text-sm opacity-90">Track your spiritual journey</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
        {/* Level & XP Card */}
        <div className="card bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-3xl font-bold">{level}</span>
                </div>
                <div>
                  <p className="text-sm opacity-90">Level</p>
                  <p className="text-xl font-bold">{stats.points} XP</p>
                </div>
              </div>
              <div className="text-right">
                <Star className="w-8 h-8 mb-1" />
                <p className="text-xs opacity-90">{pointsToNext} XP to next</p>
              </div>
            </div>
            {/* XP Progress Bar */}
            <div className="mt-4">
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${((100 - pointsToNext) / 100) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-base-100 rounded-xl p-3 text-center shadow">
            <p className="text-2xl font-bold text-primary">{stats.currentStreak}</p>
            <p className="text-xs text-base-content/60">Streak</p>
          </div>
          <div className="bg-base-100 rounded-xl p-3 text-center shadow">
            <p className="text-2xl font-bold text-secondary">{stats.bibleReadingsCompleted}</p>
            <p className="text-xs text-base-content/60">Bible</p>
          </div>
          <div className="bg-base-100 rounded-xl p-3 text-center shadow">
            <p className="text-2xl font-bold text-accent">{stats.goalsCompleted}</p>
            <p className="text-xs text-base-content/60">Goals</p>
          </div>
          <div className="bg-base-100 rounded-xl p-3 text-center shadow">
            <p className="text-2xl font-bold text-info">{stats.reflectionsWritten}</p>
            <p className="text-xs text-base-content/60">Notes</p>
          </div>
        </div>

        {/* Achievements Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h2 className="card-title">
                <Trophy className="w-5 h-5 text-amber-500" />
                Achievements
              </h2>
              <span className="badge badge-primary">
                {stats.achievementsUnlocked}/{stats.totalAchievements}
              </span>
            </div>

            <div className="divider my-2"></div>

            {/* Achievement Grid */}
            <div className="grid grid-cols-2 gap-3">
              {displayedAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    achievement.unlocked
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-base-300 bg-base-200/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">
                      {achievement.unlocked ? achievement.icon : <Lock className="w-6 h-6 text-base-content/30" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${!achievement.unlocked && 'text-base-content/50'}`}>
                        {achievement.name}
                      </p>
                      <p className="text-xs text-base-content/60 line-clamp-2">
                        {achievement.description}
                      </p>
                      <p className={`text-xs mt-1 font-medium ${achievement.unlocked ? 'text-amber-600' : 'text-base-content/40'}`}>
                        +{achievement.points} XP
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Show More/Less Button */}
            <button
              onClick={() => {
                haptics.light();
                setShowAllAchievements(!showAllAchievements);
              }}
              className="btn btn-ghost btn-sm w-full mt-2"
            >
              {showAllAchievements ? (
                <>Show Less <ChevronUp className="w-4 h-4 ml-1" /></>
              ) : (
                <>Show All ({achievements.length}) <ChevronDown className="w-4 h-4 ml-1" /></>
              )}
            </button>
          </div>
        </div>

        {/* Current Streaks */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <Flame className="w-5 h-5 text-orange-500" />
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

              {stats.longestStreak > 0 && (
                <div className="flex items-center justify-center gap-2 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                  <Trophy className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-amber-800 dark:text-amber-200">
                    Longest Streak: {stats.longestStreak} days
                  </span>
                </div>
              )}
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

        {/* Activity Summary */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <Calendar className="w-5 h-5" />
              Activity Summary
            </h2>

            <div className="divider my-2"></div>

            <div className="space-y-3">
              {[
                { label: 'Daily Texts Completed', value: stats.dailyTextCompletions, color: 'text-primary' },
                { label: 'Bible Readings Completed', value: stats.bibleReadingsCompleted, color: 'text-secondary' },
                { label: 'Reflections Written', value: stats.reflectionsWritten, color: 'text-accent' },
                { label: 'News Articles Read', value: stats.newsRead, color: 'text-info' },
                { label: 'Goals Completed', value: stats.goalsCompleted, color: 'text-success' },
                { label: 'Projects Completed', value: stats.projectsCompleted, color: 'text-warning' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-base-content/70">{item.label}</span>
                  <span className={`font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="card bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-xl">
          <div className="card-body text-center">
            <h3 className="text-xl font-bold mb-2">
              {level >= 10
                ? "🏆 Outstanding Achievement!"
                : level >= 5
                ? "🎯 You're on fire!"
                : level >= 2
                ? "💪 Keep up the momentum!"
                : "🌱 Every journey begins with a single step"}
            </h3>
            <p className="text-sm opacity-90">
              {level >= 10
                ? "Your dedication to spiritual routine is truly inspiring!"
                : level >= 5
                ? "You're building excellent spiritual habits!"
                : level >= 2
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
