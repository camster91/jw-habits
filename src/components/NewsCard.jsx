import { Play, Clock, BookOpen, Newspaper, Video, ExternalLink } from 'lucide-react';
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

function NewsCard({ item, compact = false }) {
  const { markAsRead, isItemRead } = useNewsStore();
  const isRead = isItemRead(item.id);

  const handleClick = () => {
    haptics.light();
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
      </button>
    );
  }

  return (
    <article
      onClick={handleClick}
      className={`card bg-base-100 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-[0.99] ${
        isRead ? 'opacity-70' : ''
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={`${item.title} - ${item.category}`}
    >
      <div className="card-body p-4">
        <div className="flex gap-4">
          {/* Thumbnail */}
          {item.thumbnail ? (
            <div className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-base-200">
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
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="w-8 h-8 text-white drop-shadow-lg" fill="white" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex-shrink-0 w-24 h-24 rounded-xl bg-base-200 flex items-center justify-center">
              <CategoryIcon type={item.type} className="w-10 h-10 text-base-content/20" />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Category Badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge badge-sm ${getCategoryColor(item.type)}`}>
                {item.category}
              </span>
              <ExternalLink className="w-3 h-3 text-base-content/30 ml-auto" />
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
