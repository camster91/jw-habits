import { Play, BookOpen, Newspaper, Video, ExternalLink, CheckCircle2, Bookmark, Calendar } from 'lucide-react';
import useNewsStore from '../stores/newsStore';
import { haptics } from '../utils/native';

// Category badge colors
const getCategoryColor = (type) => {
  switch (type) {
    case 'news_release':
      return 'badge-info';
    case 'magazine':
      return 'badge-success';
    case 'video':
      return 'badge-secondary';
    case 'life_story':
      return 'badge-primary';
    case 'educational':
      return 'badge-accent';
    default:
      return 'badge-neutral';
  }
};

// Category icon component
function CategoryIcon({ type, className }) {
  switch (type) {
    case 'video':
      return <Video className={className} />;
    case 'magazine':
      return <BookOpen className={className} />;
    default:
      return <Newspaper className={className} />;
  }
}

// Format publication date relative to now
const formatPubDate = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date)) return null;
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

function NewsCard({ item, compact = false }) {
  const { markAsRead, isItemRead, toggleSaveItem, isItemSaved } = useNewsStore();
  const isRead = isItemRead(item.id);
  const isSaved = isItemSaved(item.id);
  const dateLabel = formatPubDate(item.pubDate);

  const handleClick = () => {
    haptics.light();
    markAsRead(item.id);
    window.open(item.url, '_blank', 'noopener,noreferrer');
  };

  const handleSaveClick = (e) => {
    e.stopPropagation(); // Prevent card click
    haptics.light();
    toggleSaveItem(item);
  };

  if (compact) {
    return (
      <div
        className={`w-full text-left p-3 rounded-lg hover:bg-base-200 transition-colors flex items-center gap-3 ${
          isRead ? 'bg-base-200/50' : ''
        }`}
      >
        <button
          onClick={handleClick}
          className="flex items-center gap-3 flex-1 min-w-0"
          aria-label={`${item.title} - ${item.category}${isRead ? ' - Read' : ''}`}
        >
          {isRead ? (
            <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" aria-hidden="true" />
          ) : (
            <CategoryIcon type={item.type} className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
          )}
          <span className={`text-sm flex-1 truncate ${isRead ? 'text-base-content/50' : ''}`}>
            {item.title}
          </span>
        </button>
        {dateLabel && (
          <span className="text-xs text-base-content/40 flex-shrink-0">{dateLabel}</span>
        )}
        {isRead && (
          <span className="text-xs text-success/70 flex-shrink-0">Read</span>
        )}
        <button
          onClick={handleSaveClick}
          className={`p-1 rounded ${isSaved ? 'text-warning' : 'text-base-content/30'}`}
          aria-label={isSaved ? 'Remove from saved' : 'Save for later'}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <article
      onClick={handleClick}
      className={`card bg-base-100 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-[0.99] ${
        isRead ? 'ring-2 ring-success/20 bg-success/5' : ''
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={`${item.title} - ${item.category}${isRead ? ' - Read' : ''}`}
    >
      <div className="card-body p-4">
        <div className="flex gap-4">
          {/* Thumbnail */}
          {item.thumbnail ? (
            <div className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-base-200">
              <img
                src={item.thumbnail}
                alt=""
                className={`w-full h-full object-cover ${isRead ? 'opacity-70' : ''}`}
                loading="lazy"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              {item.isVideo && !isRead && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="w-8 h-8 text-white drop-shadow-lg" fill="white" />
                </div>
              )}
              {isRead && (
                <div className="absolute inset-0 flex items-center justify-center bg-success/20">
                  <CheckCircle2 className="w-8 h-8 text-success drop-shadow-lg" />
                </div>
              )}
            </div>
          ) : (
            <div className="relative flex-shrink-0 w-24 h-24 rounded-xl bg-base-200 flex items-center justify-center">
              {isRead ? (
                <CheckCircle2 className="w-10 h-10 text-success/50" />
              ) : (
                <CategoryIcon type={item.type} className="w-10 h-10 text-base-content/20" />
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Category Badge & Actions */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge badge-sm ${getCategoryColor(item.type)}`}>
                {item.category}
              </span>
              {dateLabel && (
                <span className="text-xs text-base-content/40 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {dateLabel}
                </span>
              )}
              <div className="flex items-center gap-1 ml-auto">
                {isRead && (
                  <span className="badge badge-sm badge-success gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Read
                  </span>
                )}
                <button
                  onClick={handleSaveClick}
                  className={`btn btn-ghost btn-xs btn-circle ${isSaved ? 'text-warning' : 'text-base-content/30'}`}
                  aria-label={isSaved ? 'Remove from saved' : 'Save for later'}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Title */}
            <h3 className={`font-semibold text-sm leading-snug line-clamp-2 ${isRead ? 'text-base-content/60' : ''}`}>
              {item.title}
            </h3>

            {/* Description */}
            {item.description && (
              <p className="text-xs text-base-content/50 mt-1 line-clamp-2">{item.description}</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default NewsCard;
