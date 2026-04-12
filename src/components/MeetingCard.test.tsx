import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

// Do NOT use fake timers for MeetingCard - it uses async useEffect which
// needs real timers to resolve promises and update state properly.

// Mock date-fns
vi.mock('date-fns', () => ({
  format: (date, fmt) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    if (fmt === 'yyyy-MM-dd') return `${year}-${month}-${day}`;
    if (fmt === 'EEEE, MMMM d') return `Saturday, April 11`;
    if (fmt === 'MMMM d') return `April 6`;
    if (fmt === 'MMMM d, yyyy') return `April 12, 2026`;
    return `${year}-${month}-${day}`;
  },
  startOfWeek: (date, opts) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day - (opts?.weekStartsOn ?? 0);
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  },
  addDays: (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
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

// Mock jwLibraryLinks - include all exports used by MeetingCard and its children
vi.mock('../utils/jwLibraryLinks', () => ({
  getWorkbookForWeek: () => Promise.resolve(null),
  getISOWeekString: () => '2026-W15',
  loadMeetingWorkbooks: () => Promise.resolve(null),
  BIBLE_BOOKS: {},
  JW_ORG_SECTIONS: {
    meetingWorkbooks: 'https://www.jw.org/en/library/jw-meeting-workbook/',
    watchtowerStudy: 'https://www.jw.org/en/library/magazines/watchtower-study-edition/',
  },
}));

// Import stores after mocks
const { default: useProgressStore } = await import('../stores/progressStore.ts');
const { default: useGamificationStore } = await import('../stores/gamificationStore.ts');

// Import component after mocks
const { default: MeetingCard } = await import('./MeetingCard.jsx');

describe('MeetingCard', () => {
  beforeEach(() => {
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

  it('should render without crashing', async () => {
    render(<MeetingCard />);

    await waitFor(() => {
      expect(screen.getByText(/This Week/)).toBeDefined();
    });
  });

  it('should show meeting preparation content after loading', async () => {
    render(<MeetingCard />);

    await waitFor(() => {
      expect(screen.getByText(/This Week/)).toBeDefined();
    });

    // Should show the midweek and weekend tabs
    expect(screen.getByText('Midweek')).toBeDefined();
    expect(screen.getByText('Weekend')).toBeDefined();
  });

  it('should show midweek meeting sections', async () => {
    render(<MeetingCard />);

    await waitFor(() => {
      expect(screen.getByText(/This Week/)).toBeDefined();
    });

    // Should display the meeting section title
    expect(screen.getByText("Treasures From God's Word")).toBeDefined();
  });

  it('should show tab buttons for midweek and weekend', async () => {
    render(<MeetingCard />);

    await waitFor(() => {
      expect(screen.getByText('Midweek')).toBeDefined();
      expect(screen.getByText('Weekend')).toBeDefined();
    });
  });

  it('should show loading state initially', () => {
    render(<MeetingCard />);
    expect(screen.getByText('Loading meetings...')).toBeDefined();
  });
});