import { ExternalLink, Clock, Newspaper } from 'lucide-react';
import useNewsfeed from '../hooks/useNewsfeed';

const MAX_ITEMS = 5;

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function NewsfeedItems() {
  const { items, loading } = useNewsfeed();

  if (loading) {
    return (
      <div className="mt-3 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
            <div className="w-10 h-10 bg-base-300 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-base-300 rounded w-3/4" />
              <div className="h-2 bg-base-300 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) return null;

  const recent = items.slice(0, MAX_ITEMS);

  return (
    <div className="mt-3 space-y-1">
      <div className="flex items-center gap-2 text-xs font-medium text-base-content/50 mb-2">
        <Newspaper className="w-3 h-3" />
        Latest from JW.org
      </div>
      {recent.map((item, i) => (
        <a
          key={i}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 p-2 rounded-lg hover:bg-base-200 transition-colors active:scale-[0.99] group"
        >
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt=""
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-base-300"
              loading="lazy"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-base-300 flex-shrink-0 flex items-center justify-center">
              <Newspaper className="w-4 h-4 text-base-content/40" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {item.title}
              </p>
              <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5 text-base-content/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {item.category && (
                <span className="text-[10px] font-medium px-1.5 py-px rounded bg-primary/10 text-primary">
                  {item.category}
                </span>
              )}
              {item.pubDate && (
                <span className="text-[10px] text-base-content/40 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {formatDate(item.pubDate)}
                </span>
              )}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
