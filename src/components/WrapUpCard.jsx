import ShareButton from './fun/ShareButton.jsx';
import { weekday } from '../domain/day.js';
import { useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Moon, PartyPopper } from 'lucide-react';
import { haptics } from '../utils/native.js';
import { safeSessionGetItem, safeSessionSetItem } from '../utils/safeStorage.js';

const CELEBRATED_KEY = 'fd-celebrated';

/**
 * The evening "day in review" (spec §2.10), rendered from `wrapUp()`'s result.
 * It never lists anything as undone: open routines appear only as "Still
 * time" before 22:00, and a day with nothing done gets only the closing line.
 */
export default function WrapUpCard({
  day,
  result,
  labelOf,
  tone,
  expanded,
  onToggle,
  onStillTime,
  onDone,
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const celebrate = result.state === 'allDone' && tone !== 'quiet';

  // The haptic fires at most once per app day, however often the card mounts.
  useEffect(() => {
    if (!celebrate || safeSessionGetItem(CELEBRATED_KEY) === day) return;
    safeSessionSetItem(CELEBRATED_KEY, day);
    haptics.success();
  }, [celebrate, day]);

  const movedOf = (id) => result.moved.find((m) => m.id === id)?.text;

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-2xl border-t-4 border-[var(--fd-accent)] bg-base-100 p-4 shadow-sm"
    >
      <h2 id={titleId} className="flex items-center gap-2 text-lg font-semibold">
        <Moon aria-hidden="true" className="h-5 w-5 text-[var(--fd-accent-text)]" />
        {t('fd.today.wrapUpTitle')}
      </h2>
      <div data-testid="wrapup-body" className="mt-3 space-y-3">
        {result.state !== 'none' && (
          <>
            {celebrate && (
              <p className="flex items-center gap-2 font-medium motion-safe:animate-fd-celebrate">
                <PartyPopper aria-hidden="true" className="h-5 w-5 text-[var(--fd-accent-text)]" />
                {t('fd.today.allDone')}
              </p>
            )}
            <ul className="space-y-1">
              {result.done.map((id) => (
                <li key={id} className="flex items-start gap-2">
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--fd-accent-text)]"
                    strokeWidth={3}
                  />
                  <span>
                    <span>{labelOf(id)}</span>
                    {movedOf(id) && (
                      <span className="block text-sm text-base-content/70">{movedOf(id)}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {result.stillOpen.length > 0 && (
              <ul className="space-y-1">
                {result.stillOpen.map((id) => (
                  <li key={id} className="flex items-center justify-between gap-2">
                    <span className="text-base-content/70">{labelOf(id)}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm min-h-11 text-[var(--fd-accent-text)]"
                      aria-label={`${t('fd.today.stillTime')}: ${labelOf(id)}`}
                      onClick={onStillTime}
                    >
                      {t('fd.today.stillTime')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {result.graceUsedToday && (
              <p className="text-sm text-base-content/70">{t('fd.today.graceKept')}</p>
            )}
          </>
        )}
        {result.closingLine && <p>{result.closingLine}</p>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <ToggleRoutines expanded={expanded} onToggle={onToggle} />
        {weekday(day) === 0 && (
          <ShareButton kind="weekly" data={({ store, today }) => ({ store, today })} />
        )}
        <button
          type="button"
          className="btn btn-sm min-h-11 border-none bg-[var(--fd-accent)] text-white"
          onClick={onDone}
        >
          {t('fd.today.doneForToday')}
        </button>
      </div>
    </section>
  );
}

function ToggleRoutines({ expanded, onToggle }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm min-h-11"
      aria-expanded={expanded}
      onClick={onToggle}
    >
      {expanded ? t('fd.today.hideRoutines') : t('fd.today.showRoutines')}
    </button>
  );
}

/** The one-line card left after "Done for today", until the day rolls over. */
export function WrapUpSummary({ count, expanded, onToggle }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-base-100 px-4 py-2 shadow-sm">
      <p className="text-sm">{t('fd.today.summary', { count })}</p>
      <ToggleRoutines expanded={expanded} onToggle={onToggle} />
    </div>
  );
}
