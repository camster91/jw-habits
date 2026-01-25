import { useEffect, useCallback } from 'react';
import { format, getDayOfYear } from 'date-fns';
import { BookOpen, Book, Newspaper, Check, ExternalLink, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useProgressStore from '../stores/progressStore';
import useNewsStore from '../stores/newsStore';
import { getDailyTextLink } from '../utils/jwLibraryLinks';
import { haptics } from '../utils/native';

function DailyTasksSection() {
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const dayOfYear = getDayOfYear(new Date());

  // Daily Text state
  const {
    isDailyTextRead,
    getDailyTextProgress,
    updateDailyTextProgress,
    isBibleReadingComplete,
    getBibleReadingProgress,
    updateBibleReadingProgress,
  } = useProgressStore();

  const dailyTextProgress = getDailyTextProgress(today);
  const isDailyTextComplete = isDailyTextRead(today);
  const dailyTextLink = getDailyTextLink(new Date());

  // Bible Reading state
  const bibleReadingProgress = getBibleReadingProgress(dayOfYear);
  const isBibleComplete = isBibleReadingComplete(dayOfYear);

  // News state
  const { fetchNews, getLatestItems, getUnreadCount, markAsRead, isItemRead } = useNewsStore();
  const latestNews = getLatestItems(3);
  const unreadCount = getUnreadCount();

  const handleNewsClick = useCallback((item) => {
    haptics.light();
    markAsRead(item.id);
    window.open(item.url, '_blank', 'noopener,noreferrer');
  }, [markAsRead]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleDailyTextCheck = useCallback(
    (field) => {
      haptics.light();
      const newValue = !dailyTextProgress[field];
      updateDailyTextProgress(today, field, newValue);

      // Success haptic when completing all tasks
      const newProgress = { ...dailyTextProgress, [field]: newValue };
      if (newProgress.readScripture && newProgress.readComments && newProgress.meditated) {
        setTimeout(() => haptics.success(), 100);
      }
    },
    [today, updateDailyTextProgress, dailyTextProgress]
  );

  const handleBibleProgressTap = useCallback(
    (value) => {
      haptics.light();
      updateBibleReadingProgress(dayOfYear, value);

      // Success haptic when completing
      if (value === 100) {
        setTimeout(() => haptics.success(), 100);
      }
    },
    [dayOfYear, updateBibleReadingProgress]
  );

  const handleViewNews = useCallback(() => {
    haptics.light();
    navigate('/news');
  }, [navigate]);

  // Calculate overall progress
  const tasksCompleted = [isDailyTextComplete, isBibleComplete].filter(Boolean).length;
  const totalTasks = 2;

  return (
    <div className="space-y-3">
      {/* Progress Overview */}
      {tasksCompleted === totalTasks && (
        <div className="flex items-center justify-center gap-2 p-4 bg-success/10 rounded-2xl text-success">
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">All daily tasks complete!</span>
        </div>
      )}

      {/* Daily Text Card */}
      <article className="card bg-base-100 shadow-sm rounded-2xl overflow-hidden">
        {/* Header - tappable to open JW Library */}
        <a
          href={dailyTextLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 active:bg-base-200 transition-colors"
          onClick={() => haptics.light()}
        >
          <div className={`p-3 rounded-2xl ${isDailyTextComplete ? 'bg-success/10' : 'bg-primary/10'}`}>
            <BookOpen className={`w-6 h-6 ${isDailyTextComplete ? 'text-success' : 'text-primary'}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">Daily Text</h3>
            <p className="text-sm text-base-content/50">Scripture & meditation</p>
          </div>
          {isDailyTextComplete ? (
            <CheckCircle2 className="w-6 h-6 text-success" />
          ) : (
            <ExternalLink className="w-5 h-5 text-base-content/30" />
          )}
        </a>

        {/* Checklist - large tap targets */}
        <div className="px-4 pb-4 space-y-2">
          {[
            { field: 'readScripture', label: 'Read Scripture' },
            { field: 'readComments', label: 'Read Comments' },
            { field: 'meditated', label: 'Meditated' },
          ].map(({ field, label }) => (
            <button
              key={field}
              onClick={() => handleDailyTextCheck(field)}
              className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all active:scale-[0.98] ${
                dailyTextProgress[field]
                  ? 'bg-success/10'
                  : 'bg-base-200/50 active:bg-base-200'
              }`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                dailyTextProgress[field]
                  ? 'bg-success border-success'
                  : 'border-base-content/20'
              }`}>
                {dailyTextProgress[field] && <Check className="w-4 h-4 text-white" />}
              </div>
              <span className={`font-medium ${dailyTextProgress[field] ? 'text-success' : ''}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </article>

      {/* News Card */}
      <article className="card bg-base-100 shadow-sm rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4">
          <div className="p-3 rounded-2xl bg-accent/10">
            <Newspaper className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">News</h3>
            <p className="text-sm text-base-content/50">Latest from JW.org</p>
          </div>
          {unreadCount > 0 && (
            <span className="badge badge-accent font-bold">{unreadCount} new</span>
          )}
        </div>

        {/* News Items - large tap targets */}
        {latestNews.length > 0 && (
          <div className="px-4 space-y-1">
            {latestNews.map((item) => {
              const isRead = isItemRead(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => handleNewsClick(item)}
                  className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all active:scale-[0.98] ${
                    isRead ? 'bg-success/5' : 'active:bg-base-200'
                  }`}
                >
                  {item.thumbnail ? (
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <img
                        src={item.thumbnail}
                        alt=""
                        className={`w-14 h-14 rounded-xl object-cover bg-base-200 ${isRead ? 'opacity-60' : ''}`}
                        loading="lazy"
                      />
                      {isRead && (
                        <div className="absolute inset-0 flex items-center justify-center bg-success/30 rounded-xl">
                          <CheckCircle2 className="w-6 h-6 text-success" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-base-200 flex items-center justify-center flex-shrink-0">
                      {isRead ? (
                        <CheckCircle2 className="w-6 h-6 text-success" />
                      ) : (
                        <Newspaper className="w-6 h-6 text-base-content/30" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`font-medium line-clamp-2 ${isRead ? 'text-base-content/50' : ''}`}>
                      {item.title}
                    </p>
                    {isRead && (
                      <span className="text-xs text-success flex items-center gap-1 mt-1">
                        <Check className="w-3 h-3" />
                        Read
                      </span>
                    )}
                  </div>
                  <ChevronRight className={`w-5 h-5 flex-shrink-0 ${isRead ? 'text-success/50' : 'text-base-content/30'}`} />
                </button>
              );
            })}
          </div>
        )}

        {/* View All Button */}
        <button
          onClick={handleViewNews}
          className="flex items-center justify-center gap-2 w-full p-4 text-accent font-medium active:bg-base-200 transition-colors"
        >
          View All News
          <ChevronRight className="w-5 h-5" />
        </button>
      </article>

      {/* Bible Reading Card */}
      <article className="card bg-base-100 shadow-sm rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4">
          <div className={`p-3 rounded-2xl ${isBibleComplete ? 'bg-success/10' : 'bg-secondary/10'}`}>
            <Book className={`w-6 h-6 ${isBibleComplete ? 'text-success' : 'text-secondary'}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">Daily Study</h3>
            <p className="text-sm text-base-content/50">Bible reading progress</p>
          </div>
          {isBibleComplete ? (
            <CheckCircle2 className="w-6 h-6 text-success" />
          ) : (
            <span className="text-lg font-bold text-secondary">{bibleReadingProgress}%</span>
          )}
        </div>

        {/* Progress Buttons - large mobile-friendly tap targets */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 75, 100].map((value) => {
              const isActive = bibleReadingProgress >= value;
              const isExact = bibleReadingProgress === value;
              return (
                <button
                  key={value}
                  onClick={() => handleBibleProgressTap(isExact ? value - 25 : value)}
                  className={`py-4 rounded-xl font-bold text-lg transition-all active:scale-95 ${
                    isActive
                      ? isBibleComplete
                        ? 'bg-success text-white'
                        : 'bg-secondary text-white'
                      : 'bg-base-200 text-base-content/40'
                  }`}
                >
                  {value}%
                </button>
              );
            })}
          </div>
          {/* Visual progress bar */}
          <div className="mt-3 h-2 bg-base-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${isBibleComplete ? 'bg-success' : 'bg-secondary'}`}
              style={{ width: `${bibleReadingProgress}%` }}
            />
          </div>
        </div>
      </article>
    </div>
  );
}

export default DailyTasksSection;
