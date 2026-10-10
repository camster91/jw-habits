import { durableGet, durableSet } from '../utils/safeStorage.js';
import { DATA_KEYS, RECOVERY_KEY, RESTORE_JOURNAL_KEY } from './restoreKeys.js';
import { importOrganiserBundle } from '../domain/organiserBackup.js';

/** Caller holds workspace/organiser writer locks. Journal protects all durable data writes. */
export async function restoreBundle(
  { backup, store, workspace, organiser },
  { read = durableGet, write = durableSet } = {}
) {
  const before = JSON.parse(backup);
  const target = { routines: store, workspace, organiser };
  const journal = {
    version: 1,
    status: 'pending',
    before: { routines: before.routines, workspace: before.workspace, organiser: before.organiser },
    target,
  };
  await write(RECOVERY_KEY, backup);
  await write(RESTORE_JOURNAL_KEY, JSON.stringify(journal));
  try {
    for (const [i, key] of DATA_KEYS.entries())
      await write(key, JSON.stringify(target[['routines', 'workspace', 'organiser'][i]]), {
        restore: true,
      });
    // A readback, not just an optimistic UI update, establishes success.
    for (const [i, key] of DATA_KEYS.entries())
      if ((await read(key)) !== JSON.stringify(target[['routines', 'workspace', 'organiser'][i]]))
        throw new Error('Restore verification failed');
    await write(RESTORE_JOURNAL_KEY, JSON.stringify({ version: 1, status: 'complete' }));
  } catch (error) {
    throw new Error(
      `${error.message} A recovery backup is retained. Reload to recover before editing.`
    );
  }
}
export async function recoverRestore(today, { read = durableGet, write = durableSet } = {}) {
  const raw = await read(RESTORE_JOURNAL_KEY);
  const journal = JSON.parse(raw);
  const validation = importOrganiserBundle(
    JSON.stringify({ format: 'faithful-days-organiser-backup', version: 1, ...journal.before }),
    today
  );
  if (journal.version !== 1 || journal.status !== 'pending' || !validation.ok)
    throw new Error('Recovery data cannot be read. Export the original recovery file.');
  for (const [i, key] of DATA_KEYS.entries())
    await write(key, JSON.stringify(journal.before[['routines', 'workspace', 'organiser'][i]]), {
      restore: true,
    });
  for (const [i, key] of DATA_KEYS.entries())
    if (
      (await read(key)) !==
      JSON.stringify(journal.before[['routines', 'workspace', 'organiser'][i]])
    )
      throw new Error('Recovery verification failed');
  await write(RESTORE_JOURNAL_KEY, JSON.stringify({ version: 1, status: 'complete' }));
}
