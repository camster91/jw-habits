import { useState } from 'react';
import { appDay } from '../domain/day.js';
import { isShareCancel, saveBackup } from '../utils/backup.js';
import { isWeb } from '../utils/native.js';
import { PWAProvider } from './PWAProvider.jsx';
import UpdatePrompt from './UpdatePrompt.jsx';

/** A recovery surface for data this build is too old to understand. */
export default function UpdateRequired({ raw }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const exportRaw = async () => {
    setBusy(true);
    setStatus('');
    try {
      await saveBackup(
        raw,
        `faithful-days-saved-data-${appDay(new Date())}.json`,
        'Faithful Days saved data'
      );
      setStatus('Copy offered. Finish saving it in your browser or share sheet.');
    } catch (error) {
      setStatus(
        isShareCancel(error)
          ? 'Copy cancelled.'
          : 'Could not offer a copy. Try again or update the app to open your data.'
      );
    } finally {
      setBusy(false);
    }
  };

  const content = (
    <main
      className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-5 text-base-content"
      style={{
        paddingTop: 'max(2rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
      }}
    >
      <h1 className="text-2xl font-semibold">Update Faithful Days to open your data</h1>
      <p>Your saved data comes from a newer version of Faithful Days.</p>
      <p>
        Install the newer app version, then reload. You can save a copy of your stored data below.
      </p>
      <p className="text-sm">
        Backup files are unencrypted and may contain private notes and links.
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn min-h-11" disabled={busy} onClick={exportRaw}>
          {busy ? 'Offering copy…' : 'Save a copy of your data'}
        </button>
        <button type="button" className="btn min-h-11" onClick={() => window.location.reload()}>
          Reload after updating
        </button>
      </div>
      <p role="status" aria-live="polite">
        {status}
      </p>
    </main>
  );

  // The normal App never mounts in this state, so keep its web update action reachable.
  return isWeb ? (
    <PWAProvider>
      <UpdatePrompt />
      {content}
    </PWAProvider>
  ) : (
    content
  );
}
