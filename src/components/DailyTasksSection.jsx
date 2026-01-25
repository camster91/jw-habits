import { useEffect } from 'react';
import { format } from 'date-fns';
import { BookOpen, Book, Newspaper, Check, ExternalLink, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useProgressStore from '../stores/progressStore';
import useNewsStore from '../stores/newsStore';
import { getDailyTextLink } from '../utils/jwLibraryLinks';
import { getDayOfYear } from 'date-fns';

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

  const handleDailyTextCheck = (field, checked) => {
    updateDailyTextProgress(today, field, checked);
  };

  const handleBibleProgressChange = (e) => {
    updateBibleReadingProgress(dayOfYear, parseInt(e.target.value));
  };

  return (
    <div className="space-y-3">
      {/* Daily Text - Compact */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Daily Text</h3>
            </div>
            {isDailyTextComplete ? (
              <div className="badge badge-success badge-sm gap-1">
                <Check className="w-3 h-3" />
                Done
              </div>
            ) : (
              <span className="text-xs text-base-content/60">{dailyTextProgress.progress}%</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            {['readScripture', 'readComments', 'meditated'].map((field, idx) => (
              <label key={field} className="flex items-center gap-1 cursor-pointer">
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
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* News - Compact */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-accent" />
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
                  className="block text-sm hover:text-primary truncate"
                >
                  {item.title}
                </a>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate('/news')}
            className="btn btn-ghost btn-xs mt-1 self-end"
          >
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Bible Reading - Compact */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Book className="w-5 h-5 text-secondary" />
              <h3 className="font-semibold">Daily Study</h3>
            </div>
            {isBibleComplete ? (
              <div className="badge badge-success badge-sm gap-1">
                <Check className="w-3 h-3" />
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
            />
            <span className="text-xs w-8">{bibleReadingProgress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DailyTasksSection;
