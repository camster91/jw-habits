import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

// Use fake timers
vi.useFakeTimers();
vi.setSystemTime(new Date('2026-04-12T12:00:00'));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  startOfDay: (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  },
  isSameDay: (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate(),
  parseISO: (str) => new Date(str),
  differenceInDays: (dateLeft, dateRight) => {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((dateLeft.getTime() - dateRight.getTime()) / msPerDay);
  },
}));

// Mock native haptics
vi.mock('../utils/native', () => ({
  haptics: {
    light: vi.fn(),
    success: vi.fn(),
    medium: vi.fn(),
  },
}));

// Import stores after mocks
const { default: useProgressStore } = await import('../stores/progressStore.ts');
const { default: useGamificationStore } = await import('../stores/gamificationStore.ts');

// Import component after mocks
const { default: PrayerTrackingCard } = await import('./PrayerTrackingCard.jsx');

describe('PrayerTrackingCard', () => {
  beforeEach(() => {
    // Reset stores
    act(() => {
      useProgressStore.getState().clearAll();
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

  it('should render without crashing', () => {
    const { container } = render(<PrayerTrackingCard />);
    expect(container).toBeDefined();
  });

  it('should show prayer tracking header', () => {
    render(<PrayerTrackingCard />);
    expect(screen.getByText('Daily Prayers')).toBeDefined();
  });

  it('should show prayer tracking options', () => {
    render(<PrayerTrackingCard />);
    expect(screen.getByText('Morning Prayer')).toBeDefined();
    expect(screen.getByText('Afternoon Prayer')).toBeDefined();
    expect(screen.getByText('Evening Prayer')).toBeDefined();
  });

  it('should show 0/3 prayers count initially', () => {
    render(<PrayerTrackingCard />);
    expect(screen.getByText('0/3 prayers today')).toBeDefined();
  });

  it('should toggle prayer checkbox on click', () => {
    render(<PrayerTrackingCard />);

    const morningButton = screen.getByText('Morning Prayer').closest('button');
    fireEvent.click(morningButton);

    // After clicking, the prayers count should update
    expect(screen.getByText('1/3 prayers today')).toBeDefined();
  });

  it('should add XP when prayer is checked', () => {
    const initialPoints = useGamificationStore.getState().points;

    render(<PrayerTrackingCard />);

    const morningButton = screen.getByText('Morning Prayer').closest('button');
    fireEvent.click(morningButton);

    const newPoints = useGamificationStore.getState().points;
    expect(newPoints).toBeGreaterThan(initialPoints);
  });
});