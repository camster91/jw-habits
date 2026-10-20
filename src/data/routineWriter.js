import { durableGet, durableSet } from '../utils/safeStorage.js';
import { isNative } from '../utils/native.js';

/**
 * Serialized compare-before-write for the routine store (#317).
 *
 * Every save re-reads the stored bytes and writes only when they still match
 * what this window last read or wrote. A mismatch means another window saved
 * first: saving pauses (`onConflict`) instead of overwriting that history.
 * Rapid saves coalesce, so the newest snapshot is what reaches storage.
 *
 * Web Locks make the read and write one step across tabs where supported.
 * Without them (older browsers) a narrow race between the read and the write
 * remains; the provider's `storage` listener catches most such writes.
 */
export function createRoutineWriter({
  key,
  initialRaw,
  read = durableGet,
  write = durableSet,
  lock = (fn) => (!isNative && navigator.locks ? navigator.locks.request(key, fn) : fn()),
  onConflict = () => {},
}) {
  let raw = initialRaw;
  let latest = null;
  let pending = null;
  let busy = false;
  let blocked = false;
  let queue = Promise.resolve();

  const paused = () => new Error('Saving is paused because another window changed your data.');

  function block() {
    if (blocked) return;
    blocked = true;
    onConflict();
  }

  function run(task) {
    const result = queue.then(() =>
      lock(async () => {
        busy = true;
        try {
          return await task();
        } finally {
          busy = false;
        }
      })
    );
    queue = result.catch(() => {});
    return result;
  }

  return {
    get blocked() {
      return blocked;
    },
    block,

    /** Queue a snapshot. Resolves once the newest queued snapshot is stored. */
    save(nextRaw) {
      if (blocked) return Promise.reject(paused());
      const scheduled = latest !== null;
      latest = nextRaw;
      if (scheduled) return pending;
      pending = run(async () => {
        const value = latest;
        latest = null;
        if (blocked) throw paused();
        if ((await read(key)) !== raw) {
          block();
          throw paused();
        }
        await write(key, value);
        raw = value;
      });
      return pending;
    },

    /**
     * An explicit replacement (backup import). It does not compare, since the
     * user chose to replace everything, but it waits for queued saves and
     * drops unwritten older snapshots. `beforeWrite` runs inside the lock.
     */
    replace(nextRaw, beforeWrite = async () => {}) {
      if (blocked) return Promise.reject(paused());
      latest = null;
      return run(async () => {
        if (blocked) throw paused();
        await beforeWrite();
        await write(key, nextRaw);
        raw = nextRaw;
      });
    },

    /**
     * Another window stored `newValue`. True when this window had nothing
     * unsaved and was in step with `oldValue`, so the change can be adopted.
     */
    canAdopt(oldValue) {
      return !blocked && !busy && latest === null && oldValue === raw;
    },

    adopt(newValue) {
      raw = newValue;
    },
  };
}
