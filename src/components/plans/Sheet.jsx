import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { onBack } from '../../utils/backStack.js';

const FOCUSABLE = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

/**
 * A bottom sheet for the Plans screens: a modal dialog titled by `title`,
 * closed by its X, Escape, a tap outside or Android back. Focus moves in on
 * open, stays inside while open and goes back to the opener on close (the
 * same rules as SettingsSheet).
 */
export default function Sheet({ title, onClose, children, testId }) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    const guard = (e) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) closeRef.current?.focus();
    };
    closeRef.current?.focus();
    document.addEventListener('focusin', guard);
    return () => {
      document.removeEventListener('focusin', guard);
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  useEffect(() => onBack(onClose), [onClose]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-base-100 p-4 pb-[max(env(safe-area-inset-bottom),1rem)]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="mx-auto max-w-md space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id={titleId} className="min-w-0 break-words text-xl font-semibold">
              {title}
            </h2>
            <button
              ref={closeRef}
              type="button"
              className="btn btn-circle btn-ghost min-h-11 min-w-11 shrink-0"
              aria-label={t('fd.plans.close')}
              onClick={onClose}
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
