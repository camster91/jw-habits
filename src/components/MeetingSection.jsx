import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { haptics } from '../utils/native';

function MeetingSection({ title, color, parts, onPartToggle, defaultExpanded = false }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const completedCount = parts.filter(p => p.completed).length;
  const totalCount = parts.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isComplete = progress === 100;

  const handleToggle = () => {
    haptics.light();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="bg-base-100 rounded-xl overflow-hidden shadow-sm border border-base-200">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3.5 hover:bg-base-50 active:bg-base-200 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-8 rounded-full ${color}`}></div>
          <div className="text-left">
            <span className="font-semibold text-sm">{title}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs ${isComplete ? 'text-success' : 'text-base-content/70'}`}>
                {t("study.ofComplete", { completed: completedCount, total: totalCount })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-1.5 bg-base-300 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isComplete ? 'bg-success' : progress > 0 ? 'bg-primary' : 'bg-base-300'
              }`}
              style={{ width: `${Math.max(progress, 3)}%` }}
            />
          </div>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-base-content/70" />
          ) : (
            <ChevronRight className="w-5 h-5 text-base-content/70" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3.5 pb-3.5 space-y-1.5 border-t border-base-200">
          {parts.map((part) => (
            <label
              key={part.key}
              className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all active:scale-[0.99] ${
                part.completed
                  ? 'bg-success/5 hover:bg-success/10'
                  : 'hover:bg-base-200/50'
              }`}
            >
              <div className="pt-0.5">
                <input
                  type="checkbox"
                  checked={part.completed}
                  onChange={(e) => {
                    haptics.light();
                    onPartToggle(part.key, e.target.checked);
                  }}
                  className="checkbox checkbox-sm checkbox-primary"
                  aria-label={`${part.title} (${part.duration} min)`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${part.completed ? 'line-through text-base-content/70' : ''}`}>
                    {part.title}
                  </span>
                  {part.duration && (
                    <span className="text-xs text-base-content/70 bg-base-200 px-1.5 py-0.5 rounded">
                      {part.duration} {t("bibleReading.min")}
                    </span>
                  )}
                </div>
                {part.subtitle && (
                  <p className="text-xs text-base-content/70 mt-1 line-clamp-2">{part.subtitle}</p>
                )}
              </div>
              {part.completed && (
                <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default MeetingSection;
