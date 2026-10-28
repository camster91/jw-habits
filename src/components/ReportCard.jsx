import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, X } from 'lucide-react';
import { useStore } from '../data/useStore.js';
import { reportDue, reportLines, reportMonth, reportText } from '../domain/report.js';
import { safeGetItem, safeSetItem } from '../utils/safeStorage.js';

const DISMISS_KEY = 'fd-report-dismissed';

/**
 * Today's ministry report card for the first week of a month: last month's
 * totals with a Copy button, and a Hide button that hides it for that month.
 * The dismissed month is a UI convenience (localStorage), not app state.
 */
export default function ReportCard() {
  const { t } = useTranslation();
  const { store, today } = useStore();
  const [dismissed, setDismissed] = useState(() => safeGetItem(DISMISS_KEY));
  const [status, setStatus] = useState(null);
  if (!reportDue(store, today)) return null;
  const { key, name } = reportMonth(today);
  if (dismissed === key) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reportText(store, today, t));
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  };
  const hide = () => {
    safeSetItem(DISMISS_KEY, key);
    setDismissed(key);
  };

  return (
    <section
      data-testid="report-card"
      aria-label={t('fd.today.report.title', { month: name })}
      className="rounded-2xl bg-base-100 px-4 py-3 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <ClipboardList
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-[var(--fd-accent-text)]"
        />
        <div className="min-w-0 flex-1 select-text">
          <h2 className="font-medium">{t('fd.today.report.title', { month: name })}</h2>
          {reportLines(store, today, t).map((line) => (
            <p key={line} className="break-words text-sm text-base-content/70">
              {line}
            </p>
          ))}
        </div>
        <button
          type="button"
          aria-label={t('fd.today.report.hide')}
          className="btn btn-ghost btn-square min-h-11 min-w-11"
          onClick={hide}
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-outline min-h-11" onClick={copy}>
          {t('fd.today.report.copy')}
        </button>
        <span aria-live="polite" className="text-sm text-base-content/70">
          {status && t(`fd.today.report.${status === 'copied' ? 'copied' : 'copyFailed'}`)}
        </span>
      </div>
    </section>
  );
}
