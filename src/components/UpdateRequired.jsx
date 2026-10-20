import RecoveryShell from './RecoveryShell.jsx';
import { useRawExport } from './useRawExport.js';

/** A recovery surface for data this build is too old to understand. */
export default function UpdateRequired({ raw }) {
  const { busy, status, exportRaw } = useRawExport(raw, 'faithful-days-saved-data');
  return (
    <RecoveryShell>
      <h1 className="text-2xl font-semibold">Update Faithful Days to open your data</h1>
      <p>Your saved data comes from a newer version of Faithful Days.</p>
      <p>
        Install the newer app version, then reload. You can save a copy of your stored data below.
      </p>
      <p className="text-sm">
        Backup files are unencrypted and may contain private notes and links.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn h-auto min-h-11 max-w-full whitespace-normal"
          disabled={busy}
          onClick={exportRaw}
        >
          {busy ? 'Offering copy…' : 'Save a copy of your data'}
        </button>
        <button
          type="button"
          className="btn h-auto min-h-11 max-w-full whitespace-normal"
          onClick={() => window.location.reload()}
        >
          Reload after updating
        </button>
      </div>
      <p role="status" aria-live="polite">
        {status}
      </p>
    </RecoveryShell>
  );
}
