import { useEffect } from 'react';
import { Newspaper, ChevronRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useNewsStore from '../stores/newsStore';
import NewsCard from './NewsCard';

function NewsWidget() {
  const navigate = useNavigate();
  const { isLoading, fetchNews, getLatestItems, getUnreadCount } = useNewsStore();

  const latestItems = getLatestItems(3);
  const unreadCount = getUnreadCount();

  // Fetch news on mount (uses cache if valid)
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleViewAll = () => {
    navigate('/news');
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-primary" />
            <h2 className="card-title text-lg">Latest from JW.org</h2>
          </div>
          {unreadCount > 0 && (
            <span className="badge badge-primary">{unreadCount} new</span>
          )}
        </div>

        <div className="divider my-2"></div>

        {/* Loading State */}
        {isLoading && latestItems.length === 0 && (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        {/* News Items (Compact) */}
        {latestItems.length > 0 && (
          <div className="divide-y divide-base-200">
            {latestItems.map((item) => (
              <NewsCard key={item.id} item={item} compact />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && latestItems.length === 0 && (
          <p className="text-center text-base-content/60 py-4 text-sm">
            No news available
          </p>
        )}

        {/* View All Button */}
        <div className="card-actions justify-end mt-2">
          <button
            onClick={handleViewAll}
            className="btn btn-ghost btn-sm gap-1"
            aria-label="View all news"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewsWidget;
