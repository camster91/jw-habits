import { useEffect, useState } from 'react';
import { durableGet } from '../utils/safeStorage.js';
import { RECOVERY_KEY, RESTORE_JOURNAL_KEY } from '../data/restoreKeys.js';
import { recoverRestore } from '../data/restoreCoordinator.js';
import { civilDate } from '../domain/organiser.js';
import { saveBackup } from '../utils/backup.js';

/** Mount before StoreProvider: interrupted restores cannot trigger cleanup or native callbacks. */
export default function RestoreGate({ children }) {
  const [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [pending, setPending] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    durableGet(RESTORE_JOURNAL_KEY)
      .then((raw) => {
        if (!active) return;
        const journal = raw ? JSON.parse(raw) : null;
        if (!raw || (journal?.version === 1 && journal?.status === 'complete')) setReady(true);
        else setPending(true);
      })
      .catch((e) => {
        if (active) {
          setPending(true);
          setError(e.message);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const recover = async () => {
    setBusy(true);
    try {
      await recoverRestore(civilDate());
      window.location.reload();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  const exportOriginal = async () => {
    try {
      const raw = await durableGet(RECOVERY_KEY);
      if (!raw) throw new Error('No recovery backup could be read.');
      await saveBackup(raw, 'faithful-days-recovery.json', 'Recovery backup');
    } catch (e) {
      setError(e.message);
    }
  };
  if (ready) return children;
  if (!pending)
    return (
      <p role="status" className="p-4">
        Checking device storage…
      </p>
    );
  return (
    <main className="min-h-screen bg-base-200 p-6">
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Finish recovering your data</h1>
        <p>A restore did not finish. Editing is paused so your records stay safe.</p>
        <p>Restore the saved pre-import copy, or export it for safekeeping.</p>
        <p role="alert" className="text-error">
          {error}
        </p>
        <button disabled={busy} className="btn btn-primary min-h-11" onClick={recover}>
          Recover pre-import data
        </button>
        <button disabled={busy} className="btn min-h-11" onClick={exportOriginal}>
          Export recovery backup
        </button>
      </div>
    </main>
  );
}
