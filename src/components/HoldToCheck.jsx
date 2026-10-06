import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { haptics } from '../utils/native.js';

const KEYS = [' ', 'Enter'];
// A click this soon after a pointerdown is that press's own click.
const PRESS_WINDOW_MS = 2000;

/**
 * A round check button that completes after being held for `holdMs` (pointer,
 * or Space/Enter held down), with a haptic tap and a soft fill. Letting go
 * early cancels. When done, a tap (or Space/Enter) undoes at once. A click
 * with no pointer press before it (screen reader, switch or voice control)
 * completes at once, so the check never depends on holding.
 */
export default function HoldToCheck({ done, onComplete, onUndo, label, holdMs = 600 }) {
  const { t } = useTranslation();
  const hintId = useId();
  const [holding, setHolding] = useState(false);
  const timer = useRef(null);
  // The last pointer press: when it began, and whether its hold completed.
  const press = useRef({ at: null, completed: false });

  const cancel = () => {
    clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };

  const complete = () => {
    haptics.success();
    onComplete();
  };

  const start = (fromPointer) => {
    clearTimeout(timer.current);
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      if (fromPointer) press.current.completed = true;
      complete();
    }, holdMs);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    press.current = { at: Date.now(), completed: false };
    if (!done) start(true);
  };

  const onClick = () => {
    const { at, completed } = press.current;
    press.current = { at: null, completed: false };
    const fromPress = at !== null && Date.now() - at < PRESS_WINDOW_MS;
    if (fromPress && completed) return; // the release of a hold that just completed
    if (done) onUndo();
    else if (!fromPress) complete();
  };

  const onKeyDown = (e) => {
    if (!KEYS.includes(e.key)) return;
    e.preventDefault();
    if (e.repeat) return;
    if (done) onUndo();
    else start(false);
  };

  const onKeyUp = (e) => {
    if (!KEYS.includes(e.key)) return;
    e.preventDefault();
    cancel();
  };

  const filled = done || holding;
  return (
    <>
      <button
        type="button"
        aria-pressed={done}
        aria-label={label}
        aria-describedby={hintId}
        onPointerDown={onPointerDown}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onContextMenu={(e) => e.preventDefault()}
        className="relative flex min-h-11 min-w-11 shrink-0 touch-manipulation select-none items-center justify-center rounded-full border-2 border-[var(--fd-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fd-accent)]"
      >
        <span
          aria-hidden="true"
          data-testid="hold-fill"
          className={`absolute inset-0 rounded-full bg-[var(--fd-accent)] transition-transform ease-out motion-reduce:transition-none ${
            filled ? 'scale-100' : 'scale-0'
          } ${done ? 'opacity-100' : 'opacity-60'}`}
          style={{ transitionDuration: holding ? `${holdMs}ms` : '150ms' }}
        />
        <Check
          aria-hidden="true"
          className={`relative h-5 w-5 ${done ? 'text-white' : 'text-[var(--fd-accent)] opacity-40'}`}
          strokeWidth={3}
        />
      </button>
      <span id={hintId} className="sr-only">
        {done ? t('fd.today.tapToUndo') : t('fd.today.holdToCheck')}
      </span>
    </>
  );
}
