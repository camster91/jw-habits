import { ExternalLink, Play, Clock, BookOpen, Newspaper, Video } from 'lucide-react';
import useNewsStore from '../stores/newsStore';

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

// Category icon component - renders the appropriate icon based on type
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

// Format duration (seconds to MM:SS)
const formatDuration = (seconds) => {
  if (!seconds) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function NewsCard({ item, compact = false }) {
  const { markAsRead, isItemRead } = useNewsStore();
  const isRead = isItemRead(item.id);

  const handleClick = () => {
    markAsRead(item.id);
    window.open(item.url, '_blank', 'noopener,noreferrer');
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className={`w-full text-left p-3 rounded-lg hover:bg-base-200 transition-colors flex items-center gap-3 ${
          isRead ? 'opacity-60' : ''
        }`}
        aria-label={`${item.title} - ${item.category}`}
      >
        <CategoryIcon type={item.type} className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
        <span className={`text-sm flex-1 truncate ${isRead ? 'text-base-content/60' : ''}`}>
          {item.title}
        </span>
        {item.isVideo && item.duration && (
          <span className="text-xs text-base-content/50 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(item.duration)}
          </span>
        )}
      </button>
    );
  }

  return (
    <article
      className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow ${
        isRead ? 'opacity-75' : ''
      }`}
    >
      <div className="card-body p-4">
        <div className="flex gap-4">
          {/* Thumbnail */}
          {item.thumbnail ? (
            <div className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-base-200">
              <img
                src={item.thumbnail}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              {item.isVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Play className="w-6 h-6 text-white drop-shadow-lg" fill="white" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-base-200 flex items-center justify-center">
              <CategoryIcon type={item.type} className="w-8 h-8 text-base-content/30" />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Category & Date Row */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`badge badge-sm ${getCategoryColor(item.type)}`}>
                {item.category}
              </span>
              {item.isVideo && item.duration && (
                <span className="text-xs text-base-content/50 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(item.duration)}
                </span>
              )}
              <span className="text-xs text-base-content/50 ml-auto">{item.publishDate}</span>
            </div>

            {/* Title */}
            <h3 className={`font-semibold text-sm mb-1 line-clamp-2 ${isRead ? 'text-base-content/70' : ''}`}>
              {item.title}
            </h3>

            {/* Description */}
            {item.description && (
              <p className="text-xs text-base-content/60 line-clamp-2">{item.description}</p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="card-actions justify-end mt-2">
          <button
            onClick={handleClick}
            className="btn btn-sm btn-primary btn-outline"
            aria-label={`${item.isVideo ? 'Watch' : 'Read'} ${item.title}`}
          >
            {item.isVideo ? (
              <>
                <Play className="w-4 h-4" />
                Watch
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Read More
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

export default NewsCard;
