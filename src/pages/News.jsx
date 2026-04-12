import { useState } from 'react';
import { Check, ExternalLink, Flame, Calendar, History, Trophy, Target, RefreshCw } from 'lucide-react';
import useNewsStore from '../stores/newsStore';
import { format, parseISO, isSameDay, startOfDay, eachDayOfInterval, subDays } from 'date-fns';
import PageHeader from '../components/PageHeader';

function News() {
  const {
    history,
    checkToday,
    getHasCheckedToday,
    getStreak,
    getTotalChecks,
  } = useNewsStore();

  const hasCheckedToday = getHasCheckedToday();
  const currentStreak = getStreak();
  const totalCheckCount = getTotalChecks();

  const [isAnimating, setIsAnimating] = useState(false);

  const handleCheckToday = () => {
    if (!hasCheckedToday) {
      setIsAnimating(true);
      checkToday();
      // Reset animation after a moment
      setTimeout(() => setIsAnimating(false), 1000);
    }
  };

  const handleOpenJW = () => {
    window.open('https://www.jw.org/en/whats-new/', '_blank', 'noopener,noreferrer');
  };

  // Generate last 30 days for calendar view
  const today = startOfDay(new Date());
  const last30Days = eachDayOfInterval({
    start: subDays(today, 29),
    end: today,
  }).reverse();

  // Count checks in last 30 days
  const checksLast30Days = last30Days.filter(day => 
    history.some(date => isSameDay(parseISO(date), day))
  ).length;

  // Calculate consistency percentage
  const consistencyPercentage = Math.round((checksLast30Days / 30) * 100);

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header */}
      <PageHeader
        title="Daily Check"
        subtitle="Stay updated with JW.org"
        gradient="from-primary via-primary to-blue-700"
        shadow
        titleSize="text-xl"
        subtitleClass="text-xs text-primary-content/60"
        contentClass="px-5 pt-4 pb-6"
        blurColor="blue"
      >
        {/* Stats row */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{currentStreak}</div>
            <div className="text-xs opacity-80">Day Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{totalCheckCount}</div>
            <div className="text-xs opacity-80">Total Checks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{consistencyPercentage}%</div>
            <div className="text-xs opacity-80">Last 30 days</div>
          </div>
        </div>
      </PageHeader>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Main Check Card */}
        <div className="card bg-base-100 shadow-xl mb-6 overflow-hidden">
          <div className="card-body p-6">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold mb-2">
                {hasCheckedToday ? "You're up to date! 🎉" : "Check JW.org today"}
              </h2>
              <p className="text-base-content/70 text-sm">
                {hasCheckedToday 
                  ? "You've checked JW.org today. Keep up the good habit!"
                  : "Visit JW.org to see the latest spiritual encouragement and news."}
              </p>
            </div>

            {/* Big Check Button */}
            <button
              onClick={handleCheckToday}
              disabled={hasCheckedToday}
              className={`btn btn-lg w-full gap-3 ${hasCheckedToday 
                ? 'btn-success' 
                : 'btn-primary'
              } ${isAnimating ? 'animate-pulse' : ''}`}
              aria-label={hasCheckedToday ? "Already checked today" : "Mark as checked today"}
            >
              {hasCheckedToday ? (
                <>
                  <Check className="w-6 h-6" />
                  Checked Today
                </>
              ) : (
                <>
                  <Target className="w-6 h-6" />
                  I've Checked JW.org Today
                </>
              )}
            </button>

            {/* Open JW.org Button */}
            <button
              onClick={handleOpenJW}
              className="btn btn-outline btn-lg w-full gap-3 mt-3"
              aria-label="Open JW.org What's New page"
            >
              <ExternalLink className="w-5 h-5" />
              Open JW.org What's New
            </button>

            {hasCheckedToday && (
              <div className="text-center mt-4 text-sm text-base-content/50">
                You have already checked today.
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Streak Card */}
          <div className="card bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20">
            <div className="card-body p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/20">
                  <Flame className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{currentStreak}</div>
                  <div className="text-xs text-base-content/70">Day Streak</div>
                </div>
              </div>
            </div>
          </div>

          {/* Total Checks Card */}
          <div className="card bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
            <div className="card-body p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/20">
                  <Trophy className="w-5 h-5 text-success" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{totalCheckCount}</div>
                  <div className="text-xs text-base-content/70">Total Checks</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="card bg-base-100 shadow-md mb-6">
          <div className="card-body p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="font-bold">Last 30 Days</h3>
              <div className="ml-auto text-sm text-base-content/50">
                {checksLast30Days}/30 days
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {last30Days.map((day, index) => {
                const isChecked = history.some(date => isSameDay(parseISO(date), day));
                const isToday = isSameDay(day, today);
                return (
                  <div
                    key={index}
                    className={`aspect-square rounded flex items-center justify-center text-xs
                      ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''}
                      ${isChecked 
                        ? 'bg-primary text-primary-content' 
                        : 'bg-base-300 text-base-content/40'
                      }`}
                    title={format(day, 'MMM d, yyyy') + (isChecked ? ' ✓' : '')}
                  >
                    {format(day, 'd')}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-primary"></div>
                <span className="text-base-content/70">Checked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-base-300"></div>
                <span className="text-base-content/70">Not checked</span>
              </div>
            </div>
          </div>
        </div>

        {/* History List */}
        {history.length > 0 && (
          <div className="card bg-base-100 shadow-md">
            <div className="card-body p-5">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-primary" />
                <h3 className="font-bold">Recent Checks</h3>
              </div>

              <div className="space-y-3">
                {history
                  .slice(-10)
                  .reverse()
                  .map((date, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-base-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Check className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {format(parseISO(date), 'EEEE, MMMM d')}
                          </div>
                          <div className="text-sm text-base-content/50">
                            {format(parseISO(date), 'h:mm a')}
                          </div>
                        </div>
                      </div>
                      {index === 0 && (
                        <span className="badge badge-primary badge-sm">Latest</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="card bg-base-100/50 border border-base-300 mt-6">
          <div className="card-body p-5">
            <h4 className="font-bold mb-2">About This Feature</h4>
            <p className="text-sm text-base-content/70 mb-3">
              This daily check helps you develop a consistent habit of visiting JW.org 
              for spiritual encouragement. Instead of displaying content directly, 
              we encourage you to visit the official website.
            </p>
            <div className="text-xs text-base-content/50">
              <p>• No content is hosted or displayed by this app</p>
              <p>• All content remains on JW.org</p>
              <p>• This app only tracks your personal habit</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default News;