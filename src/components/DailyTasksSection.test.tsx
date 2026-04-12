import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

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

// Mock jwLibraryLinks
vi.mock('../utils/jwLibraryLinks', () => ({
  getDailyTextLink: () => 'https://wol.jw.org/en/wol/dt/r1/lp-e/2026/4/12',
  getISOWeekString: () => '2026-W15',
  loadMeetingWorkbooks: () => Promise.resolve(null),
  BIBLE_BOOKS: {},
  getWorkbookForWeek: () => Promise.resolve(null),
  JW_ORG_SECTIONS: {
    meetingWorkbooks: 'https://www.jw.org/',
    watchtowerStudy: 'https://www.jw.org/',
  },
}));

// Import stores after mocks
const { default: useProgressStore } = await import('../stores/progressStore.ts');
const { default: useNewsStore } = await import('../stores/newsStore.ts');
const { default: useGamificationStore } = await import('../stores/gamificationStore.ts');
const { default: useMemoriesStore } = await import('../stores/memoriesStore.ts');

// Import component after mocks
const { default: DailyTasksSection } = await import('./DailyTasksSection.tsx');

function renderWithRouter(ui) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('DailyTasksSection', () => {
  beforeEach(() => {
    // Reset stores
    act(() => {
      useProgressStore.getState().clearAll();
      useNewsStore.setState({ lastChecked: null, streak: 0, history: [], totalChecks: 0 });
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
      useMemoriesStore.setState({ reflections: {} });
    });
  });

  it('should render without crashing', () => {
    const { container } = renderWithRouter(<DailyTasksSection />);
    expect(container).toBeDefined();
  });

  it('should show daily text section', () => {
    renderWithRouter(<DailyTasksSection />);
    expect(screen.getByText('Daily Text')).toBeDefined();
  });

  it('should show the read today text button', () => {
    renderWithRouter(<DailyTasksSection />);
    expect(screen.getByText("Read today's text")).toBeDefined();
  });

  it('should toggle completion and call gamification store method on daily text check', () => {
    renderWithRouter(<DailyTasksSection />);

    const initialPoints = useGamificationStore.getState().points;
    const button = screen.getByText("Read today's text").closest('button');

    fireEvent.click(button);

    // Advance past the setTimeout(100) in the component
    act(() => {
      vi.advanceTimersByTime(200);
    });

    const newPoints = useGamificationStore.getState().points;
    expect(newPoints).toBeGreaterThan(initialPoints);
  });

  it('should show daily check section', () => {
    renderWithRouter(<DailyTasksSection />);
    expect(screen.getByText('Daily Check')).toBeDefined();
  });

  it('should show daily reflection section', () => {
    renderWithRouter(<DailyTasksSection />);
    expect(screen.getByText('Daily Reflection')).toBeDefined();
  });
});