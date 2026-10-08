import { useTranslation } from 'react-i18next';

/** Step 1: what the app is, that it stays on the phone, and the disclaimer. */
export default function StepWelcome() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <p>{t('fd.onboarding.welcome.body')}</p>
      <p>{t('fd.onboarding.welcome.storage')}</p>
      <p className="text-sm text-base-content/70">{t('fd.settings.about.disclaimer')}</p>
    </div>
  );
}
