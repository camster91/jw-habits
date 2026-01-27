import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, differenceInDays, parseISO, startOfDay } from 'date-fns';

// Achievement definitions
const ACHIEVEMENTS = [
  // Daily Text achievements
  { id: 'first_text', name: 'First Steps', description: 'Complete your first Daily Text', icon: '🌱', points: 10, category: 'dailyText' },
  { id: 'text_week', name: 'Dedicated Reader', description: 'Read Daily Text 7 days in a row', icon: '📖', points: 50, category: 'dailyText' },
  { id: 'text_month', name: 'Daily Discipline', description: 'Read Daily Text 30 days in a row', icon: '📚', points: 200, category: 'dailyText' },

  // Prayer achievements
  { id: 'first_prayer', name: 'First Prayer', description: 'Complete your first daily prayer', icon: '🙏', points: 10, category: 'prayer' },
  { id: 'prayer_complete', name: 'Prayer Warrior', description: 'Complete all 3 prayers in a day', icon: '✨', points: 15, category: 'prayer' },
  { id: 'prayer_week', name: 'Prayerful Week', description: '7-day prayer streak (all 3 daily)', icon: '💫', points: 75, category: 'prayer' },
  { id: 'prayer_month', name: 'Prayer Master', description: '30-day prayer streak', icon: '🌟', points: 300, category: 'prayer' },

  // Family Worship achievements
  { id: 'first_worship', name: 'Family First', description: 'Complete your first family worship', icon: '👨‍👩‍👧', points: 25, category: 'familyWorship' },
  { id: 'worship_month', name: 'Family Focused', description: '4 weeks of family worship', icon: '🏠', points: 100, category: 'familyWorship' },
  { id: 'worship_quarter', name: 'Family Tradition', description: '12 weeks of family worship', icon: '💝', points: 300, category: 'familyWorship' },

  // Overall streak achievements
  { id: 'week_streak', name: 'Week Warrior', description: '7-day overall streak', icon: '🔥', points: 50, category: 'streak' },
  { id: 'month_streak', name: 'Monthly Master', description: '30-day overall streak', icon: '⭐', points: 200, category: 'streak' },
  { id: 'quarter_streak', name: 'Quarterly Champion', description: '90-day overall streak', icon: '🏆', points: 500, category: 'streak' },
  { id: 'year_streak', name: 'Yearly Legend', description: '365-day overall streak', icon: '👑', points: 2000, category: 'streak' },

  // Reflection achievements
  { id: 'first_reflection', name: 'Thoughtful', description: 'Write your first reflection', icon: '📝', points: 15, category: 'reflection' },
  { id: 'reflections_10', name: 'Deep Thinker', description: 'Write 10 reflections', icon: '💭', points: 50, category: 'reflection' },
  { id: 'reflections_50', name: 'Contemplative', description: 'Write 50 reflections', icon: '📚', points: 150, category: 'reflection' },
  { id: 'reflections_100', name: 'Wisdom Keeper', description: 'Write 100 reflections', icon: '🦉', points: 300, category: 'reflection' },

  // News achievements
  { id: 'news_reader', name: 'Informed', description: 'Read 10 news articles', icon: '📰', points: 25, category: 'news' },
  { id: 'news_enthusiast', name: 'News Enthusiast', description: 'Read 50 news articles', icon: '🗞️', points: 100, category: 'news' },
  { id: 'news_master', name: 'Always Updated', description: 'Read 100 news articles', icon: '📡', points: 200, category: 'news' },

  // Study achievements
  { id: 'bible_reader', name: 'Bible Student', description: 'Complete daily Bible reading 7 times', icon: '📖', points: 50, category: 'study' },
  { id: 'bible_scholar', name: 'Bible Scholar', description: 'Complete daily Bible reading 30 times', icon: '🎓', points: 200, category: 'study' },
  { id: 'bible_master', name: 'Scripture Master', description: 'Complete daily Bible reading 100 times', icon: '🏛️', points: 500, category: 'study' },

  // Goal achievements
  { id: 'first_goal', name: 'Goal Setter', description: 'Complete your first goal', icon: '🎯', points: 20, category: 'goals' },
  { id: 'goals_5', name: 'Achiever', description: 'Complete 5 goals', icon: '🏅', points: 75, category: 'goals' },
  { id: 'goals_10', name: 'High Achiever', description: 'Complete 10 goals', icon: '🥇', points: 150, category: 'goals' },
  { id: 'goals_20', name: 'Overachiever', description: 'Complete 20 goals', icon: '🌟', points: 250, category: 'goals' },

  // Project achievements
  { id: 'first_project', name: 'Project Starter', description: 'Complete your first project', icon: '📋', points: 30, category: 'projects' },
  { id: 'projects_5', name: 'Project Manager', description: 'Complete 5 projects', icon: '📊', points: 100, category: 'projects' },
  { id: 'projects_10', name: 'Project Master', description: 'Complete 10 projects', icon: '🗂️', points: 250, category: 'projects' },

  // Meeting achievements
  { id: 'first_meeting', name: 'Prepared', description: 'Prepare for your first meeting', icon: '📝', points: 15, category: 'meetings' },
  { id: 'meeting_prepared', name: 'Well Prepared', description: 'Prepare for 10 meetings', icon: '✅', points: 50, category: 'meetings' },
  { id: 'meeting_master', name: 'Meeting Master', description: 'Prepare for 50 meetings', icon: '🎖️', points: 200, category: 'meetings' },

  // Level achievements
  { id: 'level_5', name: 'Rising Star', description: 'Reach level 5', icon: '⭐', points: 0, category: 'level' },
  { id: 'level_10', name: 'Dedicated', description: 'Reach level 10', icon: '🌟', points: 0, category: 'level' },
  { id: 'level_25', name: 'Committed', description: 'Reach level 25', icon: '💫', points: 0, category: 'level' },
  { id: 'level_50', name: 'Spiritual Giant', description: 'Reach level 50', icon: '👑', points: 0, category: 'level' },

  // Special achievements
  { id: 'early_bird', name: 'Early Bird', description: 'Complete Daily Text before 7am', icon: '🌅', points: 25, category: 'special' },
  { id: 'weekend_warrior', name: 'Weekend Warrior', description: 'Complete all activities on a weekend', icon: '🎉', points: 30, category: 'special' },
  { id: 'perfect_day', name: 'Perfect Day', description: 'Complete Daily Text, all prayers, and Bible reading in one day', icon: '💯', points: 50, category: 'special' },
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

      // Prayer streak tracking
      prayerStreak: 0,
      longestPrayerStreak: 0,
      lastPrayerDate: null,

      // Family worship streak tracking
      familyWorshipStreak: 0,
      longestFamilyWorshipStreak: 0,

      // Activity tracking
      dailyTextCompletions: 0,
      reflectionsWritten: 0,
      newsRead: 0,
      bibleReadingsCompleted: 0,
      goalsCompleted: 0,
      projectsCompleted: 0,
      meetingsPrepared: 0,
      prayersCompleted: 0,
      allPrayersDays: 0,
      familyWorshipCompleted: 0,

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

      // Update prayer streak (when all 3 prayers completed)
      updatePrayerStreak: () => {
        const state = get();
        const today = format(new Date(), 'yyyy-MM-dd');

        if (state.lastPrayerDate === today) {
          return;
        }

        let newStreak = 1;

        if (state.lastPrayerDate) {
          const lastDate = parseISO(state.lastPrayerDate);
          const todayDate = startOfDay(new Date());
          const daysDiff = differenceInDays(todayDate, startOfDay(lastDate));

          if (daysDiff === 1) {
            newStreak = state.prayerStreak + 1;
          } else if (daysDiff === 0) {
            newStreak = state.prayerStreak;
          }
        }

        set({
          prayerStreak: newStreak,
          longestPrayerStreak: Math.max(newStreak, state.longestPrayerStreak),
          lastPrayerDate: today,
          allPrayersDays: state.allPrayersDays + 1,
        });

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

      // Record prayer completion
      recordPrayerCompletion: (allComplete = false) => {
        set((state) => ({
          prayersCompleted: state.prayersCompleted + 1,
        }));
        if (allComplete) {
          get().updatePrayerStreak();
        }
        get().checkAchievements();
      },

      // Record family worship completion
      recordFamilyWorshipCompletion: () => {
        set((state) => ({
          familyWorshipCompleted: state.familyWorshipCompleted + 1,
          familyWorshipStreak: state.familyWorshipStreak + 1,
          longestFamilyWorshipStreak: Math.max(state.familyWorshipStreak + 1, state.longestFamilyWorshipStreak),
        }));
        get().addPoints(25);
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
        const level = get().getLevel();

        ACHIEVEMENTS.forEach((achievement) => {
          if (state.unlockedAchievements.includes(achievement.id)) return;

          let shouldUnlock = false;

          switch (achievement.id) {
            // Daily Text
            case 'first_text':
              shouldUnlock = state.dailyTextCompletions >= 1;
              break;
            case 'text_week':
              shouldUnlock = state.dailyTextCompletions >= 7;
              break;
            case 'text_month':
              shouldUnlock = state.dailyTextCompletions >= 30;
              break;

            // Prayer
            case 'first_prayer':
              shouldUnlock = state.prayersCompleted >= 1;
              break;
            case 'prayer_complete':
              shouldUnlock = state.allPrayersDays >= 1;
              break;
            case 'prayer_week':
              shouldUnlock = state.prayerStreak >= 7;
              break;
            case 'prayer_month':
              shouldUnlock = state.prayerStreak >= 30;
              break;

            // Family Worship
            case 'first_worship':
              shouldUnlock = state.familyWorshipCompleted >= 1;
              break;
            case 'worship_month':
              shouldUnlock = state.familyWorshipCompleted >= 4;
              break;
            case 'worship_quarter':
              shouldUnlock = state.familyWorshipCompleted >= 12;
              break;

            // Streaks
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

            // Reflections
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

            // News
            case 'news_reader':
              shouldUnlock = state.newsRead >= 10;
              break;
            case 'news_enthusiast':
              shouldUnlock = state.newsRead >= 50;
              break;
            case 'news_master':
              shouldUnlock = state.newsRead >= 100;
              break;

            // Bible Reading
            case 'bible_reader':
              shouldUnlock = state.bibleReadingsCompleted >= 7;
              break;
            case 'bible_scholar':
              shouldUnlock = state.bibleReadingsCompleted >= 30;
              break;
            case 'bible_master':
              shouldUnlock = state.bibleReadingsCompleted >= 100;
              break;

            // Goals
            case 'first_goal':
              shouldUnlock = state.goalsCompleted >= 1;
              break;
            case 'goals_5':
              shouldUnlock = state.goalsCompleted >= 5;
              break;
            case 'goals_10':
              shouldUnlock = state.goalsCompleted >= 10;
              break;
            case 'goals_20':
              shouldUnlock = state.goalsCompleted >= 20;
              break;

            // Projects
            case 'first_project':
              shouldUnlock = state.projectsCompleted >= 1;
              break;
            case 'projects_5':
              shouldUnlock = state.projectsCompleted >= 5;
              break;
            case 'projects_10':
              shouldUnlock = state.projectsCompleted >= 10;
              break;

            // Meetings
            case 'first_meeting':
              shouldUnlock = state.meetingsPrepared >= 1;
              break;
            case 'meeting_prepared':
              shouldUnlock = state.meetingsPrepared >= 10;
              break;
            case 'meeting_master':
              shouldUnlock = state.meetingsPrepared >= 50;
              break;

            // Levels
            case 'level_5':
              shouldUnlock = level >= 5;
              break;
            case 'level_10':
              shouldUnlock = level >= 10;
              break;
            case 'level_25':
              shouldUnlock = level >= 25;
              break;
            case 'level_50':
              shouldUnlock = level >= 50;
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
          prayerStreak: state.prayerStreak,
          longestPrayerStreak: state.longestPrayerStreak,
          familyWorshipStreak: state.familyWorshipStreak,
          dailyTextCompletions: state.dailyTextCompletions,
          reflectionsWritten: state.reflectionsWritten,
          newsRead: state.newsRead,
          bibleReadingsCompleted: state.bibleReadingsCompleted,
          goalsCompleted: state.goalsCompleted,
          projectsCompleted: state.projectsCompleted,
          prayersCompleted: state.prayersCompleted,
          familyWorshipCompleted: state.familyWorshipCompleted,
          achievementsUnlocked: state.unlockedAchievements.length,
          totalAchievements: ACHIEVEMENTS.length,
        };
      },
    }),
    {
      name: 'jw-gamification-storage',
      version: 2,
    }
  )
);

export default useGamificationStore;
