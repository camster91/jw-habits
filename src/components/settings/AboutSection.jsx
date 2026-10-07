import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { version } from '../../../package.json';

const PRIVACY_URL = 'https://jwhabits.ashbi.ca/privacy';
const SUPPORT_URL = 'https://jwhabits.ashbi.ca/support';

function LinkButton({ url, children }) {
  return (
    <button
      type="button"
      className="btn btn-ghost min-h-11 gap-2"
      onClick={() => window.open(url, '_blank', 'noopener')}
    >
      {children}
      <ExternalLink aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}

/** The disclaimer, privacy and support pages, and the app version. */
export default function AboutSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <p className="text-sm">{t('fd.settings.about.disclaimer')}</p>
      <p className="text-sm text-base-content/70">{t('fd.settings.about.version', { version })}</p>
      <div className="flex flex-wrap gap-2">
        <LinkButton url={PRIVACY_URL}>{t('fd.settings.about.privacy')}</LinkButton>
        <LinkButton url={SUPPORT_URL}>{t('fd.settings.about.support')}</LinkButton>
      </div>
    </div>
  );
}
