import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, differenceInDays, parseISO, startOfDay } from 'date-fns';

// Achievement definitions
const ACHIEVEMENTS = [
  // Daily Text achievements
  { id: 'first_text', name: 'First Steps', description: 'Complete your first Daily Text', icon: '🌱', points: 10, category: 'dailyText' },
  { id: 'week_streak', name: 'Week Warrior', description: '7-day Daily Text streak', icon: '🔥', points: 50, category: 'streak' },
  { id: 'month_streak', name: 'Monthly Master', description: '30-day Daily Text streak', icon: '⭐', points: 200, category: 'streak' },
  { id: 'quarter_streak', name: 'Quarterly Champion', description: '90-day Daily Text streak', icon: '🏆', points: 500, category: 'streak' },
  { id: 'year_streak', name: 'Yearly Legend', description: '365-day Daily Text streak', icon: '👑', points: 2000, category: 'streak' },

  // Reflection achievements
  { id: 'first_reflection', name: 'Thoughtful', description: 'Write your first reflection', icon: '📝', points: 15, category: 'reflection' },
  { id: 'reflections_10', name: 'Deep Thinker', description: 'Write 10 reflections', icon: '💭', points: 50, category: 'reflection' },
  { id: 'reflections_50', name: 'Philosopher', description: 'Write 50 reflections', icon: '📚', points: 150, category: 'reflection' },
  { id: 'reflections_100', name: 'Wisdom Keeper', description: 'Write 100 reflections', icon: '🦉', points: 300, category: 'reflection' },

  // News achievements
  { id: 'news_reader', name: 'Informed', description: 'Read 10 news articles', icon: '📰', points: 25, category: 'news' },
  { id: 'news_enthusiast', name: 'News Enthusiast', description: 'Read 50 news articles', icon: '🗞️', points: 100, category: 'news' },

  // Study achievements
  { id: 'bible_reader', name: 'Bible Student', description: 'Complete daily Bible reading 7 times', icon: '📖', points: 50, category: 'study' },
  { id: 'bible_scholar', name: 'Bible Scholar', description: 'Complete daily Bible reading 30 times', icon: '🎓', points: 200, category: 'study' },

  // Goal achievements
  { id: 'first_goal', name: 'Goal Setter', description: 'Complete your first goal', icon: '🎯', points: 20, category: 'goals' },
  { id: 'goals_5', name: 'Achiever', description: 'Complete 5 goals', icon: '🏅', points: 75, category: 'goals' },
  { id: 'goals_20', name: 'Overachiever', description: 'Complete 20 goals', icon: '🌟', points: 250, category: 'goals' },

  // Project achievements
  { id: 'first_project', name: 'Project Starter', description: 'Complete your first project', icon: '📋', points: 30, category: 'projects' },
  { id: 'projects_5', name: 'Project Manager', description: 'Complete 5 projects', icon: '📊', points: 100, category: 'projects' },

  // Meeting achievements
  { id: 'meeting_prepared', name: 'Well Prepared', description: 'Prepare for 10 meetings', icon: '✅', points: 50, category: 'meetings' },
];

const useGamificationStore = create(
  persist(
    (set, get) => ({
      // Total points
      points: 0,

      // Streak tracking
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,

      // Activity tracking
      dailyTextCompletions: 0,
      reflectionsWritten: 0,
      newsRead: 0,
      bibleReadingsCompleted: 0,
      goalsCompleted: 0,
      projectsCompleted: 0,
      meetingsPrepared: 0,

      // Unlocked achievements
      unlockedAchievements: [],

      // Recent activity for notifications
      recentAchievements: [],

      // Level calculation (every 100 points = 1 level)
      getLevel: () => {
        const state = get();
        return Math.floor(state.points / 100) + 1;
      },

      // Points to next level
      getPointsToNextLevel: () => {
        const state = get();
        return 100 - (state.points % 100);
      },

      // Get all achievements with unlock status
      getAllAchievements: () => {
        const state = get();
        return ACHIEVEMENTS.map(achievement => ({
          ...achievement,
          unlocked: state.unlockedAchievements.includes(achievement.id),
          unlockedAt: state.unlockedAchievements.includes(achievement.id)
            ? state.achievementDates?.[achievement.id]
            : null,
        }));
      },

      // Achievement dates tracking
      achievementDates: {},

      // Add points
      addPoints: (amount) =>
        set((state) => ({ points: state.points + amount })),

      // Update streak
      updateStreak: () => {
        const state = get();
        const today = format(new Date(), 'yyyy-MM-dd');

        if (state.lastActivityDate === today) {
          return; // Already updated today
        }

        let newStreak = 1;

        if (state.lastActivityDate) {
          const lastDate = parseISO(state.lastActivityDate);
          const todayDate = startOfDay(new Date());
          const daysDiff = differenceInDays(todayDate, startOfDay(lastDate));

          if (daysDiff === 1) {
            // Consecutive day
            newStreak = state.currentStreak + 1;
          } else if (daysDiff === 0) {
            // Same day
            newStreak = state.currentStreak;
          }
          // If > 1 day gap, streak resets to 1
        }

        set({
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, state.longestStreak),
          lastActivityDate: today,
        });

        // Check streak achievements
        get().checkAchievements();
      },

      // Record daily text completion
      recordDailyTextCompletion: () => {
        set((state) => ({
          dailyTextCompletions: state.dailyTextCompletions + 1,
        }));
        get().updateStreak();
        get().addPoints(5);
        get().checkAchievements();
      },

      // Record reflection written
      recordReflection: () => {
        set((state) => ({
          reflectionsWritten: state.reflectionsWritten + 1,
        }));
        get().addPoints(10);
        get().checkAchievements();
      },

      // Record news read
      recordNewsRead: () => {
        set((state) => ({
          newsRead: state.newsRead + 1,
        }));
        get().addPoints(2);
        get().checkAchievements();
      },

      // Record Bible reading completed
      recordBibleReading: () => {
        set((state) => ({
          bibleReadingsCompleted: state.bibleReadingsCompleted + 1,
        }));
        get().addPoints(5);
        get().checkAchievements();
      },

      // Record goal completed
      recordGoalCompleted: () => {
        set((state) => ({
          goalsCompleted: state.goalsCompleted + 1,
        }));
        get().addPoints(20);
        get().checkAchievements();
      },

      // Record project completed
      recordProjectCompleted: () => {
        set((state) => ({
          projectsCompleted: state.projectsCompleted + 1,
        }));
        get().addPoints(50);
        get().checkAchievements();
      },

      // Record meeting prepared
      recordMeetingPrepared: () => {
        set((state) => ({
          meetingsPrepared: state.meetingsPrepared + 1,
        }));
        get().addPoints(10);
        get().checkAchievements();
      },

      // Check and unlock achievements
      checkAchievements: () => {
        const state = get();
        const newAchievements = [];

        ACHIEVEMENTS.forEach((achievement) => {
          if (state.unlockedAchievements.includes(achievement.id)) return;

          let shouldUnlock = false;

          switch (achievement.id) {
            case 'first_text':
              shouldUnlock = state.dailyTextCompletions >= 1;
              break;
            case 'week_streak':
              shouldUnlock = state.currentStreak >= 7;
              break;
            case 'month_streak':
              shouldUnlock = state.currentStreak >= 30;
              break;
            case 'quarter_streak':
              shouldUnlock = state.currentStreak >= 90;
              break;
            case 'year_streak':
              shouldUnlock = state.currentStreak >= 365;
              break;
            case 'first_reflection':
              shouldUnlock = state.reflectionsWritten >= 1;
              break;
            case 'reflections_10':
              shouldUnlock = state.reflectionsWritten >= 10;
              break;
            case 'reflections_50':
              shouldUnlock = state.reflectionsWritten >= 50;
              break;
            case 'reflections_100':
              shouldUnlock = state.reflectionsWritten >= 100;
              break;
            case 'news_reader':
              shouldUnlock = state.newsRead >= 10;
              break;
            case 'news_enthusiast':
              shouldUnlock = state.newsRead >= 50;
              break;
            case 'bible_reader':
              shouldUnlock = state.bibleReadingsCompleted >= 7;
              break;
            case 'bible_scholar':
              shouldUnlock = state.bibleReadingsCompleted >= 30;
              break;
            case 'first_goal':
              shouldUnlock = state.goalsCompleted >= 1;
              break;
            case 'goals_5':
              shouldUnlock = state.goalsCompleted >= 5;
              break;
            case 'goals_20':
              shouldUnlock = state.goalsCompleted >= 20;
              break;
            case 'first_project':
              shouldUnlock = state.projectsCompleted >= 1;
              break;
            case 'projects_5':
              shouldUnlock = state.projectsCompleted >= 5;
              break;
            case 'meeting_prepared':
              shouldUnlock = state.meetingsPrepared >= 10;
              break;
          }

          if (shouldUnlock) {
            newAchievements.push(achievement);
          }
        });

        if (newAchievements.length > 0) {
          const now = new Date().toISOString();
          set((state) => ({
            unlockedAchievements: [
              ...state.unlockedAchievements,
              ...newAchievements.map((a) => a.id),
            ],
            achievementDates: {
              ...state.achievementDates,
              ...Object.fromEntries(newAchievements.map((a) => [a.id, now])),
            },
            points: state.points + newAchievements.reduce((sum, a) => sum + a.points, 0),
            recentAchievements: newAchievements,
          }));
        }
      },

      // Clear recent achievements (after showing notification)
      clearRecentAchievements: () => set({ recentAchievements: [] }),

      // Get stats for display
      getStats: () => {
        const state = get();
        return {
          points: state.points,
          level: get().getLevel(),
          pointsToNextLevel: get().getPointsToNextLevel(),
          currentStreak: state.currentStreak,
          longestStreak: state.longestStreak,
          dailyTextCompletions: state.dailyTextCompletions,
          reflectionsWritten: state.reflectionsWritten,
          newsRead: state.newsRead,
          bibleReadingsCompleted: state.bibleReadingsCompleted,
          goalsCompleted: state.goalsCompleted,
          projectsCompleted: state.projectsCompleted,
          achievementsUnlocked: state.unlockedAchievements.length,
          totalAchievements: ACHIEVEMENTS.length,
        };
      },
    }),
    {
      name: 'jw-gamification-storage',
      version: 1,
    }
  )
);

export default useGamificationStore;
