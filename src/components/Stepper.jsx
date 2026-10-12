import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus } from 'lucide-react';

const STEP_BUTTON =
  'btn btn-circle btn-ghost min-h-[44px] min-w-[44px] h-[44px] w-[44px] text-[var(--fd-accent-text)] disabled:opacity-30';

/** A labelled − value + control for a small whole number in `min..max`. */
export default function Stepper({ label, value, min = 0, max = Infinity, onChange }) {
  const { t } = useTranslation();
  const labelId = useId();
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="flex flex-wrap items-center justify-between gap-2"
    >
      <span id={labelId} className="min-w-0 max-w-full break-words text-sm text-base-content/70">
        {label}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          className={STEP_BUTTON}
          aria-label={t('fd.today.fewer')}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus aria-hidden="true" className="h-[16px] w-[16px]" />
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
          <Plus aria-hidden="true" className="h-[16px] w-[16px]" />
        </button>
      </span>
    </div>
  );
}
