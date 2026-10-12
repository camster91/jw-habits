import { Children } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Sun, BookOpen, CalendarDays, Users, NotebookPen } from 'lucide-react';

const ICONS = {
  dailyText: Sun,
  bibleReading: BookOpen,
  meetingPrep: CalendarDays,
  familyWorship: Users,
  personalStudy: NotebookPen,
};
import HoldToCheck from './HoldToCheck.jsx';
import { openLink } from '../native/openLink.js';

/**
 * One routine on Today: the hold-to-check, its label and detail line, an
 * optional link out, and optional extra controls (the Bible stepper, a
 * project's progress). `detail` may be a node; `linkName` names the link
 * button when it opens something more specific than the routine.
 */
export default function RoutineRow({
  label,
  routineId,
  detail,
  done,
  onComplete,
  onUndo,
  link,
  linkName,
  testId,
  children,
}) {
  const { t } = useTranslation();
  const Icon = ICONS[routineId];
  return (
    <li
      data-testid={testId}
      data-routine={routineId}
      data-done={done}
      className="fd-routine @container rounded-2xl bg-base-100 p-3 shadow-sm"
    >
      <div
        className={`grid grid-cols-[44px_minmax(0,1fr)] items-center gap-[12px] ${link ? '@[16rem]:grid-cols-[44px_minmax(0,1fr)_44px]' : ''}`}
      >
        <HoldToCheck
          tapToComplete
          done={done}
          onComplete={onComplete}
          onUndo={onUndo}
          label={label}
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-[8px] break-words font-semibold">
            {Icon && (
              <Icon
                aria-hidden="true"
                className="fd-routine-icon hidden h-[16px] w-[16px] shrink-0 @[16rem]:block"
              />
            )}
            <span className="min-w-0 flex-1 break-words">{label}</span>
          </p>
          {detail && <p className="break-words text-sm text-base-content/70">{detail}</p>}
        </div>
        {link && (
          <button
            type="button"
            className="col-start-2 justify-self-end btn btn-circle btn-ghost min-h-[44px] min-w-[44px] h-[44px] w-[44px] text-[var(--fd-accent-text)] @[16rem]:col-auto"
            aria-label={linkName ?? t('fd.today.openLink', { label })}
            onClick={() => openLink(link)}
          >
            <ExternalLink aria-hidden="true" className="h-[20px] w-[20px]" />
          </button>
        )}
      </div>
      {Children.toArray(children).length > 0 && (
        <div className="mt-2 @[16rem]:pl-14">{children}</div>
      )}
    </li>
  );
}
