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

const CONTEXT = {
  routines: [
    'Keep what helps you',
    'Choose the routines you want to see. There is no need to track everything.',
    'welcome',
    'teal',
  ],
  week: [
    'Make room in your week',
    'A usual meeting day helps Today show preparation at the right time.',
    'plans',
    'ocean',
  ],
  reading: [
    'Start where you are',
    'Pick a pace and a starting place. Your reading belongs to you.',
    'welcome',
    'amber',
  ],
  rhythm: [
    'Gentle cues, your timing',
    'Choose familiar moments, optional reminders and the encouragement you prefer.',
    'notes',
    'rose',
  ],
  look: [
    'A little home that feels like you',
    'Try a colour and theme, then review your choices before starting.',
    'notes',
    'lavender',
  ],
};

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
        <div className="flex gap-1" aria-hidden="true">
          {STEPS.map((step, i) => (
            <span
              key={step.key}
              className={`h-1.5 flex-1 rounded-full ${i <= index ? 'bg-[var(--fd-accent)]' : 'bg-base-content/15'}`}
            />
          ))}
        </div>
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold focus:outline-none">
          {t(`fd.onboarding.${key}.title`)}
        </h1>
        {CONTEXT[key] && (
          <header
            className="fd-screen-intro flex items-center gap-3 rounded-3xl p-4"
            data-tone={CONTEXT[key][3]}
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{CONTEXT[key][0]}</p>
              <p className="mt-2 text-sm text-base-content/80">{CONTEXT[key][1]}</p>
            </div>
            <img
              src={`/illustrations/${CONTEXT[key][2]}.webp`}
              width="72"
              height="72"
              alt=""
              className="h-18 w-18 shrink-0 object-contain"
            />
          </header>
        )}
        <Body store={draft} change={setDraft} today={today} askPermission preview review={last} />
        {index > 0 && (
          <p className="text-sm text-base-content/70">
            {last
              ? 'Starting saves your choices. You can revisit them in Settings.'
              : 'These are draft choices. Back keeps them; Skip keeps the settings this step started with.'}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {index === 0 && (
            <button
              type="button"
              className="btn btn-outline min-h-11"
              onClick={() => update((s) => ({ ...s, onboardingDone: true }))}
            >
              {t('fd.onboarding.welcome.defaults')}
            </button>
          )}
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
