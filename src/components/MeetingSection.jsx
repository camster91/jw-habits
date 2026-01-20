import { useState } from 'react';
import { ChevronDown, ChevronRight, Check, Circle } from 'lucide-react';

function MeetingSection({ title, color, parts, onPartToggle, defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const completedCount = parts.filter(p => p.completed).length;
  const totalCount = parts.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getProgressColor = () => {
    if (progress === 100) return 'bg-success';
    if (progress > 0) return 'bg-warning';
    return 'bg-base-300';
  };

  return (
    <div className="border border-base-300 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-base-200 hover:bg-base-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <div className={`w-3 h-3 rounded-full ${color}`}></div>
          <span className="font-medium text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-base-content/60">
            {completedCount}/{totalCount}
          </span>
          <div className="w-16 h-2 bg-base-300 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor()} transition-all duration-300`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 space-y-2 bg-base-100">
          {parts.map((part) => (
            <label
              key={part.key}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-base-200 cursor-pointer transition-colors"
            >
              <div className="pt-0.5">
                <input
                  type="checkbox"
                  checked={part.completed}
                  onChange={(e) => onPartToggle(part.key, e.target.checked)}
                  className="checkbox checkbox-sm checkbox-primary"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${part.completed ? 'line-through text-base-content/50' : ''}`}>
                    {part.title}
                  </span>
                  {part.duration && (
                    <span className="text-xs text-base-content/40">
                      ({part.duration} min)
                    </span>
                  )}
                </div>
                {part.subtitle && (
                  <p className="text-xs text-base-content/60 mt-0.5">{part.subtitle}</p>
                )}
              </div>
              {part.completed && (
                <Check className="w-4 h-4 text-success flex-shrink-0" />
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default MeetingSection;
