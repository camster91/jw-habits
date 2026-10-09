import { useTranslation } from 'react-i18next';

/** Step 1: what the app is, that it stays on the phone, and the disclaimer. */
export default function StepWelcome() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <img
        src="/illustrations/welcome.webp"
        alt=""
        width="200"
        height="160"
        className="mx-auto h-40 w-50 object-contain"
      />
      <div className="grid grid-cols-3 gap-2 text-center text-sm font-semibold">
        <span className="fd-welcome-tile rounded-2xl p-3">Your rhythm</span>
        <span className="fd-welcome-tile rounded-2xl p-3">Your ideas</span>
        <span className="fd-welcome-tile rounded-2xl p-3">Your pace</span>
      </div>
      <p>{t('fd.onboarding.welcome.body')}</p>
      <p>{t('fd.onboarding.welcome.storage')}</p>
      <p className="text-sm text-base-content/70">{t('fd.settings.about.disclaimer')}</p>
    </div>
  );
}
