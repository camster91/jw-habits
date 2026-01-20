import { format } from 'date-fns';
import { BookOpen, Check, ExternalLink } from 'lucide-react';
import useProgressStore from '../stores/progressStore';
import { getDailyTextLink } from '../utils/jwLibraryLinks';

function DailyTextCard() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayFormatted = format(new Date(), 'EEEE, MMMM d, yyyy');
  const {
    isDailyTextRead,
    markDailyTextRead,
    getDailyTextProgress,
    updateDailyTextProgress
  } = useProgressStore();

  const isRead = isDailyTextRead(today);
  const progress = getDailyTextProgress(today);

  const dailyTextLink = getDailyTextLink(new Date());

  const handleMarkRead = () => {
    markDailyTextRead(today);
  };

  const handleCheckboxChange = (field, checked) => {
    updateDailyTextProgress(today, field, checked);
  };

  const checklistItems = [
    { key: 'readScripture', label: 'Read Scripture', description: 'Read the daily Bible verse' },
    { key: 'readComments', label: 'Read Comments', description: 'Read the explanatory comments' },
    { key: 'meditated', label: 'Meditated', description: 'Reflected on the application' }
  ];

  const getProgressColor = () => {
    if (progress.progress === 100) return 'bg-success';
    if (progress.progress > 0) return 'bg-warning';
    return 'bg-base-300';
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <h2 className="card-title text-lg">Daily Text</h2>
          </div>
          {isRead ? (
            <div className="badge badge-success gap-2">
              <Check className="w-4 h-4" />
              Complete
            </div>
          ) : progress.progress > 0 ? (
            <div className="badge badge-warning gap-1">
              {progress.progress}%
            </div>
          ) : null}
        </div>

        <p className="text-sm text-base-content/70">{todayFormatted}</p>

        <div className="divider my-2"></div>

        <div className="space-y-3">
          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-base-300 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            <span className="text-xs font-medium w-8">{progress.progress}%</span>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            {checklistItems.map((item) => (
              <label
                key={item.key}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-base-200 cursor-pointer transition-colors"
              >
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={progress[item.key] || false}
                    onChange={(e) => handleCheckboxChange(item.key, e.target.checked)}
                    className="checkbox checkbox-sm checkbox-primary"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${progress[item.key] ? 'line-through text-base-content/50' : ''}`}>
                    {item.label}
                  </span>
                  <p className="text-xs text-base-content/60">{item.description}</p>
                </div>
                {progress[item.key] && (
                  <Check className="w-4 h-4 text-success flex-shrink-0" />
                )}
              </label>
            ))}
          </div>

          <a
            href={dailyTextLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-primary w-full"
          >
            <ExternalLink className="w-4 h-4" />
            Open in JW Library
          </a>
        </div>

        <div className="card-actions justify-end mt-4">
          {!isRead && (
            <button
              onClick={handleMarkRead}
              className="btn btn-primary btn-sm"
            >
              <Check className="w-4 h-4" />
              Mark All Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DailyTextCard;
