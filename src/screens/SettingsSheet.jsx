import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useStore } from '../data/useStore.js';
import StepRoutines from './onboarding/StepRoutines.jsx';
import StepWeek from './onboarding/StepWeek.jsx';
import StepReading from './onboarding/StepReading.jsx';
import StepRhythm from './onboarding/StepRhythm.jsx';
import StepLook from './onboarding/StepLook.jsx';
import { TimeField, Toggle } from './onboarding/controls.jsx';
import LinksSection from '../components/settings/LinksSection.jsx';
import BackupSection from '../components/settings/BackupSection.jsx';
import AboutSection from '../components/settings/AboutSection.jsx';

const FOCUSABLE = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';
const DEFAULT_QUIET = { start: '22:00', end: '07:00' };

function Section({ title, children }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="space-y-3 border-t border-base-300 pt-4">
      <h3 id={id} className="text-lg font-semibold">
        {title}
      </h3>
      {children}
    </section>
  );
}

function QuietHours({ store, change }) {
  const { t } = useTranslation();
  const quiet = store.quietHours;
  return (
    <div className="space-y-1">
      <Toggle
        label={t('fd.settings.quietHours.toggle')}
        hint={t('fd.settings.quietHours.hint')}
        checked={quiet !== null}
        onChange={(on) => change((s) => ({ ...s, quietHours: on ? DEFAULT_QUIET : null }))}
      />
      {quiet && (
        <>
          <TimeField
            label={t('fd.settings.quietHours.start')}
            value={quiet.start}
            onChange={(start) => change((s) => ({ ...s, quietHours: { ...s.quietHours, start } }))}
          />
          <TimeField
            label={t('fd.settings.quietHours.end')}
            value={quiet.end}
            onChange={(end) => change((s) => ({ ...s, quietHours: { ...s.quietHours, end } }))}
          />
        </>
      )}
    </div>
  );
}

/** The open sheet: a modal dialog that holds focus until it closes. */
function SettingsDialog({ onClose }) {
  const { t } = useTranslation();
  const { store, update, today } = useStore();
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  // Bumped after an import so sections holding typed text start again from the new store.
  const [generation, setGeneration] = useState(0);

  // Focus moves in on open and back to whatever opened the sheet on close.
  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const props = { store, change: update, today };
  const section = (key) => t('fd.settings.sections.' + key);

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="settings-sheet"
        className="max-h-[90dvh] w-full space-y-4 overflow-y-auto rounded-t-3xl bg-base-100 p-4 pb-[max(env(safe-area-inset-bottom),1rem)]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-xl font-semibold">
            {t('fd.settings.title')}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="btn btn-circle btn-ghost min-h-11 min-w-11"
            aria-label={t('fd.settings.close')}
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <div className="mx-auto max-w-md space-y-4">
          <div key={generation} className="space-y-4">
            <Section title={section('routines')}>
              <StepRoutines {...props} />
            </Section>
            <Section title={section('week')}>
              <StepWeek {...props} />
            </Section>
            <Section title={section('reading')}>
              <StepReading {...props} />
            </Section>
            <Section title={section('rhythm')}>
              <StepRhythm {...props} />
            </Section>
            <Section title={section('quietHours')}>
              <QuietHours {...props} />
            </Section>
            <Section title={section('look')}>
              <StepLook {...props} />
            </Section>
            <Section title={section('links')}>
              <LinksSection />
            </Section>
            <Section title={section('whatsNew')}>
              <Toggle
                label={t('fd.settings.whatsNew.toggle')}
                hint={t('fd.settings.whatsNew.hint')}
                checked={store.whatsNew.enabled}
                onChange={(on) =>
                  update((s) => ({ ...s, whatsNew: { ...s.whatsNew, enabled: on } }))
                }
              />
            </Section>
          </div>
          <Section title={section('backup')}>
            <BackupSection onReplaced={() => setGeneration((g) => g + 1)} />
          </Section>
          <Section title={section('about')}>
            <AboutSection />
          </Section>
        </div>
      </div>
    </div>
  );
}

/**
 * Everything onboarding sets, plus links, backup, What's New, quiet hours and
 * About. Every change is saved straight away; schedule changes take effect
 * from today and leave earlier days as they were.
 */
export default function SettingsSheet({ open, onClose }) {
  return open ? <SettingsDialog onClose={onClose} /> : null;
}
