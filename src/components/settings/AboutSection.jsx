import { useState } from 'react';
import { clearDiagnostics, pruneDiagnostics } from '../../utils/diagnostics.js';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { version } from '../../../package.json';
import { openLink } from '../../native/openLink.js';

const PRIVACY_URL = 'https://jwhabits.ashbi.ca/privacy/';
const SUPPORT_URL = 'https://jwhabits.ashbi.ca/support/';

function LinkButton({ url, children }) {
  return (
    <button type="button" className="btn btn-ghost min-h-11 gap-2" onClick={() => openLink(url)}>
      {children}
      <ExternalLink aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}

/** The disclaimer, privacy and support pages, and the app version. */
export default function AboutSection() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState(null);
  const [status, setStatus] = useState('');
  const clear = () => {
    const ok = clearDiagnostics();
    if (ok) setEntries([]);
    setStatus(
      t(ok ? 'fd.settings.about.clearedDiagnostics' : 'fd.settings.about.diagnosticFailure')
    );
  };
  return (
    <div className="space-y-3">
      <p className="text-sm">{t('fd.settings.about.disclaimer')}</p>
      <p className="text-sm text-base-content/70">{t('fd.settings.about.version', { version })}</p>
      <p className="text-sm">{t('fd.settings.about.diagnostics')}</p>
      <button type="button" className="btn btn-ghost min-h-11" onClick={clear}>
        {t('fd.settings.about.clearDiagnostics')}
      </button>
      <button
        type="button"
        className="btn btn-ghost min-h-11"
        onClick={() => setEntries(pruneDiagnostics())}
      >
        {t('fd.settings.about.inspectDiagnostics')}
      </button>
      <p role="status">{status}</p>
      {entries !== null && (
        <div aria-label={t('fd.settings.about.inspectDiagnostics')}>
          {entries.length === 0 ? (
            <p>{t('fd.settings.about.noDiagnostics')}</p>
          ) : (
            <ul>
              {entries.map((entry, index) => (
                <li key={index}>
                  <time dateTime={entry.timestamp}>{entry.timestamp}</time> · {entry.type}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <LinkButton url={PRIVACY_URL}>{t('fd.settings.about.privacy')}</LinkButton>
        <LinkButton url={SUPPORT_URL}>{t('fd.settings.about.support')}</LinkButton>
      </div>
    </div>
  );
}
