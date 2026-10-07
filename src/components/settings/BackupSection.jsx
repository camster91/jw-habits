import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../data/useStore.js';
import { exportJson, importJson } from '../../domain/store.js';
import { isShareCancel, saveBackup } from '../../utils/backup.js';

/**
 * Export everything as a dated JSON file, or import one. An import is only
 * adopted after an in-app "Replace all data?" confirmation; a file that can't
 * be used says why and leaves the store alone. `onReplaced` runs after an
 * import is adopted (Settings closes then).
 */
export default function BackupSection({ onReplaced = () => {} }) {
  const { t } = useTranslation();
  const { store, update, today } = useStore();
  const [status, setStatus] = useState(null); // {error: boolean, text: string}
  const [pending, setPending] = useState(null);
  const confirmId = useId();
  const confirmRef = useRef(null);
  const exportRef = useRef(null);

  useEffect(() => {
    if (pending) confirmRef.current?.focus();
  }, [pending]);

  const exportNow = async () => {
    setStatus(null);
    try {
      await saveBackup(
        exportJson(store),
        `faithful-days-backup-${today}.json`,
        t('fd.settings.backup.shareTitle')
      );
      setStatus({ error: false, text: t('fd.settings.backup.exported') });
    } catch (error) {
      if (isShareCancel(error)) return;
      console.warn('Export did not complete:', error);
      setStatus({ error: true, text: t('fd.settings.backup.exportError') });
    }
  };

  const onFile = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setPending(null);
    setStatus(null);
    let text;
    try {
      text = await file.text();
    } catch {
      setStatus({ error: true, text: t('fd.settings.backup.readError') });
      return;
    }
    const result = importJson(text, today);
    if (result.ok) setPending(result.store);
    else setStatus({ error: true, text: t(`fd.settings.backup.errors.${result.reason}`) });
  };

  const replace = () => {
    const next = pending;
    update(() => next);
    setPending(null);
    onReplaced();
  };

  const cancel = () => {
    setPending(null);
    exportRef.current?.focus();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-base-content/70">{t('fd.settings.backup.body')}</p>
      <div className="flex flex-wrap gap-2">
        <button ref={exportRef} type="button" className="btn min-h-11" onClick={exportNow}>
          {t('fd.settings.backup.export')}
        </button>
        <label className="btn min-h-11 focus-within:outline focus-within:outline-2">
          {t('fd.settings.backup.import')}
          <input
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={onFile}
          />
        </label>
      </div>
      {pending && (
        <div
          role="group"
          aria-labelledby={confirmId}
          className="space-y-2 rounded-2xl border border-base-300 p-3"
        >
          <p id={confirmId} ref={confirmRef} tabIndex={-1} className="font-semibold">
            {t('fd.settings.backup.confirmTitle')}
          </p>
          <p className="text-sm">{t('fd.settings.backup.confirmBody')}</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-error min-h-11" onClick={replace}>
              {t('fd.settings.backup.replace')}
            </button>
            <button type="button" className="btn btn-ghost min-h-11" onClick={cancel}>
              {t('fd.settings.backup.cancel')}
            </button>
          </div>
        </div>
      )}
      <p role="status" className="text-sm">
        {status && !status.error && status.text}
      </p>
      <p role="alert" className="text-sm text-error">
        {status?.error && status.text}
      </p>
    </div>
  );
}
