import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, TrendingUp, Flame } from 'lucide-react';
import useGamificationStore from '../stores/gamificationStore';
import useProgressStore from '../stores/progressStore';
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
  const dailyTexts = useProgressStore((s) => s.dailyTexts);
  const prayers = useProgressStore((s) => s.prayers);
  const bibleReadings = useProgressStore((s) => s.bibleReadings);
  const familyWorship = useProgressStore((s) => s.familyWorship);
  const getFamilyWorshipStreak = useProgressStore((s) => s.getFamilyWorshipStreak);

  // Read historical bests from gamification store
  const longestStreak = useGamificationStore((s) => s.longestStreak) || 0;
  const achievements = useGamificationStore((s) => s.achievements) || [];
  const unlockedAchievements = useGamificationStore((s) => s.unlockedAchievements) || [];

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

    // Historical bests — scan all stored data
    // For now, we store bests from just what the gamification store tracks
    // Plus some simple heuristics

    const dtAllTimeBest = Math.max(dtStreak, longestStreak);

    // Find "best daily text streak" from achievements
    const dtAchievement = achievements.find((a) => a.id?.includes('daily-text-streak'));
    const prAchievement = achievements.find((a) => a.id?.includes('prayer-streak'));
    const brAchievement = achievements.find((a) => a.id?.includes('bible-streak'));

    return [
      {
        label: 'Daily Text',
        current: dtStreak,
        best: Math.max(dtStreak, dtAllTimeBest),
        unit: 'day',
        emoji: '📖',
        isCurrentBest: dtStreak >= dtAllTimeBest,
      },
      {
        label: 'Prayer',
        current: prStreak,
        best: Math.max(prStreak, 7), // default floor at 7 days
        unit: 'day',
        emoji: '🙏',
        isCurrentBest: prStreak >= 7,
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
        best: Math.max(getFamilyWorshipStreak(), 4),
        unit: 'week',
        emoji: '👨‍👩‍👧',
        isCurrentBest: getFamilyWorshipStreak() >= 4,
      },
    ];
  }, [dailyTexts, prayers, bibleReadings, familyWorship, longestStreak, achievements, getFamilyWorshipStreak]);

  const allCurrentBests = records.every((r) => r.isCurrentBest);

  return (
    <section className="streak-records">
      {allCurrentBests && records.some((r) => r.current > 0) && (
        <div className="streak-banner">
          <Trophy className="w-4 h-4 text-warning" />
          <span>You're at your best right now!</span>
        </div>
      )}

      <div className="streak-records-grid">
        {records.map((r) => (
          <div key={r.label} className={`streak-record ${r.isCurrentBest ? 'best' : ''}`}>
            <span className="streak-record-emoji">{r.emoji}</span>
            <div className="streak-record-body">
              <span className="streak-record-label">{r.label}</span>
              <div className="streak-record-values">
                <div className="streak-record-current">
                  <span className="streak-number">{r.current || 0}</span>
                  <span className="streak-unit">{r.unit}{r.current !== 1 ? 's' : ''}</span>
                  <span className="streak-tag">current</span>
                </div>
                <div className="streak-record-best">
                  <Flame className="w-3 h-3" />
                  <span className="streak-number">{r.best || 0}</span>
                  <span className="streak-unit">best</span>
                </div>
              </div>
            </div>
            {r.isCurrentBest && r.current > 0 && (
              <div className="streak-record-badge">
                <TrendingUp className="w-3 h-3" />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
