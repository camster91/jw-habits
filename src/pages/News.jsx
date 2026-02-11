import { useEffect, useState, useRef } from 'react';
import { RefreshCw, Wifi, WifiOff, CheckCheck, Bookmark, Newspaper, Play, Filter } from 'lucide-react';
import useNewsStore from '../stores/newsStore';
import NewsCard from '../components/NewsCard';

const NEWS_FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'articles', label: 'Articles' },
  { id: 'magazines', label: 'Magazines' },
  { id: 'videos', label: 'Videos' },
  { id: 'saved', label: 'Saved', icon: Bookmark },
];

const VIDEOS_FILTER_TABS = [
  { id: 'all', label: 'All Videos' },
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

function VideoCardSkeleton() {
  return (
    <div className="card bg-base-100 shadow-md animate-pulse">
      <div className="w-full aspect-video rounded-t-2xl bg-base-300" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 bg-base-300 rounded" />
        <div className="h-3 w-1/2 bg-base-300 rounded" />
      </div>
    </div>
  );
}

function News() {
  const {
    isLoading,
    error,
    activeFilter,
    activeFeed,
    lastFetched,
    setFilter,
    setActiveFeed,
    fetchNews,
    getFilteredItems,
    getUnreadCount,
    getNewsUnreadCount,
    getVideosUnreadCount,
    getSavedCount,
    markAllAsRead,
  } = useNewsStore();

  const items = getFilteredItems();
  const unreadCount = getUnreadCount();
  const newsUnread = getNewsUnreadCount();
  const videosUnread = getVideosUnreadCount();
  const savedCount = getSavedCount();
  const contentRef = useRef(null);
  const [fadeKey, setFadeKey] = useState(activeFeed);

  const filterTabs = activeFeed === 'videos' ? VIDEOS_FILTER_TABS : NEWS_FILTER_TABS;

  // Fetch news on mount
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleRefresh = () => {
    fetchNews(true);
  };

  const handleFeedSwitch = (feed) => {
    if (feed === activeFeed) return;
    setFadeKey(feed);
    setActiveFeed(feed);
    // Scroll content area back to top on feed switch
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Staleness
  const STALE_THRESHOLD = 30 * 60 * 1000;
  const [currentTime, setCurrentTime] = useState(() => Date.now());
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
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-2 right-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-300/10 rounded-full blur-3xl" />
        </div>

        <div className="relative px-5 pt-4 pb-4">
          {/* Title row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">News</h1>
              <p className="text-xs text-primary-content/60">From jw.org</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="btn btn-sm btn-ghost btn-circle"
              aria-label="Refresh news feed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Feed Switcher — card-style tabs */}
          <div
            className="grid grid-cols-2 gap-2"
            role="tablist"
            aria-label="Choose feed"
          >
            {/* What's New tab */}
            <button
              role="tab"
              aria-selected={activeFeed === 'news'}
              className={`relative flex flex-col items-start p-3 rounded-xl transition-all duration-200 ${
                activeFeed === 'news'
                  ? 'bg-white text-primary shadow-md'
                  : 'bg-white/10 text-white/80 hover:bg-white/15 active:scale-[0.97]'
              }`}
              onClick={() => handleFeedSwitch('news')}
            >
              <div className="flex items-center gap-2 mb-1">
                <Newspaper className="w-4 h-4" />
                <span className="text-sm font-semibold">What's New</span>
              </div>
              {newsUnread > 0 ? (
                <span className={`text-2xl font-bold leading-none ${
                  activeFeed === 'news' ? 'text-primary' : 'text-white'
                }`}>
                  {newsUnread}
                  <span className={`text-xs font-medium ml-1 ${
                    activeFeed === 'news' ? 'text-primary/50' : 'text-white/50'
                  }`}>unread</span>
                </span>
              ) : (
                <span className={`text-xs ${
                  activeFeed === 'news' ? 'text-primary/50' : 'text-white/50'
                }`}>All caught up</span>
              )}
              {activeFeed === 'news' && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>

            {/* Videos tab */}
            <button
              role="tab"
              aria-selected={activeFeed === 'videos'}
              className={`relative flex flex-col items-start p-3 rounded-xl transition-all duration-200 ${
                activeFeed === 'videos'
                  ? 'bg-white text-primary shadow-md'
                  : 'bg-white/10 text-white/80 hover:bg-white/15 active:scale-[0.97]'
              }`}
              onClick={() => handleFeedSwitch('videos')}
            >
              <div className="flex items-center gap-2 mb-1">
                <Play className="w-4 h-4" />
                <span className="text-sm font-semibold">Videos</span>
              </div>
              {videosUnread > 0 ? (
                <span className={`text-2xl font-bold leading-none ${
                  activeFeed === 'videos' ? 'text-primary' : 'text-white'
                }`}>
                  {videosUnread}
                  <span className={`text-xs font-medium ml-1 ${
                    activeFeed === 'videos' ? 'text-primary/50' : 'text-white/50'
                  }`}>new</span>
                </span>
              ) : (
                <span className={`text-xs ${
                  activeFeed === 'videos' ? 'text-primary/50' : 'text-white/50'
                }`}>All watched</span>
              )}
              {activeFeed === 'videos' && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Filter Tabs — sticky */}
      <div className="bg-base-100 border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 max-w-2xl">
          <div
            role="tablist"
            className="flex gap-1.5 overflow-x-auto scrollbar-hide py-2.5 -mx-1 px-1"
            aria-label="Filter by category"
          >
            {filterTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-medium text-xs whitespace-nowrap transition-all flex-shrink-0 ${
                    isActive
                      ? 'bg-primary text-primary-content shadow-sm scale-105'
                      : 'bg-base-200 text-base-content/60 hover:bg-base-300 active:scale-95'
                  }`}
                  onClick={() => setFilter(tab.id)}
                  aria-selected={isActive}
                >
                  {Icon && <Icon className={`w-3.5 h-3.5 ${tab.id === 'saved' && savedCount > 0 ? 'fill-current' : ''}`} />}
                  {tab.label}
                  {tab.id === 'saved' && savedCount > 0 && (
                    <span className={`min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold rounded-full px-1 ${
                      isActive ? 'bg-white/25' : 'bg-warning text-warning-content'
                    }`}>{savedCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div ref={contentRef} className="container mx-auto px-4 py-3 max-w-2xl">
        {/* Status bar */}
        {lastFetched && (
          <div className="flex items-center justify-between text-xs text-base-content/50 mb-3">
            <div className="flex items-center gap-1.5">
              {navigator.onLine ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3 text-warning" />
              )}
              <span>
                {new Date(lastFetched).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                {isStale && ' · stale'}
              </span>
              {activeFilter !== 'saved' && items.length > 0 && (
                <span className="text-base-content/30">· {items.length} items</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="btn btn-ghost btn-xs gap-1 text-base-content/50 hover:text-base-content"
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
          <div className="alert alert-warning mb-4 rounded-2xl">
            <WifiOff className="w-5 h-5" />
            <div>
              <p className="font-semibold text-sm">Couldn't load feed</p>
              <p className="text-xs opacity-70">{error}</p>
            </div>
            <button onClick={handleRefresh} className="btn btn-sm btn-ghost">
              Retry
            </button>
          </div>
        )}

        {/* Animated feed content */}
        <div key={fadeKey} className="animate-fade-in-up">
          {/* Loading State */}
          {isLoading && items.length === 0 && (
            <div className="space-y-3">
              {activeFeed === 'videos' ? (
                <>
                  <VideoCardSkeleton />
                  <VideoCardSkeleton />
                </>
              ) : (
                <>
                  <NewsCardSkeleton />
                  <NewsCardSkeleton />
                  <NewsCardSkeleton />
                </>
              )}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && items.length === 0 && !error && (
            <div className="text-center py-16">
              {activeFilter === 'saved' ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-base-300/50 flex items-center justify-center">
                    <Bookmark className="w-8 h-8 text-base-content/20" />
                  </div>
                  <p className="text-base-content/60 mb-1 font-medium">No saved items</p>
                  <p className="text-base-content/40 text-sm max-w-[240px] mx-auto">
                    Tap the bookmark icon on any item to save it for later
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-base-300/50 flex items-center justify-center">
                    {activeFeed === 'videos' ? (
                      <Play className="w-8 h-8 text-base-content/20" />
                    ) : (
                      <Newspaper className="w-8 h-8 text-base-content/20" />
                    )}
                  </div>
                  <p className="text-base-content/60 mb-1 font-medium">
                    {activeFeed === 'videos' ? 'No videos yet' : 'No articles found'}
                  </p>
                  <p className="text-base-content/40 text-sm mb-4">
                    Pull to refresh or tap below
                  </p>
                  <button onClick={handleRefresh} className="btn btn-primary btn-sm gap-2 rounded-full">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                </>
              )}
            </div>
          )}

          {/* Feed List */}
          {items.length > 0 && (
            <div
              className={activeFeed === 'videos' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}
              role="feed"
              aria-label={activeFeed === 'videos' ? 'Videos feed' : 'News feed'}
            >
              {items.map((item) => (
                activeFeed === 'videos'
                  ? <VideoCard key={item.id} item={item} />
                  : <NewsCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {/* Loading spinner overlay */}
          {isLoading && items.length > 0 && (
            <div className="flex justify-center py-4">
              <span className="loading loading-spinner loading-md text-primary"></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Video-optimized card for the Videos feed — visual-first layout
function VideoCard({ item }) {
  const { markAsRead, isItemRead, toggleSaveItem, isItemSaved } = useNewsStore();
  const isRead = isItemRead(item.id);
  const isSaved = isItemSaved(item.id);

  const handleClick = () => {
    markAsRead(item.id);
    window.open(item.url, '_blank', 'noopener,noreferrer');
  };

  const handleSave = (e) => {
    e.stopPropagation();
    toggleSaveItem(item);
  };

  const cleanTitle = (title) => {
    if (!title) return '';
    return title.replace(/^[A-Z\s!''—]+\s*\|\s*/, '');
  };

  return (
    <article
      onClick={handleClick}
      className={`card bg-base-100 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-[0.97] overflow-hidden ${
        isRead ? 'opacity-60' : ''
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={`${item.title}${isRead ? ' - Watched' : ''}`}
    >
      {/* Thumbnail — large, top */}
      <div className="relative aspect-video bg-base-300 overflow-hidden">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-10 h-10 text-base-content/15" />
          </div>
        )}
        {/* Play overlay */}
        {!isRead && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 text-primary ml-0.5" fill="currentColor" />
            </div>
          </div>
        )}
        {isRead && (
          <div className="absolute top-2 left-2">
            <span className="badge badge-xs badge-success gap-0.5 text-[10px]">Watched</span>
          </div>
        )}
        {/* Bookmark */}
        <button
          onClick={handleSave}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
          aria-label={isSaved ? 'Remove from saved' : 'Save for later'}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'text-warning fill-current' : 'text-white'}`} />
        </button>
      </div>

      {/* Title */}
      <div className="p-2.5">
        <h3 className="font-semibold text-xs leading-snug line-clamp-2">
          {cleanTitle(item.title)}
        </h3>
        {item.category && (
          <p className="text-[10px] text-base-content/40 mt-1 uppercase tracking-wide truncate">
            {item.category}
          </p>
        )}
      </div>
    </article>
  );
}

export default News;
