import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, differenceInDays, parseISO, startOfDay } from 'date-fns';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  category: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_text', name: 'First Steps', description: 'Complete your first Daily Text', icon: '🌱', points: 10, category: 'dailyText' },
  { id: 'text_week', name: 'Dedicated Reader', description: 'Read Daily Text 7 days in a row', icon: '📖', points: 50, category: 'dailyText' },
  { id: 'text_month', name: 'Daily Discipline', description: 'Read Daily Text 30 days in a row', icon: '📚', points: 200, category: 'dailyText' },
  { id: 'first_prayer', name: 'First Prayer', description: 'Complete your first daily prayer', icon: '🙏', points: 10, category: 'prayer' },
  { id: 'prayer_complete', name: 'Prayer Warrior', description: 'Complete all 3 prayers in a day', icon: '✨', points: 15, category: 'prayer' },
  { id: 'prayer_week', name: 'Prayerful Week', description: '7-day prayer streak (all 3 daily)', icon: '💫', points: 75, category: 'prayer' },
  { id: 'prayer_month', name: 'Prayer Master', description: '30-day prayer streak', icon: '🌟', points: 300, category: 'prayer' },
  { id: 'first_worship', name: 'Family First', description: 'Complete your first family worship', icon: '👨‍👩‍👧', points: 25, category: 'familyWorship' },
  { id: 'worship_month', name: 'Family Focused', description: '4 weeks of family worship', icon: '🏠', points: 100, category: 'familyWorship' },
  { id: 'worship_quarter', name: 'Family Tradition', description: '12 weeks of family worship', icon: '💝', points: 300, category: 'familyWorship' },
  { id: 'week_streak', name: 'Week Warrior', description: '7-day overall streak', icon: '🔥', points: 50, category: 'streak' },
  { id: 'month_streak', name: 'Monthly Master', description: '30-day overall streak', icon: '⭐', points: 200, category: 'streak' },
  { id: 'quarter_streak', name: 'Quarterly Champion', description: '90-day overall streak', icon: '🏆', points: 500, category: 'streak' },
  { id: 'year_streak', name: 'Yearly Legend', description: '365-day overall streak', icon: '👑', points: 2000, category: 'streak' },
  { id: 'first_reflection', name: 'Thoughtful', description: 'Write your first reflection', icon: '📝', points: 15, category: 'reflection' },
  { id: 'reflections_10', name: 'Deep Thinker', description: 'Write 10 reflections', icon: '💭', points: 50, category: 'reflection' },
  { id: 'reflections_50', name: 'Contemplative', description: 'Write 50 reflections', icon: '📚', points: 150, category: 'reflection' },
  { id: 'reflections_100', name: 'Wisdom Keeper', description: 'Write 100 reflections', icon: '🦉', points: 300, category: 'reflection' },
  { id: 'news_reader', name: 'Informed', description: 'Read 10 news articles', icon: '📰', points: 25, category: 'news' },
  { id: 'news_enthusiast', name: 'News Enthusiast', description: 'Read 50 news articles', icon: '🗞️', points: 100, category: 'news' },
  { id: 'news_master', name: 'Always Updated', description: 'Read 100 news articles', icon: '📡', points: 200, category: 'news' },
  { id: 'bible_reader', name: 'Bible Student', description: 'Complete daily Bible reading 7 times', icon: '📖', points: 50, category: 'study' },
  { id: 'bible_scholar', name: 'Bible Scholar', description: 'Complete daily Bible reading 30 times', icon: '🎓', points: 200, category: 'study' },
  { id: 'bible_master', name: 'Scripture Master', description: 'Complete daily Bible reading 100 times', icon: '🏛️', points: 500, category: 'study' },
  { id: 'first_goal', name: 'Goal Setter', description: 'Complete your first goal', icon: '🎯', points: 20, category: 'goals' },
  { id: 'goals_5', name: 'Achiever', description: 'Complete 5 goals', icon: '🏅', points: 75, category: 'goals' },
  { id: 'goals_10', name: 'High Achiever', description: 'Complete 10 goals', icon: '🥇', points: 150, category: 'goals' },
  { id: 'goals_20', name: 'Overachiever', description: 'Complete 20 goals', icon: '🌟', points: 250, category: 'goals' },
  { id: 'first_project', name: 'Project Starter', description: 'Complete your first project', icon: '📋', points: 30, category: 'projects' },
  { id: 'projects_5', name: 'Project Manager', description: 'Complete 5 projects', icon: '📊', points: 100, category: 'projects' },
  { id: 'projects_10', name: 'Project Master', description: 'Complete 10 projects', icon: '🗂️', points: 250, category: 'projects' },
  { id: 'first_meeting', name: 'Prepared', description: 'Prepare for your first meeting', icon: '📝', points: 15, category: 'meetings' },
  { id: 'meeting_prepared', name: 'Well Prepared', description: 'Prepare for 10 meetings', icon: '✅', points: 50, category: 'meetings' },
  { id: 'meeting_master', name: 'Meeting Master', description: 'Prepare for 50 meetings', icon: '🎖️', points: 200, category: 'meetings' },
  { id: 'level_5', name: 'Rising Star', description: 'Reach level 5', icon: '⭐', points: 0, category: 'level' },
  { id: 'level_10', name: 'Dedicated', description: 'Reach level 10', icon: '🌟', points: 0, category: 'level' },
  { id: 'level_25', name: 'Committed', description: 'Reach level 25', icon: '💫', points: 0, category: 'level' },
  { id: 'level_50', name: 'Spiritual Giant', description: 'Reach level 50', icon: '👑', points: 0, category: 'level' },
  { id: 'early_bird', name: 'Early Bird', description: 'Complete Daily Text before 7am', icon: '🌅', points: 25, category: 'special' },
  { id: 'weekend_warrior', name: 'Weekend Warrior', description: 'Complete all activities on a weekend', icon: '🎉', points: 30, category: 'special' },
  { id: 'perfect_day', name: 'Perfect Day', description: 'Complete Daily Text, all prayers, and Bible reading in one day', icon: '💯', points: 50, category: 'special' },
];

interface UserAchievement {
  id: string;
  unlockedAt: string;
}

interface GamificationState {
  points: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  prayerStreak: number;
  longestPrayerStreak: number;
  lastPrayerDate: string | null;
  familyWorshipStreak: number;
  longestFamilyWorshipStreak: number;
  dailyTextCompletions: number;
  reflectionsWritten: number;
  newsRead: number;
  bibleReadingsCompleted: number;
  goalsCompleted: number;
  projectsCompleted: number;
  meetingsPrepared: number;
  prayersCompleted: number;
  recentAchievements: Achievement[];
  unlockedAchievements: UserAchievement[];
}

interface AchievementWithStatus extends Achievement {
  unlocked: boolean;
  unlockedAt?: string;
}

interface GamificationStats {
  points: number;
  currentStreak: number;
  longestStreak: number;
  dailyTextCompletions: number;
  bibleReadingsCompleted: number;
  prayersCompleted: number;
  familyWorshipCompleted: number;
  reflectionsWritten: number;
  newsRead: number;
  goalsCompleted: number;
  projectsCompleted: number;
  meetingsPrepared: number;
  achievementsUnlocked: number;
  totalAchievements: number;
}

interface GamificationActions {
  addPoints: (points: number) => void;
  updateStreak: (date: string) => void;
  updatePrayerStreak: (date: string) => void;
  updateFamilyWorshipStreak: (weekKey: string, completed: boolean) => void;
  incrementActivity: (category: string) => void;
  getLevel: () => number;
  getPointsToNextLevel: () => number;
  getStats: () => GamificationStats;
  getAllAchievements: () => AchievementWithStatus[];
  recordDailyTextCompletion: () => void;
  recordReflection: () => void;
  recordNewsRead: () => void;
  recordBibleReading: () => void;
  recordGoalCompleted: () => void;
  recordProjectCompleted: () => void;
  recordMeetingPrepared: () => void;
  recordPrayerCompleted: () => void;
  recordPrayerCompletion: (allDone: boolean) => void;
  recordFamilyWorshipCompletion: () => void;
  checkAndUnlockAchievements: () => void;
  clearRecentAchievements: () => void;
}

const useGamificationStore = create<GamificationState & GamificationActions>()(
  persist(
    (set, get) => ({
      points: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      prayerStreak: 0,
      longestPrayerStreak: 0,
      lastPrayerDate: null,
      familyWorshipStreak: 0,
      longestFamilyWorshipStreak: 0,
      dailyTextCompletions: 0,
      reflectionsWritten: 0,
      newsRead: 0,
      bibleReadingsCompleted: 0,
      goalsCompleted: 0,
      projectsCompleted: 0,
      meetingsPrepared: 0,
      prayersCompleted: 0,
      recentAchievements: [],
      unlockedAchievements: [],

      addPoints: (points) => {
        set((state) => ({ points: state.points + points }));
        get().checkAndUnlockAchievements();
      },

      updateStreak: (date) => {
        const state = get();
        const lastDate = state.lastActivityDate ? parseISO(state.lastActivityDate) : null;
        const todayDate = startOfDay(new Date());

        let newStreak = 1;
        if (lastDate) {
          const daysDiff = differenceInDays(todayDate, startOfDay(lastDate));
          if (daysDiff === 1) {
            newStreak = state.currentStreak + 1;
          } else if (daysDiff === 0) {
            return;
          }
        }

        set({
          currentStreak: newStreak,
          longestStreak: Math.max(state.longestStreak, newStreak),
          lastActivityDate: date
        });
        get().checkAndUnlockAchievements();
      },

      updatePrayerStreak: (date) => {
        const state = get();
        const lastDate = state.lastPrayerDate ? parseISO(state.lastPrayerDate) : null;
        const todayDate = startOfDay(new Date());

        let newStreak = 1;
        if (lastDate) {
          const daysDiff = differenceInDays(todayDate, startOfDay(lastDate));
          if (daysDiff === 1) {
            newStreak = state.prayerStreak + 1;
          } else if (daysDiff === 0) {
            return;
          }
        }

        set({
          prayerStreak: newStreak,
          longestPrayerStreak: Math.max(state.longestPrayerStreak, newStreak),
          lastPrayerDate: date
        });
        get().checkAndUnlockAchievements();
      },

      updateFamilyWorshipStreak: (weekKey, completed) => {
        const state = get();
        set({
          familyWorshipStreak: completed ? state.familyWorshipStreak + 1 : 0,
          longestFamilyWorshipStreak: completed
            ? Math.max(state.longestFamilyWorshipStreak, state.familyWorshipStreak + 1)
            : state.longestFamilyWorshipStreak
        });
        get().checkAndUnlockAchievements();
      },

      incrementActivity: (category) => {
        const categoryMap: Record<string, keyof GamificationState> = {
          dailyText: 'dailyTextCompletions',
          bibleReading: 'bibleReadingsCompleted',
          prayer: 'prayersCompleted',
          reflection: 'reflectionsWritten',
          news: 'newsRead',
          goal: 'goalsCompleted',
          project: 'projectsCompleted',
          meeting: 'meetingsPrepared',
        };
        const key = categoryMap[category];
        if (key) {
          set((state) => ({ ...state, [key]: (state[key] as number) + 1 }));
          get().checkAndUnlockAchievements();
        }
      },

      getLevel: () => Math.floor(get().points / 100) + 1,

      getPointsToNextLevel: () => {
        const points = get().points;
        const nextLevelPoints = (Math.floor(points / 100) + 1) * 100;
        return nextLevelPoints - points;
      },

      getStats: () => {
        const state = get();
        return {
          points: state.points,
          currentStreak: state.currentStreak,
          longestStreak: state.longestStreak,
          dailyTextCompletions: state.dailyTextCompletions,
          bibleReadingsCompleted: state.bibleReadingsCompleted,
          prayersCompleted: state.prayersCompleted,
          familyWorshipCompleted: state.familyWorshipStreak,
          reflectionsWritten: state.reflectionsWritten,
          newsRead: state.newsRead,
          goalsCompleted: state.goalsCompleted,
          projectsCompleted: state.projectsCompleted,
          meetingsPrepared: state.meetingsPrepared,
          achievementsUnlocked: state.unlockedAchievements.length,
          totalAchievements: ACHIEVEMENTS.length,
        };
      },

      getAllAchievements: () => {
        const state = get();
        return ACHIEVEMENTS.map((achievement) => {
          const unlocked = state.unlockedAchievements.find(a => a.id === achievement.id);
          return {
            ...achievement,
            unlocked: !!unlocked,
            unlockedAt: unlocked?.unlockedAt,
          };
        });
      },

      recordDailyTextCompletion: () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        get().incrementActivity('dailyText');
        get().updateStreak(today);
        get().addPoints(10);
      },

      recordReflection: () => {
        get().incrementActivity('reflection');
        get().addPoints(5);
      },

      recordNewsRead: () => {
        get().incrementActivity('news');
        get().addPoints(5);
      },

      recordBibleReading: () => {
        get().incrementActivity('bibleReading');
        const today = format(new Date(), 'yyyy-MM-dd');
        get().updateStreak(today);
        get().addPoints(10);
      },

      recordGoalCompleted: () => {
        get().incrementActivity('goal');
        get().addPoints(20);
      },

      recordProjectCompleted: () => {
        get().incrementActivity('project');
        get().addPoints(30);
      },

      recordMeetingPrepared: () => {
        get().incrementActivity('meeting');
        get().addPoints(15);
      },

      recordPrayerCompleted: () => {
        get().incrementActivity('prayer');
        const today = format(new Date(), 'yyyy-MM-dd');
        get().updatePrayerStreak(today);
        get().addPoints(5);
      },

      recordPrayerCompletion: (allDone) => {
        get().addPoints(5);
        if (allDone) {
          get().recordPrayerCompleted();
        }
      },

      recordFamilyWorshipCompletion: () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        get().updateFamilyWorshipStreak(today, true);
        get().addPoints(25);
      },

      checkAndUnlockAchievements: () => {
        const state = get();
        const newAchievements: UserAchievement[] = [];

        const checks: Record<string, boolean> = {
          first_text: state.dailyTextCompletions >= 1,
          text_week: state.currentStreak >= 7,
          text_month: state.currentStreak >= 30,
          first_prayer: state.prayersCompleted >= 1,
          prayer_complete: state.prayersCompleted >= 3,
          prayer_week: state.prayerStreak >= 7,
          prayer_month: state.prayerStreak >= 30,
          first_worship: state.familyWorshipStreak >= 1,
          worship_month: state.familyWorshipStreak >= 4,
          worship_quarter: state.familyWorshipStreak >= 12,
          week_streak: state.currentStreak >= 7,
          month_streak: state.currentStreak >= 30,
          quarter_streak: state.currentStreak >= 90,
          year_streak: state.currentStreak >= 365,
          first_reflection: state.reflectionsWritten >= 1,
          reflections_10: state.reflectionsWritten >= 10,
          reflections_50: state.reflectionsWritten >= 50,
          reflections_100: state.reflectionsWritten >= 100,
          news_reader: state.newsRead >= 10,
          news_enthusiast: state.newsRead >= 50,
          news_master: state.newsRead >= 100,
          bible_reader: state.bibleReadingsCompleted >= 7,
          bible_scholar: state.bibleReadingsCompleted >= 30,
          bible_master: state.bibleReadingsCompleted >= 100,
          first_goal: state.goalsCompleted >= 1,
          goals_5: state.goalsCompleted >= 5,
          goals_10: state.goalsCompleted >= 10,
          goals_20: state.goalsCompleted >= 20,
          first_project: state.projectsCompleted >= 1,
          projects_5: state.projectsCompleted >= 5,
          projects_10: state.projectsCompleted >= 10,
          first_meeting: state.meetingsPrepared >= 1,
          meeting_prepared: state.meetingsPrepared >= 10,
          meeting_master: state.meetingsPrepared >= 50,
          level_5: state.points >= 400,
          level_10: state.points >= 900,
          level_25: state.points >= 2400,
          level_50: state.points >= 4900,
        };

        const alreadyUnlocked = new Set(state.unlockedAchievements.map(a => a.id));

        for (const [id, met] of Object.entries(checks)) {
          if (met && !alreadyUnlocked.has(id)) {
            const achievement = ACHIEVEMENTS.find(a => a.id === id);
            if (achievement) {
              newAchievements.push({ id, unlockedAt: new Date().toISOString() });
              if (achievement.points > 0) {
                set((s) => ({ points: s.points + achievement.points }));
              }
            }
          }
        }

        if (newAchievements.length > 0) {
          const achievementDetails = newAchievements.map(a => ACHIEVEMENTS.find(ach => ach.id === a.id)!);
          set((s) => ({
            unlockedAchievements: [...s.unlockedAchievements, ...newAchievements],
            recentAchievements: [...s.recentAchievements, ...achievementDetails],
          }));
        }
      },

      clearRecentAchievements: () => set({ recentAchievements: [] }),
    }),
    {
      name: 'jw-gamification-storage',
      version: 1,
      migrate: (persistedState, version) => {
        if (version === undefined || version === 0) {
          return persistedState;
        }
        return persistedState;
      },
      partialize: (state) => ({
        totalPoints: state.totalPoints,
        currentLevel: state.currentLevel,
        streakDays: state.streakDays,
        longestStreak: state.longestStreak,
        lastActiveDate: state.lastActiveDate,
        unlockedAchievements: state.unlockedAchievements,
      }),
    }
  )
);

export default useGamificationStore;
