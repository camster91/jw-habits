import { format, parseISO } from 'date-fns';
import { Sparkles, Flame } from 'lucide-react';
import useGamificationStore from '../stores/gamificationStore';
import useSettingsStore from '../stores/settingsStore';

/**
 * WelcomeBack — a small personalized strip for returning users.
 * Shows the user's name, their current streak, and how long since their
 * last activity. Hidden for fresh users (no streak, no last activity).
 */
export default function WelcomeBack() {
  const userName = useSettingsStore((s) => s.userName);
  const currentStreak = useGamificationStore((s) => s.currentStreak);
  const longestStreak = useGamificationStore((s) => s.longestStreak);
  const lastActivityDate = useGamificationStore((s) => s.lastActivityDate);
  const points = useGamificationStore((s) => s.points);

  const hasHistory = currentStreak > 0 || (lastActivityDate && points > 0);
  if (!hasHistory) return null;

  let lastSeenText = null;
  if (lastActivityDate) {
    const last = parseISO(lastActivityDate);
    const now = new Date();
    const diffMs = now - last;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) {
      lastSeenText = 'today';
    } else if (diffDays === 1) {
      lastSeenText = 'yesterday';
    } else if (diffDays < 7) {
      lastSeenText = `${diffDays} days ago`;
    } else {
      lastSeenText = format(last, 'MMM d');
    }
  }

  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10 border border-primary/20 px-4 py-3 animate-fade-in"
      role="status"
    >
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-full bg-primary/15 text-primary">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-base-content leading-tight">
            Welcome back{userName ? `, ${userName}` : ''}
          </p>
          <p className="text-xs text-base-content/70 leading-tight mt-0.5">
            {lastSeenText && <>Last entry {lastSeenText} · </>}
            {currentStreak > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500 inline" />
                {currentStreak}-day streak
                {longestStreak > currentStreak && (
                  <span className="text-base-content/50"> · best {longestStreak}</span>
                )}
              </span>
            ) : (
              <span>Ready to start a new streak?</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
