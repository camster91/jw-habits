import { useState } from 'react';
import { appDay } from '../domain/day.js';
import { isShareCancel, saveBackup } from '../utils/backup.js';

/** Offers the stored bytes exactly as saved; reports progress through `status`. */
export function useRawExport(raw, prefix) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const exportRaw = async () => {
    setBusy(true);
    setStatus('');
    try {
      await saveBackup(raw, `${prefix}-${appDay(new Date())}.json`, 'Faithful Days saved data');
      setStatus('Copy offered. Finish saving it in your browser or share sheet.');
    } catch (error) {
      setStatus(isShareCancel(error) ? 'Copy cancelled.' : 'Could not offer a copy. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return { busy, setBusy, status, setStatus, exportRaw };
}
