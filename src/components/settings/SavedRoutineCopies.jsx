import { useEffect, useState } from 'react';
import { durableGet, durableKeys } from '../../utils/safeStorage.js';
import { isShareCancel, saveBackup } from '../../utils/backup.js';

const PREFIX = 'jw-habits-v2-corrupt-';

/** Keep the original retained by Repair/Start fresh available after a reload. */
export default function SavedRoutineCopies() {
  const [keys, setKeys] = useState([]);
  const [selected, setSelected] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => durableKeys())
      .then((all) => {
        const copies = all
          .filter((key) => key.startsWith(PREFIX) && /^[0-9]+$/.test(key.slice(PREFIX.length)))
          .sort((a, b) => Number(b.slice(PREFIX.length)) - Number(a.slice(PREFIX.length)));
        if (active) {
          setKeys(copies);
          setSelected(copies[0] ?? '');
        }
      })
      .catch(() => {
        if (active) setStatus('Saved routine recovery copies could not be listed.');
      });
    return () => {
      active = false;
    };
  }, []);

  const exportCopy = async () => {
    setBusy(true);
    setStatus('');
    try {
      const raw = await durableGet(selected);
      if (raw == null) {
        setStatus('That recovery copy is no longer available.');
        return;
      }
      await saveBackup(
        raw,
        `faithful-days-original-routines-${selected.slice(PREFIX.length)}.json`,
        'Faithful Days original routines data'
      );
      setStatus('Copy offered. Finish saving it in your browser or share sheet.');
    } catch (error) {
      setStatus(
        isShareCancel(error)
          ? 'Copy cancelled.'
          : 'Could not offer that recovery copy. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  if (!keys.length) return status ? <p role="status">{status}</p> : null;
  return (
    <section
      aria-label="Saved routine recovery copies"
      className="space-y-2 rounded-2xl border border-base-300 p-3"
    >
      <p>
        Original routines kept before a repair or fresh start. These files are unencrypted and may
        be private.
      </p>
      <label className="flex flex-col gap-2">
        <span>Saved routine recovery copy</span>
        <select
          className="select w-full"
          value={selected}
          disabled={busy}
          onChange={(event) => setSelected(event.target.value)}
        >
          {keys.map((key) => (
            <option key={key} value={key}>
              {new Date(Number(key.slice(PREFIX.length))).toLocaleString('en-CA')}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="btn h-auto min-h-11 whitespace-normal"
        disabled={busy}
        onClick={exportCopy}
      >
        Save original routines copy
      </button>
      <p role="status" aria-live="polite">
        {status}
      </p>
    </section>
  );
}
