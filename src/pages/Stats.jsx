import { useState } from 'react';
import { TrendingUp, Calendar, Target, Trophy, Star, Flame, Lock, ChevronDown, ChevronUp , Sprout} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useProgressStore from '../stores/progressStore';
import useGamificationStore from '../stores/gamificationStore';
import { haptics } from '../utils/native';

function Stats() {
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const { t } = useTranslation();

  // Hooks must be called unconditionally and in the same order on every render.
  // Moving them outside the try/catch avoids the React "rules-of-hooks" violation
  // and the silent inconsistent-state bugs that come from a hook throwing inside
  // a try block.
  const getDailyTextStreak = useProgressStore((s) => s.getDailyTextStreak);
  const getBibleReadingStreak = useProgressStore((s) => s.getBibleReadingStreak);
  const getPrayerStreak = useProgressStore((s) => s.getPrayerStreak);
  const getFamilyWorshipStreak = useProgressStore((s) => s.getFamilyWorshipStreak);
  const getCompletionRate = useProgressStore((s) => s.getCompletionRate);

  const getAllAchievements = useGamificationStore((s) => s.getAllAchievements);
  const getStats = useGamificationStore((s) => s.getStats);
  const getLevel = useGamificationStore((s) => s.getLevel);
  const getPointsToNextLevel = useGamificationStore((s) => s.getPointsToNextLevel);

  let dailyTextStreak = 0;
  let bibleReadingStreak = 0;
  let prayerStreak = 0;
  let familyWorshipStreak = 0;
  let dailyText7Day = 0;
  let dailyText30Day = 0;
  let bibleReading7Day = 0;
  let bibleReading30Day = 0;
  let stats = {};
  let level = 1;
  let pointsToNext = 100;
  let achievements = [];
  let unlockedAchievements = [];
  let lockedAchievements = [];
  let displayedAchievements = [];

  try {
    dailyTextStreak = getDailyTextStreak?.() ?? 0;
    bibleReadingStreak = getBibleReadingStreak?.() ?? 0;
    prayerStreak = getPrayerStreak?.() ?? 0;
    familyWorshipStreak = getFamilyWorshipStreak?.() ?? 0;
    dailyText7Day = getCompletionRate?.('dailyText', 7) ?? 0;
    dailyText30Day = getCompletionRate?.('dailyText', 30) ?? 0;
    bibleReading7Day = getCompletionRate?.('bibleReading', 7) ?? 0;
    bibleReading30Day = getCompletionRate?.('bibleReading', 30) ?? 0;

    stats = getStats?.() ?? {};
    level = getLevel?.() ?? 1;
    pointsToNext = getPointsToNextLevel?.() ?? 100;
    achievements = getAllAchievements?.() ?? [];
    unlockedAchievements = achievements.filter(a => a.unlocked);
    lockedAchievements = achievements.filter(a => !a.unlocked);

    displayedAchievements = showAllAchievements
      ? achievements
      : [...unlockedAchievements.slice(0, 4), ...lockedAchievements.slice(0, 2)];
  } catch (e) {
    console.error('Stats page data error:', e);
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-lg font-semibold">Unable to load statistics</p>
          <p className="text-sm text-base-content/70 mt-2">Please try again later</p>
        </div>
      </div>
    );
  }

    return (
      <div className="min-h-screen bg-base-200 pb-24">
        {/* iOS-style stats page top */}
      <h1 className="ios-large-title">
        <TrendingUp className="w-6 h-6 inline mr-2 text-primary/70" aria-hidden="true" />
        {t('stats.title')}
        <span className="sub">{t('stats.subtitle')}</span>
      </h1>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
        {/* Level & XP Card */}
        <div className="card bg-primary/90 text-white animate-fade-in-up">
          <div className="p-4">
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
        <div className="grid grid-cols-4 gap-2 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="bg-base-100 rounded-xl p-3 text-center shadow">
            <p className="text-2xl font-bold text-primary">{dailyTextStreak}</p>
            <p className="text-xs text-base-content/70">{t('stats.streak')}</p>
          </div>
          <div className="bg-base-100 rounded-xl p-3 text-center shadow">
            <p className="text-2xl font-bold text-secondary">{stats.bibleReadingsCompleted}</p>
            <p className="text-xs text-base-content/70">{t('stats.bible')}</p>
          </div>
          <div className="bg-base-100 rounded-xl p-3 text-center shadow">
            <p className="text-2xl font-bold text-accent">{stats.goalsCompleted}</p>
            <p className="text-xs text-base-content/70">{t('stats.goals')}</p>
          </div>
          <div className="bg-base-100 rounded-xl p-3 text-center shadow">
            <p className="text-2xl font-bold text-info">{stats.reflectionsWritten}</p>
            <p className="text-xs text-base-content/70">{t('stats.notes')}</p>
          </div>
        </div>

        {/* Achievements Card */}
        <div className="ios-grouped animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="card-title">
                <Trophy className="w-5 h-5 text-primary" />
                {t('stats.achievements')}
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
                      {achievement.unlocked ? achievement.icon : <Lock className="w-6 h-6 text-base-content/70" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${!achievement.unlocked && 'text-base-content/70'}`}>
                        {achievement.name}
                      </p>
                      <p className="text-xs text-base-content/70 line-clamp-2">
                        {achievement.description}
                      </p>
                      <p className={`text-xs mt-1 font-medium ${achievement.unlocked ? 'text-amber-600' : 'text-base-content/70'}`}>
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
                <>{t('stats.showLess')} <ChevronUp className="w-4 h-4 ml-1" /></>
              ) : (
                <>{t('stats.showAll')} ({achievements.length}) <ChevronDown className="w-4 h-4 ml-1" /></>
              )}
            </button>
          </div>
        </div>

        {/* Current Streaks */}
        <div className="ios-grouped animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="p-4">
            <h2 className="card-title">
              <Flame className="w-5 h-5 text-orange-500 animate-flame" />
              {t('stats.currentStreaks')}
            </h2>

            <div className="divider my-2"></div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{t('stats.dailyText')}</span>
                  <span className="text-2xl font-bold text-primary">
                    {dailyTextStreak} {t('stats.days')}
                  </span>
                </div>
                <progress
                  className="progress progress-primary w-full transition-all duration-500"
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
                  className="progress progress-secondary w-full transition-all duration-500"
                  value={bibleReadingStreak}
                  max="30"
                ></progress>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Daily Prayers</span>
                  <span className="text-2xl font-bold text-primary">
                    {prayerStreak} days
                  </span>
                </div>
                <progress
                  className="progress progress-accent w-full transition-all duration-500"
                  value={prayerStreak}
                  max="30"
                ></progress>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Family Worship</span>
                  <span className="text-2xl font-bold text-secondary">
                    {familyWorshipStreak} weeks
                  </span>
                </div>
                <progress
                  className="progress progress-info w-full transition-all duration-500"
                  value={familyWorshipStreak}
                  max="12"
                ></progress>
              </div>

              {Math.max(dailyTextStreak, bibleReadingStreak, prayerStreak) > 0 && (
                <div className="flex items-center justify-center gap-2 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl animate-pulse">
                  <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium text-amber-800 dark:text-amber-200">
                    Best Current Streak: {Math.max(dailyTextStreak, bibleReadingStreak, prayerStreak)} days
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Completion Rates */}
        <div className="ios-grouped animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <div className="p-4">
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
        <div className="ios-grouped animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <div className="p-4">
            <h2 className="card-title">
              <Calendar className="w-5 h-5" />
              Activity Summary
            </h2>

            <div className="divider my-2"></div>

            <div className="space-y-3">
              {[
                { label: 'Daily Texts Completed', value: stats.dailyTextCompletions, color: 'text-primary' },
                { label: 'Bible Readings Completed', value: stats.bibleReadingsCompleted, color: 'text-secondary' },
                { label: 'Prayers Completed', value: stats.prayersCompleted || 0, color: 'text-primary' },
                { label: 'Family Worship Sessions', value: stats.familyWorshipCompleted || 0, color: 'text-secondary' },
                { label: 'Reflections Written', value: stats.reflectionsWritten, color: 'text-accent' },
                { label: 'News Articles Read', value: stats.newsRead, color: 'text-info' },
                { label: 'Goals Completed', value: stats.goalsCompleted, color: 'text-success' },
                { label: 'Projects Completed', value: stats.projectsCompleted, color: 'text-warning' },
              ].map((item, index) => (
                <div
                  key={item.label}
                  className="flex justify-between items-center"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <span className="text-base-content/70">{item.label}</span>
                  <span className={`font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="card bg-primary/90 text-white animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <div className="card-body text-center">
            <h2 className="text-xl font-bold mb-2">
              {level >= 10
                ? <><Trophy className="w-4 h-4 inline mr-1" /> Outstanding Achievement!</>
                : level >= 5
                ? <><Target className="w-4 h-4 inline mr-1" /> You're on fire!</>
                : level >= 2
                ? <><TrendingUp className="w-4 h-4 inline mr-1" /> Keep up the momentum!</>
                : <><Sprout className="w-4 h-4 inline mr-1" /> Every journey begins with a single step</>}
            </h2>
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
