import { Children } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
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
  return (
    <li data-testid={testId} className="rounded-2xl bg-base-100 p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <HoldToCheck done={done} onComplete={onComplete} onUndo={onUndo} label={label} />
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium">{label}</p>
          {detail && <p className="break-words text-sm text-base-content/70">{detail}</p>}
        </div>
        {link && (
          <button
            type="button"
            className="btn btn-circle btn-ghost min-h-11 min-w-11 text-[var(--fd-accent-text)]"
            aria-label={linkName ?? t('fd.today.openLink', { label })}
            onClick={() => openLink(link)}
          >
            <ExternalLink aria-hidden="true" className="h-5 w-5" />
          </button>
        )}
      </div>
      {Children.toArray(children).length > 0 && <div className="mt-2 pl-14">{children}</div>}
    </li>
  );
}
