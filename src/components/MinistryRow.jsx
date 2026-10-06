import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import Stepper from './Stepper.jsx';

const EMPTY = { shared: false, studies: 0 };

/**
 * The month's ministry: a "shared this month" toggle and a Bible-study count,
 * plus hours against the monthly goal in pioneer mode. `value` is the month's
 * entry value (or null); each change hands only the changed fields to
 * `onChange` (a patch; `hours: undefined` clears hours), so the caller can
 * merge it into the latest store. With `collapsed` (shared on an earlier day
 * this month) it opens as a one-line summary with an Edit control.
 */
export default function MinistryRow({ label, value, pioneer, hoursGoal, onChange, collapsed }) {
  const { t } = useTranslation();
  const hoursId = useId();
  const [open, setOpen] = useState(!collapsed);
  const current = value ?? EMPTY;
  const [hoursText, setHoursText] = useState(
    current.hours === undefined ? '' : String(current.hours)
  );

  const onHours = (text) => {
    setHoursText(text);
    if (text.trim() === '') {
      onChange({ hours: undefined });
      return;
    }
    const hours = Number(text);
    if (Number.isFinite(hours) && hours >= 0) onChange({ hours });
  };

  if (!open) {
    return (
      <li className="flex items-center justify-between gap-3 rounded-2xl bg-base-100 p-3 shadow-sm">
        <div className="min-w-0">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-base-content/70">
            {t('fd.today.ministrySummary', { count: current.studies })}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm min-h-11"
          aria-expanded="false"
          onClick={() => setOpen(true)}
        >
          {t('fd.today.ministryEdit')}
          <ChevronDown aria-hidden="true" className="h-4 w-4" />
        </button>
      </li>
    );
  }

  return (
    <li className="rounded-2xl bg-base-100 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{label}</p>
        {collapsed && (
          <button
            type="button"
            className="btn btn-ghost btn-sm min-h-11"
            aria-expanded="true"
            onClick={() => setOpen(false)}
          >
            {t('fd.today.ministryEdit')}
            <ChevronDown aria-hidden="true" className="h-4 w-4 rotate-180" />
          </button>
        )}
      </div>
      <label className="mt-2 flex min-h-11 cursor-pointer items-center justify-between gap-3">
        <span className="text-sm">{t('fd.today.ministryShared')}</span>
        <input
          type="checkbox"
          className="toggle border-[var(--fd-accent)] checked:bg-[var(--fd-accent)] checked:text-white"
          checked={current.shared}
          onChange={(e) => onChange({ shared: e.target.checked })}
        />
      </label>
      <Stepper
        label={t('fd.today.ministryStudies')}
        value={current.studies}
        max={99}
        onChange={(studies) => onChange({ studies })}
      />
      {pioneer && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <label htmlFor={hoursId} className="text-sm text-base-content/70">
            {t('fd.today.ministryHours')}
          </label>
          <span className="flex items-center gap-2">
            <input
              id={hoursId}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              className="input input-sm min-h-11 w-20 text-right"
              value={hoursText}
              onChange={(e) => onHours(e.target.value)}
            />
            <span className="text-sm text-base-content/70">
              {t('fd.today.hoursGoal', { hours: current.hours ?? 0, goal: hoursGoal })}
            </span>
          </span>
        </div>
      )}
    </li>
  );
}
