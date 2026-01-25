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
    (field, checked) => {
      haptics.light();
      updateDailyTextProgress(today, field, checked);

      // Success haptic when completing all tasks
      const newProgress = { ...dailyTextProgress, [field]: checked };
      if (newProgress.readScripture && newProgress.readComments && newProgress.meditated) {
        setTimeout(() => haptics.success(), 100);
      }
    },
    [today, updateDailyTextProgress, dailyTextProgress]
  );

  const handleBibleProgressChange = useCallback(
    (e) => {
      const value = parseInt(e.target.value);
      haptics.selection();
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
        <div className="flex items-center justify-center gap-2 p-3 bg-success/10 rounded-2xl text-success">
          <Sparkles className="w-5 h-5" />
          <span className="font-medium text-sm">All daily tasks complete!</span>
        </div>
      )}

      {/* Daily Text Card */}
      <article className="card-mobile p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDailyTextComplete ? 'bg-success/10' : 'bg-primary/10'}`}>
              <BookOpen className={`w-5 h-5 ${isDailyTextComplete ? 'text-success' : 'text-primary'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Daily Text</h3>
              <p className="text-xs text-base-content/50">Scripture & meditation</p>
            </div>
          </div>
          {isDailyTextComplete ? (
            <div className="badge badge-success gap-1 font-medium">
              <Check className="w-3 h-3" />
              Done
            </div>
          ) : (
            <div className="radial-progress text-primary text-xs" style={{"--value": dailyTextProgress.progress, "--size": "2.5rem", "--thickness": "3px"}} role="progressbar">
              {dailyTextProgress.progress}%
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {[
            { field: 'readScripture', label: 'Read' },
            { field: 'readComments', label: 'Comments' },
            { field: 'meditated', label: 'Meditate' },
          ].map(({ field, label }) => (
            <label
              key={field}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer select-none transition-all ${
                dailyTextProgress[field] ? 'bg-success/10 text-success' : 'bg-base-200/50 hover:bg-base-200'
              }`}
            >
              <input
                type="checkbox"
                checked={dailyTextProgress[field] || false}
                onChange={(e) => handleDailyTextCheck(field, e.target.checked)}
                className="checkbox checkbox-sm checkbox-success"
              />
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
          <a
            href={dailyTextLink}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto btn btn-ghost btn-sm btn-circle"
            aria-label="Open in JW Library"
            onClick={() => haptics.light()}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </article>

      {/* News Card */}
      <article className="card-mobile p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/10">
              <Newspaper className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">News</h3>
              <p className="text-xs text-base-content/50">Latest from JW.org</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <span className="badge badge-accent badge-pulse font-medium">{unreadCount} new</span>
          )}
        </div>

        {latestNews.length > 0 && (
          <div className="mt-3 space-y-2">
            {latestNews.map((item) => {
              const isRead = isItemRead(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => handleNewsClick(item)}
                  className={`flex items-center gap-3 p-2 rounded-xl press-effect group w-full text-left ${
                    isRead ? 'bg-success/5' : ''
                  }`}
                >
                  {item.thumbnail ? (
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <img
                        src={item.thumbnail}
                        alt=""
                        className={`w-12 h-12 rounded-lg object-cover bg-base-200 ${isRead ? 'opacity-70' : ''}`}
                        loading="lazy"
                      />
                      {isRead && (
                        <div className="absolute inset-0 flex items-center justify-center bg-success/20 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-base-200 flex items-center justify-center flex-shrink-0">
                      {isRead ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : (
                        <Newspaper className="w-5 h-5 text-base-content/30" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate transition-colors ${
                      isRead ? 'text-base-content/50' : 'group-hover:text-accent'
                    }`}>
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.category && (
                        <p className="text-xs text-base-content/50">{item.category}</p>
                      )}
                      {isRead && (
                        <span className="text-xs text-success flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Read
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={handleViewNews}
          className="btn btn-ghost btn-sm w-full mt-2 gap-1 text-accent"
        >
          View All News
          <ChevronRight className="w-4 h-4" />
        </button>
      </article>

      {/* Bible Reading Card */}
      <article className="card-mobile p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isBibleComplete ? 'bg-success/10' : 'bg-secondary/10'}`}>
              <Book className={`w-5 h-5 ${isBibleComplete ? 'text-success' : 'text-secondary'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Daily Study</h3>
              <p className="text-xs text-base-content/50">Bible reading progress</p>
            </div>
          </div>
          {isBibleComplete ? (
            <div className="badge badge-success gap-1 font-medium">
              <Check className="w-3 h-3" />
              Done
            </div>
          ) : (
            <span className="text-sm font-bold text-secondary">{bibleReadingProgress}%</span>
          )}
        </div>

        <div className="mt-4">
          <input
            type="range"
            min="0"
            max="100"
            step="25"
            value={bibleReadingProgress}
            onChange={handleBibleProgressChange}
            className={`range range-sm w-full ${isBibleComplete ? 'range-success' : 'range-secondary'}`}
            aria-label="Bible reading progress"
          />
          <div className="flex justify-between px-1 mt-1">
            {[0, 25, 50, 75, 100].map((val) => (
              <span
                key={val}
                className={`text-xs ${bibleReadingProgress >= val ? 'text-secondary font-medium' : 'text-base-content/30'}`}
              >
                {val}%
              </span>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}

export default DailyTasksSection;
