import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PartyPopper } from 'lucide-react';
import { planStyle } from '../../theme/planColours.js';
import PlanIcon from './PlanIcon.jsx';

/**
 * Shown on Today when a check-in finishes a plan: the wrap-up's light
 * celebration (one soft rise, none with the quiet tone) and "Project
 * finished". For a study project with waiting projects it offers the next
 * one; `onStart(planId)` returns false when that was refused. `started`
 * names the project that was then made active, and focus moves to that line
 * (the button that had it is gone). Today mounts it inside a live region.
 */
export default function PlanFinishedCard({ plan, tone, waiting, started, onStart, onClose }) {
  const { t } = useTranslation();
  const pickId = useId();
  const [pick, setPick] = useState(waiting[0]?.id ?? '');
  const [error, setError] = useState(null);
  const startedRef = useRef(null);
  useEffect(() => {
    if (started) startedRef.current?.focus();
  }, [started]);
  const celebrate = tone !== 'quiet';
  const choice = waiting.some((p) => p.id === pick) ? pick : (waiting[0]?.id ?? '');

  const start = () => {
    if (!choice) return;
    if (onStart(choice) === false) setError(t('fd.today.finished.refused'));
  };

  return (
    <section
      style={planStyle(plan.colour)}
      className="space-y-3 rounded-2xl border-t-4 border-[var(--plan)] bg-base-100 p-4 shadow-sm"
    >
      <p
        className={`flex items-center gap-2 font-medium ${celebrate ? 'motion-safe:animate-fd-celebrate' : ''}`}
      >
        {celebrate ? (
          <PartyPopper aria-hidden="true" className="fd-plan-text h-5 w-5 shrink-0" />
        ) : (
          <PlanIcon icon={plan.icon} className="fd-plan-text h-5 w-5 shrink-0" />
        )}
        <span className="min-w-0 break-words">
          {t(plan.kind === 'study' ? 'fd.today.finished.study' : 'fd.today.finished.family', {
            title: plan.title,
          })}
        </span>
      </p>
      {started && (
        <p ref={startedRef} tabIndex={-1} className="focus:outline-none">
          {t('fd.today.finished.started', { title: started })}
        </p>
      )}
      {!started && plan.kind === 'study' && waiting.length > 0 && (
        <div className="space-y-2">
          <label htmlFor={pickId} className="block text-sm font-medium">
            {t('fd.today.finished.nextLabel')}
          </label>
          <select
            id={pickId}
            className="select select-bordered min-h-11 w-full"
            value={choice}
            onChange={(e) => setPick(e.target.value)}
          >
            {waiting.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary min-h-11" onClick={start}>
              {t('fd.today.finished.startNext')}
            </button>
            <button type="button" className="btn btn-ghost min-h-11" onClick={onClose}>
              {t('fd.today.finished.notNow')}
            </button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
