import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Use fake timers for consistent date handling
vi.useFakeTimers();
vi.setSystemTime(new Date('2026-04-12T12:00:00'));

// Mock date-fns before importing the store
vi.mock('date-fns', () => ({
  format: (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  differenceInDays: (dateLeft, dateRight) => {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((dateLeft.getTime() - dateRight.getTime()) / msPerDay);
  },
  parseISO: (str) => new Date(str),
  startOfDay: (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  },
}));

// Import after mocking
const { default: useGamificationStore } = await import('./gamificationStore.ts');

describe('gamificationStore', () => {
  beforeEach(() => {
    act(() => {
      useGamificationStore.setState({
        points: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        prayerStreak: 0,
        longestPrayerStreak: 0,
        lastPrayerDate: null,
        familyWorshipStreak: 0,
        longestFamilyWorshipStreak: 0,
        lastFamilyWorshipWeek: null,
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
      });
    });
  });

  describe('addPoints', () => {
    it('should increase totalPoints by the given amount', () => {
      act(() => {
        useGamificationStore.getState().addPoints(10);
      });

      expect(useGamificationStore.getState().points).toBe(10);
    });

    it('should accumulate points across multiple calls', () => {
      act(() => {
        useGamificationStore.getState().addPoints(10);
        useGamificationStore.getState().addPoints(5);
      });

      expect(useGamificationStore.getState().points).toBe(15);
    });
  });

  describe('updateStreak', () => {
    it('should increment streakDays for consecutive days', () => {
      // Use datetime strings so parseISO creates dates in local timezone
      // Fake timer is set to 2026-04-12T12:00:00 local time
      const yesterdayISO = new Date('2026-04-11T12:00:00').toISOString();

      act(() => {
        useGamificationStore.setState({ currentStreak: 1, lastActivityDate: yesterdayISO });
        useGamificationStore.getState().updateStreak(new Date().toISOString());
      });

      const state = useGamificationStore.getState();
      expect(state.currentStreak).toBe(2);
      expect(state.longestStreak).toBe(2);
    });

    it('should reset streak to 1 if a day was missed', () => {
      const twoDaysAgoISO = new Date('2026-04-10T12:00:00').toISOString();

      act(() => {
        useGamificationStore.setState({ currentStreak: 3, lastActivityDate: twoDaysAgoISO });
        useGamificationStore.getState().updateStreak(new Date().toISOString());
      });

      expect(useGamificationStore.getState().currentStreak).toBe(1);
    });

    it('should not change streak if same day', () => {
      const todayISO = new Date('2026-04-12T08:00:00').toISOString();

      act(() => {
        useGamificationStore.setState({ currentStreak: 5, lastActivityDate: todayISO });
        useGamificationStore.getState().updateStreak(new Date().toISOString());
      });

      expect(useGamificationStore.getState().currentStreak).toBe(5);
    });
  });

  describe('checkAndUnlockAchievements', () => {
    it('should unlock achievements when conditions are met', () => {
      act(() => {
        useGamificationStore.setState({ dailyTextCompletions: 1 });
        useGamificationStore.getState().checkAndUnlockAchievements();
      });

      const state = useGamificationStore.getState();
      expect(state.unlockedAchievements.length).toBeGreaterThan(0);
      expect(state.unlockedAchievements.some(a => a.id === 'first_text')).toBe(true);
    });

    it('should add unlocked achievements to recentAchievements', () => {
      act(() => {
        useGamificationStore.setState({ dailyTextCompletions: 1 });
        useGamificationStore.getState().checkAndUnlockAchievements();
      });

      const state = useGamificationStore.getState();
      expect(state.recentAchievements.length).toBeGreaterThan(0);
      expect(state.recentAchievements.some(a => a.id === 'first_text')).toBe(true);
    });

    it('should not unlock the same achievement twice', () => {
      act(() => {
        useGamificationStore.setState({ dailyTextCompletions: 1 });
        useGamificationStore.getState().checkAndUnlockAchievements();
      });

      const firstCount = useGamificationStore.getState().unlockedAchievements.length;

      act(() => {
        useGamificationStore.getState().checkAndUnlockAchievements();
      });

      expect(useGamificationStore.getState().unlockedAchievements.length).toBe(firstCount);
    });

    it('should add achievement bonus points', () => {
      act(() => {
        useGamificationStore.setState({ points: 0, dailyTextCompletions: 1 });
        useGamificationStore.getState().checkAndUnlockAchievements();
      });

      // first_text achievement gives 10 bonus points
      expect(useGamificationStore.getState().points).toBe(10);
    });
  });

  describe('recordDailyTextCompletion', () => {
    it('should add 10 XP via addPoints', () => {
      act(() => {
        useGamificationStore.getState().recordDailyTextCompletion();
      });

      // addPoints(10) is called, which triggers checkAndUnlockAchievements
      // dailyTextCompletions becomes 1, unlocking first_text (+10 bonus)
      // Total: 10 (activity) + 10 (achievement bonus) = 20
      const points = useGamificationStore.getState().points;
      expect(points).toBeGreaterThanOrEqual(10);
    });

    it('should increment dailyTextCompletions', () => {
      act(() => {
        useGamificationStore.getState().recordDailyTextCompletion();
      });

      expect(useGamificationStore.getState().dailyTextCompletions).toBe(1);
    });
  });

  describe('recordPrayerCompletion', () => {
    it('should add 5 XP when allDone is false', () => {
      act(() => {
        useGamificationStore.getState().recordPrayerCompletion(false);
      });

      // addPoints(5) called, checkAndUnlockAchievements finds no conditions met
      expect(useGamificationStore.getState().points).toBe(5);
    });

    it('should record prayer completed when allDone is true', () => {
      act(() => {
        useGamificationStore.getState().recordPrayerCompletion(true);
      });

      // addPoints(5) from recordPrayerCompletion, then recordPrayerCompleted calls addPoints(5)
      // prayersCompleted becomes 1, unlocking first_prayer (+10 bonus)
      const state = useGamificationStore.getState();
      expect(state.prayersCompleted).toBe(1);
      expect(state.points).toBeGreaterThanOrEqual(10);
    });
  });

  describe('getLevel', () => {
    it('should return level 1 with 0 points', () => {
      expect(useGamificationStore.getState().getLevel()).toBe(1);
    });

    it('should return level = Math.floor(points / 100) + 1', () => {
      act(() => {
        useGamificationStore.setState({ points: 250 });
      });

      expect(useGamificationStore.getState().getLevel()).toBe(3);
    });

    it('should return correct level at level boundary', () => {
      act(() => {
        useGamificationStore.setState({ points: 100 });
      });

      expect(useGamificationStore.getState().getLevel()).toBe(2);
    });

    it('should return correct level with 499 points', () => {
      act(() => {
        useGamificationStore.setState({ points: 499 });
      });

      expect(useGamificationStore.getState().getLevel()).toBe(5);
    });
  });

  describe('getStats', () => {
    it('should return correct stats object', () => {
      act(() => {
        useGamificationStore.setState({
          points: 150,
          currentStreak: 5,
          longestStreak: 10,
          dailyTextCompletions: 3,
          bibleReadingsCompleted: 2,
          prayersCompleted: 4,
          familyWorshipStreak: 1,
          reflectionsWritten: 6,
          newsRead: 7,
          goalsCompleted: 1,
          projectsCompleted: 2,
          meetingsPrepared: 3,
          unlockedAchievements: [],
        });
      });

      const stats = useGamificationStore.getState().getStats();
      expect(stats.points).toBe(150);
      expect(stats.currentStreak).toBe(5);
      expect(stats.longestStreak).toBe(10);
      expect(stats.dailyTextCompletions).toBe(3);
      expect(stats.bibleReadingsCompleted).toBe(2);
      expect(stats.prayersCompleted).toBe(4);
      expect(stats.familyWorshipCompleted).toBe(1);
      expect(stats.reflectionsWritten).toBe(6);
      expect(stats.newsRead).toBe(7);
      expect(stats.goalsCompleted).toBe(1);
      expect(stats.projectsCompleted).toBe(2);
      expect(stats.meetingsPrepared).toBe(3);
      expect(stats.achievementsUnlocked).toBe(0);
      expect(stats.totalAchievements).toBeGreaterThan(0);
    });
  });

  describe('clearRecentAchievements', () => {
    it('should clear the recentAchievements array', () => {
      act(() => {
        useGamificationStore.setState({
          dailyTextCompletions: 1,
          recentAchievements: [],
        });
        useGamificationStore.getState().checkAndUnlockAchievements();
      });

      expect(useGamificationStore.getState().recentAchievements.length).toBeGreaterThan(0);

      act(() => {
        useGamificationStore.getState().clearRecentAchievements();
      });

      expect(useGamificationStore.getState().recentAchievements).toEqual([]);
    });
  });

  describe('updateFamilyWorshipStreak (same-week double-count guard)', () => {
    // Regression: the streak counter used to climb on every "complete" tap
    // within the same week, letting a user farm worship_month (4 weeks) and
    // worship_quarter (12 weeks) achievements in an afternoon. The fix
    // tracks lastFamilyWorshipWeek and no-ops on repeat weekKeys.

    it('increments the streak on the first completion of a new week', () => {
      act(() => {
        useGamificationStore.getState().updateFamilyWorshipStreak('2026-04-13', true);
      });
      const state = useGamificationStore.getState();
      expect(state.familyWorshipStreak).toBe(1);
      expect(state.longestFamilyWorshipStreak).toBe(1);
      expect(state.lastFamilyWorshipWeek).toBe('2026-04-13');
    });

    it('does NOT increment when the same week is completed twice in a row', () => {
      act(() => {
        useGamificationStore.getState().updateFamilyWorshipStreak('2026-04-13', true);
        useGamificationStore.getState().updateFamilyWorshipStreak('2026-04-13', true);
        useGamificationStore.getState().updateFamilyWorshipStreak('2026-04-13', true);
      });
      expect(useGamificationStore.getState().familyWorshipStreak).toBe(1);
      expect(useGamificationStore.getState().longestFamilyWorshipStreak).toBe(1);
    });

    it('does NOT increment when the user toggles off then back on within the same week', () => {
      act(() => {
        useGamificationStore.getState().updateFamilyWorshipStreak('2026-04-13', true);
        useGamificationStore.getState().updateFamilyWorshipStreak('2026-04-13', false);
        useGamificationStore.getState().updateFamilyWorshipStreak('2026-04-13', true);
      });
      // The first true increments. The false clears lastFamilyWorshipWeek.
      // The second true re-credits the SAME week — should still only count
      // as 1, because it's the same week.
      expect(useGamificationStore.getState().familyWorshipStreak).toBe(1);
    });

    it('increments again when a NEW week is completed', () => {
      act(() => {
        useGamificationStore.getState().updateFamilyWorshipStreak('2026-04-13', true);
        useGamificationStore.getState().updateFamilyWorshipStreak('2026-04-20', true);
        useGamificationStore.getState().updateFamilyWorshipStreak('2026-04-27', true);
      });
      const state = useGamificationStore.getState();
      expect(state.familyWorshipStreak).toBe(3);
      expect(state.longestFamilyWorshipStreak).toBe(3);
      expect(state.lastFamilyWorshipWeek).toBe('2026-04-27');
    });

    it('does not let a user farm 12 completions in the same week to unlock worship_quarter', () => {
      act(() => {
        for (let i = 0; i < 12; i++) {
          useGamificationStore.getState().updateFamilyWorshipStreak('2026-04-13', true);
        }
      });
      const state = useGamificationStore.getState();
      expect(state.familyWorshipStreak).toBe(1);
      // worship_quarter requires streak >= 12, so it must NOT be unlocked
      const unlockedIds = state.unlockedAchievements.map((a) => a.id);
      expect(unlockedIds).not.toContain('worship_quarter');
    });
  });
});