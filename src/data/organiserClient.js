import { emptyOrganiser, validateOrganiser, ORGANISER_KEY } from '../domain/organiser.js';
import { durableGet, durableSet } from '../utils/safeStorage.js';
import { isNative } from '../utils/native.js';

/** One serialized writer per client; Web Locks coordinate supported web tabs. */
export function createOrganiserClient({
  read = durableGet,
  write = durableSet,
  lock = (fn) => (!isNative && navigator.locks ? navigator.locks.request(ORGANISER_KEY, fn) : fn()),
} = {}) {
  let raw,
    value,
    blocked = true;
  let queue = Promise.resolve();
  return {
    async load() {
      blocked = true;
      raw = await read(ORGANISER_KEY);
      try {
        value = raw === null ? emptyOrganiser() : validateOrganiser(JSON.parse(raw)).organiser;
      } catch {
        value = null;
      }
      if (!value)
        throw new Error(
          'Tasks and calendar data cannot be read by this app. Export it before changing anything.'
        );
      blocked = false;
      return value;
    },
    save(change, beforeWrite = async () => {}) {
      const run = queue.then(() =>
        lock(async () => {
          if (blocked) throw new Error('Saving is paused. Reload before trying again.');
          if ((await read(ORGANISER_KEY)) !== raw) {
            blocked = true;
            throw new Error(
              'Tasks or calendar changed in another window. Keep your draft, export it, then reload.'
            );
          }
          const result = validateOrganiser({ ...change(value), revision: value.revision + 1 });
          if (!result.ok) throw new Error('Invalid tasks or calendar data');
          const nextRaw = JSON.stringify(result.organiser);
          await beforeWrite(value);
          await write(ORGANISER_KEY, nextRaw);
          raw = nextRaw;
          value = result.organiser;
          return value;
        })
      );
      queue = run.catch(() => {});
      return run;
    },
    async rawExport() {
      return read(ORGANISER_KEY);
    },
  };
}
