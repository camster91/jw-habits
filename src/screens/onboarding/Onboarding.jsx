import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../data/useStore.js';
import { RESTORE, commitOnboarding } from './restore.js';
import StepWelcome from './StepWelcome.jsx';
import StepRoutines from './StepRoutines.jsx';
import StepWeek from './StepWeek.jsx';
import StepReading from './StepReading.jsx';
import StepRhythm from './StepRhythm.jsx';
import StepLook from './StepLook.jsx';

const STEPS = [
  { key: 'welcome', Body: StepWelcome },
  { key: 'routines', Body: StepRoutines },
  { key: 'week', Body: StepWeek },
  { key: 'reading', Body: StepReading },
  { key: 'rhythm', Body: StepRhythm },
  { key: 'look', Body: StepLook },
];

/**
 * Six steps that edit a draft of the store. Nothing is saved until the last
 * step: finishing commits the draft's onboarding fields once and sets
 * `onboardingDone`, after which App shows Today (and applies the theme and
 * resyncs reminders from the store change).
 */
export default function Onboarding() {
  const { t } = useTranslation();
  const { store, update, today } = useStore();
  const [initial] = useState(store);
  const [draft, setDraft] = useState(store);
  const [index, setIndex] = useState(0);
  const headingRef = useRef(null);
  const moved = useRef(false);

  // Move focus to the new step's heading, but not on first arrival.
  useEffect(() => {
    if (moved.current) headingRef.current?.focus();
    moved.current = true;
  }, [index]);

  const { key, Body } = STEPS[index];
  const last = index === STEPS.length - 1;

  const advance = (next) => {
    if (last) update((s) => commitOnboarding(s, next));
    else setIndex(index + 1);
  };
  const skip = () => {
    const next = RESTORE[key](draft, initial, today);
    setDraft(next);
    advance(next);
  };

  const primaryLabel =
    index === 0
      ? t('fd.onboarding.welcome.start')
      : last
        ? t('fd.onboarding.finish')
        : t('fd.onboarding.next');

  return (
    <main
      data-testid="onboarding"
      className="min-h-screen bg-base-200 px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),1rem)]"
    >
      <div className="mx-auto max-w-md space-y-4">
        <p aria-live="polite" className="text-sm text-base-content/70">
          {t('fd.onboarding.stepOf', { step: index + 1, total: STEPS.length })}
        </p>
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold focus:outline-none">
          {t(`fd.onboarding.${key}.title`)}
        </h1>
        <Body store={draft} change={setDraft} today={today} askPermission preview />
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {index > 0 && (
            <button
              type="button"
              className="btn btn-ghost min-h-11"
              onClick={() => setIndex(index - 1)}
            >
              {t('fd.onboarding.back')}
            </button>
          )}
          {index > 0 && (
            <button type="button" className="btn btn-ghost min-h-11" onClick={skip}>
              {t('fd.onboarding.skip')}
            </button>
          )}
          <button
            type="button"
            className="btn ml-auto min-h-11 border-transparent bg-[var(--fd-accent)] text-white"
            onClick={() => advance(draft)}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </main>
  );
}
