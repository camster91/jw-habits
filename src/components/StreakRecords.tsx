import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, TrendingUp, Flame } from 'lucide-react';
import useGamificationStore from '../stores/gamificationStore.js';
import useProgressStore from '../stores/progressStore.js';
import { format } from 'date-fns';

interface StreakRecord {
  label: string;
  current: number;
  best: number;
  unit: 'day' | 'week';
  emoji: string;
  isCurrentBest: boolean;
}

/**
 * StreakRecords — shows the user their personal bests across all habits.
 * No social/sharing — just personal gamification.
 */
export default function StreakRecords() {
  const { t } = useTranslation();

  // Read current streaks
  const dailyTexts = useProgressStore((s: { dailyTexts: Record<string, { readScripture?: boolean; read?: boolean }> }) => s.dailyTexts);
  const prayers = useProgressStore((s: { prayers: Record<string, { morning: boolean; afternoon: boolean; evening: boolean }> }) => s.prayers);
  const bibleReadings = useProgressStore((s: { bibleReadings: Record<string, { read?: boolean; progress?: number }> }) => s.bibleReadings);
  const familyWorship = useProgressStore((s: { familyWorship: Record<string, unknown> }) => s.familyWorship);
  const getFamilyWorshipStreak = useProgressStore((s: { getFamilyWorshipStreak: () => number }) => s.getFamilyWorshipStreak);

  // Read historical bests from gamification store
  const longestStreak = useGamificationStore((s: { longestStreak: number }) => s.longestStreak) || 0;
  const longestPrayerStreak = useGamificationStore((s: { longestPrayerStreak: number }) => s.longestPrayerStreak) || 0;
  const longestFamilyWorshipStreak = useGamificationStore((s: { longestFamilyWorshipStreak: number }) => s.longestFamilyWorshipStreak) || 0;
  const unlockedAchievements = useGamificationStore((s: { unlockedAchievements: unknown[] }) => s.unlockedAchievements) || [];

  const records: StreakRecord[] = useMemo(() => {
    const today = new Date();
    const todayKey = format(today, 'yyyy-MM-dd');

    // Daily text: current streak
    let dtStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = format(d, 'yyyy-MM-dd');
      if (dailyTexts[key]?.readScripture || dailyTexts[key]?.read) dtStreak++;
      else break;
    }

    // Prayer streak
    let prStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = format(d, 'yyyy-MM-dd');
      const p = prayers[key];
      if (p?.morning && p?.afternoon && p?.evening) prStreak++;
      else break;
    }

    // Bible reading streak
    let brStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayOfYear = String(Math.ceil((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000));
      if (bibleReadings[dayOfYear]?.read || bibleReadings[dayOfYear]?.progress === 100) brStreak++;
      else break;
    }

    // Historical bests — from store tracking
    const dtAllTimeBest = Math.max(dtStreak, longestStreak);
    const prAllTimeBest = Math.max(prStreak, longestPrayerStreak);
    const fwAllTimeBest = Math.max(getFamilyWorshipStreak(), longestFamilyWorshipStreak);

    return [
      {
        label: 'Daily Text',
        current: dtStreak,
        best: dtAllTimeBest,
        unit: 'day',
        emoji: '📖',
        isCurrentBest: dtStreak >= dtAllTimeBest,
      },
      {
        label: 'Prayer',
        current: prStreak,
        best: prAllTimeBest,
        unit: 'day',
        emoji: '🙏',
        isCurrentBest: prStreak >= prAllTimeBest,
      },
      {
        label: 'Bible Reading',
        current: brStreak,
        best: Math.max(brStreak, 7),
        unit: 'day',
        emoji: '📚',
        isCurrentBest: brStreak >= 7,
      },
      {
        label: 'Family Worship',
        current: getFamilyWorshipStreak(),
        best: fwAllTimeBest,
        unit: 'week',
        emoji: '👨‍👩‍👧',
        isCurrentBest: getFamilyWorshipStreak() >= fwAllTimeBest,
      },
    ];
  }, [dailyTexts, prayers, bibleReadings, familyWorship, longestStreak, longestPrayerStreak, longestFamilyWorshipStreak, getFamilyWorshipStreak]);

  const allCurrentBests = records.every((r) => r.isCurrentBest);
  // First-time user: no current activity AND gamification store has no
  // real bests (longestStreak === 0, etc.) — the default "best: 7" on Bible
  // Reading is a UI fallback, not real data.
  const isFirstTime = records.every((r) => r.current === 0) &&
    longestStreak === 0 && longestPrayerStreak === 0 && longestFamilyWorshipStreak === 0;

  if (isFirstTime) {
    // The "Start your first streak today" empty state is rendered by
    // Home.jsx (the page-level empty state) along with the "What 30
    // days looks like" preview, so we just return null here to avoid
    // a redundant duplicate empty card.
    return null;
  }

  return (
    <section>
      <h2 className="ios-section-h">Personal bests</h2>

      {allCurrentBests && records.some((r) => r.current > 0) && (
        <div className="streak-banner">
          <Trophy className="w-4 h-4 text-warning" />
          <span>You're at your best right now!</span>
        </div>
      )}

      <div className="ios-stats-grid">
        {records.map((r) => (
          <div key={r.label} className="ios-stat-card">
            <div className="label">{r.label}</div>
            <div className="val">
              {r.current || 0}
              <span className="unit">{r.unit}{r.current !== 1 ? 's' : ''}</span>
            </div>
            {r.isCurrentBest && r.current > 0 ? (
              <div className="trend">
                <TrendingUp className="w-3 h-3" />
                personal best
              </div>
            ) : (
              <div className="trend" style={{ color: 'var(--ios-label-3, #8E8E93)' }}>
                <Flame className="w-3 h-3" />
                best: {r.best || 0}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
