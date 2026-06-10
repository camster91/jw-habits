import { useTranslation } from 'react-i18next';
import { Check, CheckCircle2, Clock, ExternalLink, Music } from 'lucide-react';
import { haptics } from '../utils/native';
import MeetingSection from './MeetingSection';
import WeeklyBibleReading from './WeeklyBibleReading';

function MidweekMeetingSection({
  date,
  isPrepared,
  daysLeft,
  progress,
  parts,
  songs,
  workbookLink,
  onPartToggle,
  onMarkAllComplete,
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm">{date}</p>
          {songs?.opening && (
            <span className="flex items-center gap-1 text-xs text-base-content/70">
              <Music className="w-3 h-3" /> {songs.opening}
            </span>
          )}
        </div>
        {isPrepared ? (
          <div className="badge badge-success gap-1"><Check className="w-3 h-3" /> {t("study.prepared")}</div>
        ) : daysLeft >= 0 ? (
          <div className="badge badge-warning gap-1"><Clock className="w-3 h-3" /> {t("study.daysLeft", { days: daysLeft })}</div>
        ) : (
          <div className="badge badge-error">{t("study.past")}</div>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-base-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              progress.progress === 100 ? 'bg-success' :
              progress.progress > 0 ? 'bg-primary' : 'bg-base-200'
            }`}
            style={{ width: `${progress.progress || 0}%` }}
          />
        </div>
        <span className="text-xs font-medium text-base-content/70">{progress.progress || 0}%</span>
      </div>

      {/* Weekly Bible Reading - integrated into midweek */}
      <WeeklyBibleReading />

      {/* Meeting Sections */}
      <div className="space-y-2">
        <MeetingSection
          title={t("study.treasures")}
          color="bg-primary"
          parts={parts.treasures}
          onPartToggle={onPartToggle}
          defaultExpanded={true}
        />
        <MeetingSection
          title={t("study.ministry")}
          color="bg-secondary"
          parts={parts.ministry}
          onPartToggle={onPartToggle}
        />
        <MeetingSection
          title={t("study.living")}
          color="bg-neutral"
          parts={parts.living}
          onPartToggle={onPartToggle}
        />
      </div>

      {/* Song info */}
      {songs && (
        <div className="flex items-center justify-center gap-4 text-xs text-base-content/70 pt-1">
          {songs.middle && <span className="flex items-center gap-1"><Music className="w-3 h-3" /> Song {songs.middle}</span>}
          {songs.closing && <span className="flex items-center gap-1"><Music className="w-3 h-3" /> Song {songs.closing}</span>}
        </div>
      )}

      <a
        href={workbookLink}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-outline btn-sm w-full gap-2"
        onClick={() => haptics.light()}
      >
        <ExternalLink className="w-4 h-4" />
        {t("study.openWorkbook")}
      </a>

      {!isPrepared && progress.progress < 100 && (
        <button
          onClick={onMarkAllComplete}
          className="btn btn-primary btn-sm w-full gap-2"
        >
          <Check className="w-4 h-4" />
          {t("study.markAllComplete")}
        </button>
      )}
    </div>
  );
}

export default MidweekMeetingSection;