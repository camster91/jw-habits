import { Book, Check, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { haptics } from '../utils/native';
import { JW_ORG_SECTIONS } from '../utils/jwLibraryLinks';

function WeekendMeetingSection({
  date,
  isPrepared,
  daysLeft,
  progress,
  parts,
  onPartToggle,
  onMarkAllComplete,
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="font-semibold text-sm">{date}</p>
        {isPrepared ? (
          <div className="badge badge-success gap-1"><Check className="w-3 h-3" /> Prepared</div>
        ) : daysLeft >= 0 ? (
          <div className="badge badge-warning gap-1"><Clock className="w-3 h-3" /> {daysLeft}d left</div>
        ) : (
          <div className="badge badge-error">Past</div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-base-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              progress.progress === 100 ? 'bg-success' :
              progress.progress > 0 ? 'bg-blue-500' : 'bg-base-200'
            }`}
            style={{ width: `${progress.progress || 0}%` }}
          />
        </div>
        <span className="text-xs font-medium text-base-content/50">{progress.progress || 0}%</span>
      </div>

      <div className="space-y-2">
        {parts.map((part) => (
          part.key === 'publicTalk' ? (
            <div key={part.key} className="flex items-center gap-3 p-3 bg-base-200/50 rounded-xl">
              <Book className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">{part.title}</p>
                <p className="text-xs text-base-content/50">{part.duration} minutes</p>
              </div>
            </div>
          ) : (
            <label
              key={part.key}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
                part.completed ? 'bg-success/5' : 'bg-base-200/50 hover:bg-base-200'
              }`}
            >
              <input
                type="checkbox"
                checked={part.completed}
                onChange={(e) => { haptics.light(); onPartToggle(part.key, e.target.checked); }}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <div className="flex-1">
                <p className={`font-medium text-sm ${part.completed ? 'line-through text-base-content/40' : ''}`}>{part.title}</p>
                <p className="text-xs text-base-content/50">{part.duration} minutes</p>
              </div>
              {part.completed && <Check className="w-4 h-4 text-success" />}
            </label>
          )
        ))}
      </div>

      <a
        href={JW_ORG_SECTIONS.watchtowerStudy}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-outline btn-sm w-full gap-2"
        onClick={() => haptics.light()}
      >
        <ExternalLink className="w-4 h-4" />
        View Watchtower Study
      </a>

      {!isPrepared && progress.progress < 100 && (
        <button
          onClick={onMarkAllComplete}
          className="btn btn-primary btn-sm w-full gap-2"
        >
          <Check className="w-4 h-4" />
          Mark All Complete
        </button>
      )}
    </div>
  );
}

export default WeekendMeetingSection;