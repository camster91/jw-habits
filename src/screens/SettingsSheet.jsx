import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

// Stub: the Settings sheet is filled in by Task 13.
export default function SettingsSheet({ open, onClose }) {
  const { t } = useTranslation();
  const titleId = useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="settings-sheet"
        className="w-full rounded-t-3xl bg-base-100 p-4 pb-[max(env(safe-area-inset-bottom),1rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-xl font-semibold">
            {t('fd.settings.title')}
          </h2>
          <button
            type="button"
            className="btn btn-circle btn-ghost min-h-11 min-w-11"
            aria-label={t('fd.settings.close')}
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
