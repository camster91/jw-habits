import { useEffect, useState } from 'react';
import { RefreshCw, Wifi, WifiOff, CheckCheck, Bookmark } from 'lucide-react';
import useNewsStore from '../stores/newsStore';
import NewsCard from '../components/NewsCard';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'articles', label: 'Articles' },
  { id: 'magazines', label: 'Magazines' },
  { id: 'videos', label: 'Videos' },
  { id: 'saved', label: 'Saved', icon: Bookmark },
];

function NewsCardSkeleton() {
  return (
    <div className="card bg-base-100 shadow-md animate-pulse">
      <div className="card-body p-4">
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-lg bg-base-300" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="h-4 w-20 bg-base-300 rounded" />
              <div className="h-4 w-16 bg-base-300 rounded ml-auto" />
            </div>
            <div className="h-4 w-full bg-base-300 rounded" />
            <div className="h-4 w-3/4 bg-base-300 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

function News() {
  const {
    isLoading,
    error,
    activeFilter,
    lastFetched,
    setFilter,
    fetchNews,
    getFilteredItems,
    getUnreadCount,
    getSavedCount,
    markAllAsRead,
  } = useNewsStore();

  const items = getFilteredItems();
  const unreadCount = getUnreadCount();
  const savedCount = getSavedCount();

  // Fetch news on mount
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleRefresh = () => {
    fetchNews(true); // Force refresh
  };

  // Calculate staleness - data older than 30 minutes is considered stale
  const STALE_THRESHOLD = 30 * 60 * 1000;
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Update current time periodically to recalculate staleness
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const isStale = lastFetched ? currentTime - lastFetched > STALE_THRESHOLD : false;

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header */}
      <header
        className="relative bg-gradient-to-br from-primary via-primary to-blue-700 text-primary-content shadow-lg"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Decorative blurs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-300/10 rounded-full blur-3xl" />
        </div>
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">What's New</h1>
              <p className="text-sm opacity-90 mt-1">Latest from JW.org</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="btn btn-circle btn-ghost"
              aria-label="Refresh news feed"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="bg-base-100 border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-2xl">
          <div
            role="tablist"
            className="flex gap-2 overflow-x-auto scrollbar-hide py-2 -mx-2 px-2"
            aria-label="Filter news by category"
          >
            {FILTER_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all flex-shrink-0 ${
                    activeFilter === tab.id
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-200 text-base-content/70 hover:bg-base-300'
                  }`}
                  onClick={() => setFilter(tab.id)}
                  aria-selected={activeFilter === tab.id}
                >
                  {Icon && <Icon className={`w-4 h-4 ${tab.id === 'saved' && savedCount > 0 ? 'fill-current' : ''}`} />}
                  {tab.label}
                  {tab.id === 'saved' && savedCount > 0 && (
                    <span className="badge badge-xs badge-warning">{savedCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        {/* Cache/Connection Status */}
        {lastFetched && (
          <div className="flex items-center justify-between text-xs text-base-content/60 mb-4">
            <div className="flex items-center gap-2">
              {navigator.onLine ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              <span>
                Updated {new Date(lastFetched).toLocaleTimeString()}
                {isStale && ' (stale)'}
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="btn btn-ghost btn-xs gap-1"
                aria-label="Mark all as read"
              >
                <CheckCheck className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="alert alert-warning mb-4">
            <WifiOff className="w-5 h-5" />
            <div>
              <p className="font-semibold">Couldn't load news</p>
              <p className="text-sm">{error}</p>
            </div>
            <button onClick={handleRefresh} className="btn btn-sm">
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && items.length === 0 && (
          <div className="space-y-4">
            <NewsCardSkeleton />
            <NewsCardSkeleton />
            <NewsCardSkeleton />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && items.length === 0 && !error && (
          <div className="text-center py-12">
            {activeFilter === 'saved' ? (
              <>
                <Bookmark className="w-12 h-12 mx-auto text-base-content/20 mb-4" />
                <p className="text-base-content/60 mb-2 font-medium">No saved items</p>
                <p className="text-base-content/40 text-sm">
                  Tap the bookmark icon on any news item to save it for later
                </p>
              </>
            ) : (
              <>
                <p className="text-base-content/60 mb-4">No news items found</p>
                <button onClick={handleRefresh} className="btn btn-primary btn-sm">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </>
            )}
          </div>
        )}

        {/* News List */}
        {items.length > 0 && (
          <div className="space-y-4" role="feed" aria-label="News feed">
            {items.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Loading More Indicator */}
        {isLoading && items.length > 0 && (
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner loading-md text-primary"></span>
          </div>
        )}
      </div>
    </div>
  );
}

export default News;
