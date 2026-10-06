import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus } from 'lucide-react';

const STEP_BUTTON =
  'btn btn-circle btn-ghost min-h-11 min-w-11 text-[var(--fd-accent)] disabled:opacity-30';

/** A labelled − value + control for a small whole number in `min..max`. */
export default function Stepper({ label, value, min = 0, max = Infinity, onChange }) {
  const { t } = useTranslation();
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className="flex items-center justify-between gap-2">
      <span id={labelId} className="text-sm text-base-content/70">
        {label}
      </span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          className={STEP_BUTTON}
          aria-label={t('fd.today.fewer')}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus aria-hidden="true" className="h-4 w-4" />
        </button>
        <span aria-live="polite" className="w-6 text-center font-semibold tabular-nums">
          {value}
        </span>
        <button
          type="button"
          className={STEP_BUTTON}
          aria-label={t('fd.today.more')}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
        </button>
      </span>
    </div>
  );
}
