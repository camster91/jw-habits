import { useEffect, useCallback } from 'react';
import { format, getDayOfYear } from 'date-fns';
import { BookOpen, Book, Newspaper, Check, ExternalLink, ChevronRight } from 'lucide-react';
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
  const { fetchNews, getLatestItems, getUnreadCount } = useNewsStore();
  const latestNews = getLatestItems(2);
  const unreadCount = getUnreadCount();

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

  return (
    <div className="space-y-3">
      {/* Daily Text - Compact */}
      <article className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" aria-hidden="true" />
              <h3 className="font-semibold">Daily Text</h3>
            </div>
            {isDailyTextComplete ? (
              <div className="badge badge-success badge-sm gap-1">
                <Check className="w-3 h-3" aria-hidden="true" />
                Done
              </div>
            ) : (
              <span className="text-xs text-base-content/60">{dailyTextProgress.progress}%</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {['readScripture', 'readComments', 'meditated'].map((field, idx) => (
              <label
                key={field}
                className="flex items-center gap-1 cursor-pointer select-none active:scale-95 transition-transform"
              >
                <input
                  type="checkbox"
                  checked={dailyTextProgress[field] || false}
                  onChange={(e) => handleDailyTextCheck(field, e.target.checked)}
                  className="checkbox checkbox-xs checkbox-primary"
                />
                <span className="text-xs">{['Read', 'Comments', 'Meditate'][idx]}</span>
              </label>
            ))}
            <a
              href={dailyTextLink}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto btn btn-ghost btn-xs"
              aria-label="Open in JW Library"
              onClick={() => haptics.light()}
            >
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
        </div>
      </article>

      {/* News - Compact */}
      <article className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-accent" aria-hidden="true" />
              <h3 className="font-semibold">News</h3>
            </div>
            {unreadCount > 0 && (
              <span className="badge badge-accent badge-sm">{unreadCount} new</span>
            )}
          </div>

          {latestNews.length > 0 && (
            <div className="mt-2 space-y-1">
              {latestNews.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm hover:text-primary active:text-primary/70 truncate transition-colors"
                  onClick={() => haptics.light()}
                >
                  {item.title}
                </a>
              ))}
            </div>
          )}

          <button
            onClick={handleViewNews}
            className="btn btn-ghost btn-xs mt-1 self-end active:scale-95 transition-transform"
          >
            View All <ChevronRight className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      </article>

      {/* Bible Reading - Compact */}
      <article className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Book className="w-5 h-5 text-secondary" aria-hidden="true" />
              <h3 className="font-semibold">Daily Study</h3>
            </div>
            {isBibleComplete ? (
              <div className="badge badge-success badge-sm gap-1">
                <Check className="w-3 h-3" aria-hidden="true" />
                Done
              </div>
            ) : (
              <span className="text-xs text-base-content/60">{bibleReadingProgress}%</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              type="range"
              min="0"
              max="100"
              step="25"
              value={bibleReadingProgress}
              onChange={handleBibleProgressChange}
              className="range range-xs range-secondary flex-1"
              aria-label="Bible reading progress"
            />
            <span className="text-xs w-8 tabular-nums">{bibleReadingProgress}%</span>
          </div>
        </div>
      </article>
    </div>
  );
}

export default DailyTasksSection;
