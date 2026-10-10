import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Step 1: what the app is, that it stays on the phone, and the disclaimer. */
export default function StepWelcome() {
  const { t } = useTranslation();
  const [interest, setInterest] = useState('rhythm');
  const [lateNight, setLateNight] = useState(true);
  return (
    <div className="space-y-4">
      <img
        src="/illustrations/welcome.webp"
        alt=""
        width="200"
        height="112"
        className="mx-auto h-28 w-50 object-contain"
      />
      <p>{t('fd.onboarding.welcome.body')}</p>
      <p className="text-sm">Tap to explore what you can make your own.</p>
      <div
        role="group"
        aria-label="Explore Faithful Days"
        className="grid grid-cols-3 gap-2 text-center text-sm font-semibold"
      >
        {['rhythm', 'ideas', 'pace'].map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={interest === key}
            onClick={() => setInterest(key)}
            className="fd-welcome-tile min-h-11 rounded-2xl p-3 aria-pressed:ring-2 aria-pressed:ring-base-content"
          >
            {t(`fd.onboarding.welcome.explore.${key}.title`)}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="rounded-2xl bg-base-100 p-4 text-sm">
        {t(`fd.onboarding.welcome.explore.${interest}.body`)}
      </p>
      <p className="text-sm text-base-content/70">
        Get started lets you choose your routines and begin, or continue a guided setup. Start with
        defaults takes you straight to Today.
      </p>
      <details className="fd-guide rounded-2xl px-4 py-1">
        <summary className="min-h-11 cursor-pointer py-3 font-semibold">
          How does a day work?
        </summary>
        <p className="pb-3 text-sm">
          You choose when to use the app. Only the tracking date changes at 3 a.m. local time, so a
          late-night check-in can still count toward the previous day. This is not a wake-up time or
          a reminder.
        </p>
        <div role="group" aria-label="Try a check-in time" className="flex gap-2 pb-3">
          <button
            type="button"
            className="btn btn-outline min-h-11"
            aria-pressed={lateNight}
            onClick={() => setLateNight(true)}
          >
            1 a.m.
          </button>
          <button
            type="button"
            className="btn btn-outline min-h-11"
            aria-pressed={!lateNight}
            onClick={() => setLateNight(false)}
          >
            4 a.m.
          </button>
        </div>
        <p aria-live="polite" className="pb-3 text-sm">
          {lateNight
            ? 'At 1 a.m., your check-in belongs to the previous day.'
            : 'At 4 a.m., your check-in belongs to the new day.'}{' '}
          This example does not record a check-in.
        </p>
      </details>
      <p className="text-sm">{t('fd.onboarding.welcome.storage')}</p>
      <p className="text-sm text-base-content/70">{t('fd.settings.about.disclaimer')}</p>
    </div>
  );
}
