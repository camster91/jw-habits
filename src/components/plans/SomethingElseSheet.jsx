import { useTranslation } from 'react-i18next';
import { planStyle } from '../../theme/planColours.js';
import Sheet from './Sheet.jsx';
import PlanIcon from './PlanIcon.jsx';

/**
 * "Did something else": the active project's undone steps, any of which can
 * be ticked instead of the next one, or "Just log a session" (no step).
 * `onPick(stepId | null)` returns false when the check-in was refused, which
 * keeps the sheet open with `error` shown.
 */
export default function SomethingElseSheet({ plan, onPick, onClose, error, fallbackFocus }) {
  const { t } = useTranslation();
  const open = plan.steps.filter((s) => s.doneOn === null);
  return (
    <Sheet
      title={t('fd.today.study.sheetTitle')}
      onClose={onClose}
      testId="something-else-sheet"
      fallbackFocus={fallbackFocus}
    >
      <div style={planStyle(plan.colour)} className="space-y-4">
        <p className="fd-plan-text flex items-center gap-2 font-medium">
          <PlanIcon icon={plan.icon} />
          <span className="min-w-0 break-words">{plan.title}</span>
        </p>
        <button
          type="button"
          className="btn btn-outline min-h-11 w-full normal-case"
          onClick={() => onPick(null)}
        >
          {t('fd.today.study.justSession')}
        </button>
        {open.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-base-content/70">
              {t('fd.today.study.otherSteps')}
            </h3>
            <ul className="space-y-2">
              {open.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="btn btn-ghost min-h-11 w-full justify-start break-words text-left normal-case"
                    onClick={() => onPick(s.id)}
                  >
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
