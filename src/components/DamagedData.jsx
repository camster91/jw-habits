import { useEffect, useRef, useState } from 'react';
import { appDay } from '../domain/day.js';
import { defaultStore } from '../domain/store.js';
import RecoveryShell from './RecoveryShell.jsx';
import { useRawExport } from './useRawExport.js';

const FIELD_NAMES = {
  schedule: 'routine schedule',
  log: 'check-ins',
  reading: 'Bible reading plan',
  anchors: 'routine times',
  labels: 'routine names',
  links: 'your links',
  reminders: 'reminders',
  quietHours: 'quiet hours',
  plans: 'study and family plans',
  activePlan: 'current study plan',
  familyAgendas: 'family worship agendas',
  badges: 'badges',
  whatsNew: "What's New settings",
  events: 'important dates',
  backup: 'last backup date',
};

/** Plain-language list of what a repair resets; appearance and toggles are grouped. */
function describeReset(repair) {
  const named = repair.reset
    .filter((k) => FIELD_NAMES[k] && k !== 'log')
    .map((k) => FIELD_NAMES[k]);
  const other = repair.reset.some((k) => !FIELD_NAMES[k]);
  const parts = [];
  if (repair.droppedCheckIns > 0)
    parts.push(
      `${repair.droppedCheckIns} check-in${repair.droppedCheckIns === 1 ? '' : 's'} that could not be read`
    );
  else if (repair.reset.includes('log')) parts.push('check-ins');
  parts.push(...named);
  if (other) parts.push('some saved settings');
  return parts;
}

/**
 * Recovery for saved routine data that failed validation (#315). Nothing is
 * written until the user chooses. Repair and Start fresh keep the original
 * bytes on the device first; if that copy cannot be stored, nothing changes.
 */
export default function DamagedData({ raw, repair, onRestore }) {
  const { busy, setBusy, status, setStatus, exportRaw } = useRawExport(
    raw,
    'faithful-days-unreadable-data'
  );
  const [confirmFresh, setConfirmFresh] = useState(false);
  const headingRef = useRef(null);
  const confirmRef = useRef(null);
  const freshRef = useRef(null);
  const wasConfirming = useRef(false);

  useEffect(() => headingRef.current?.focus(), []);
  useEffect(() => {
    if (confirmFresh) confirmRef.current?.focus();
    else if (wasConfirming.current) freshRef.current?.focus();
    wasConfirming.current = confirmFresh;
  }, [confirmFresh]);

  const replaceWith = async (next) => {
    setBusy(true);
    setStatus('');
    try {
      await onRestore(next);
    } catch {
      setStatus(
        'Restore could not be confirmed. Save the original copy and reload before trying again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const startFresh = () => {
    return replaceWith(defaultStore(appDay(new Date()), 'en'));
  };

  const resets = repair ? describeReset(repair) : [];
  return (
    <RecoveryShell>
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold">
        Some saved data could not be read
      </h1>
      <p>
        Part of your routine history on this device is damaged. Nothing has been changed or deleted.
        Notes and preparation are stored separately and are not affected.
      </p>
      <p>Save a copy first. Backup files are unencrypted and may contain private links.</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn h-auto min-h-11 max-w-full whitespace-normal"
          disabled={busy}
          onClick={exportRaw}
        >
          Save a copy of your data
        </button>
      </div>
      {repair && (
        <section aria-labelledby="repair-heading" className="space-y-2">
          <h2 id="repair-heading" className="text-lg font-semibold">
            Repair and keep what can be read
          </h2>
          <p>
            Keeps {repair.store.log.length} check-in{repair.store.log.length === 1 ? '' : 's'} and
            everything else that is readable. Not kept: {resets.join(', ')}.
          </p>
          <button
            type="button"
            className="btn btn-primary h-auto min-h-11 max-w-full whitespace-normal"
            disabled={busy}
            onClick={() => replaceWith(repair.store)}
          >
            Repair and continue
          </button>
        </section>
      )}
      <section aria-labelledby="fresh-heading" className="space-y-2">
        <h2 id="fresh-heading" className="text-lg font-semibold">
          Start fresh
        </h2>
        <p>
          Sets up routines again. You can then import a backup from Settings. A copy of the damaged
          data stays on this device.
        </p>
        {confirmFresh ? (
          <div role="group" aria-labelledby="fresh-confirm" className="space-y-2">
            <p id="fresh-confirm" ref={confirmRef} tabIndex={-1} className="font-semibold">
              Replace your routine history on this device?
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-error h-auto min-h-11 max-w-full whitespace-normal"
                disabled={busy}
                onClick={startFresh}
              >
                Start fresh
              </button>
              <button
                type="button"
                className="btn btn-ghost h-auto min-h-11 max-w-full whitespace-normal"
                disabled={busy}
                onClick={() => setConfirmFresh(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            ref={freshRef}
            type="button"
            className="btn h-auto min-h-11 max-w-full whitespace-normal"
            disabled={busy}
            onClick={() => setConfirmFresh(true)}
          >
            Start fresh…
          </button>
        )}
      </section>
      <p role="status" aria-live="polite">
        {status}
      </p>
    </RecoveryShell>
  );
}
