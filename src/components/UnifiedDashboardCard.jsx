import { BookOpen, Users, GraduationCap, Heart } from 'lucide-react';
import StreakRing from './StreakRing';
import useGamificationStore from '../stores/gamificationStore';
import { useTranslation } from 'react-i18next';

/**
 * Unified Dashboard Card — streak ring + weekly metrics summary.
 *
 * Pulls live data from gamificationStore. Displays:
 * - Streak ring with current/longest streak
 * - 4 metric tiles: Bible, Meetings, Prayer, Family Worship
 */
export default function UnifiedDashboardCard() {
  const { t } = useTranslation();

  // Subscribe to only the fields we render — avoids re-renders on unrelated state changes
  const currentStreak = useGamificationStore((s) => s.currentStreak);
  const longestStreak = useGamificationStore((s) => s.longestStreak);
  const bibleReadings = useGamificationStore((s) => s.bibleReadingsCompleted);
  const meetingsPrepared = useGamificationStore((s) => s.meetingsPrepared);
  const prayersCompleted = useGamificationStore((s) => s.prayersCompleted);
  const familyWorshipStreak = useGamificationStore((s) => s.familyWorshipStreak);

  const metrics = [
    {
      label: t('stats.bible'),
      value: bibleReadings,
      icon: BookOpen,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      label: t('stats.meetings') || 'Meetings',
      value: meetingsPrepared,
      icon: Users,
      color: 'text-info',
      bg: 'bg-info/10',
    },
    {
      label: t('prayer.title') || 'Prayer',
      value: prayersCompleted,
      icon: Heart,
      color: 'text-error',
      bg: 'bg-error/10',
    },
    {
      label: t('familyWorship.shortTitle') || 'Fam. Worship',
      value: familyWorshipStreak,
      icon: GraduationCap,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
  ];

  return (
    <div className="card bg-base-100 shadow-xl border border-base-300/50 overflow-hidden">
      <div className="card-body p-5">
        {/* ── Top: Streak Ring + Title ── */}
        <div className="flex items-center gap-4 mb-4">
          <StreakRing
            current={currentStreak}
            longest={longestStreak}
            size={72}
            stroke={5}
            color="text-primary"
          />
          <div className="min-w-0">
            <h2 className="text-base font-bold text-base-content">
              {currentStreak > 0
                ? `${currentStreak}-Day Streak`
                : 'Start Your Streak'}
            </h2>
            <p className="text-xs text-base-content/70 mt-0.5">
              {currentStreak > 0
                ? `Best: ${longestStreak} days · Keep going!`
                : 'Complete your daily text to begin'}
            </p>
            {/* Mini streak bar */}
            <div className="flex gap-1 mt-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-3 rounded-full transition-colors ${
                    i < currentStreak % 7
                      ? 'bg-primary'
                      : i === currentStreak % 7 && currentStreak > 0
                        ? 'bg-primary/40 animate-pulse'
                        : 'bg-base-content/20'
                  }`}
                />
              ))}
              <span className="text-[10px] text-base-content/70 ml-1">7d</span>
            </div>
          </div>
        </div>

        {/* ── Bottom: Metric Tiles ── */}
        <div className="grid grid-cols-4 gap-2">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="flex flex-col items-center p-2 rounded-xl bg-base-200/50"
              >
                <div className={`p-1.5 rounded-lg ${metric.bg} mb-1`}>
                  <Icon className={`w-3.5 h-3.5 ${metric.color}`} />
                </div>
                <span className="text-lg font-bold text-base-content tabular-nums">
                  {metric.value}
                </span>
                <span className="text-[10px] text-base-content/70 text-center leading-tight mt-0.5">
                  {metric.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
