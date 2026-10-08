import { emptyWorkspace, validateWorkspace, WORKSPACE_KEY } from '../domain/workspace.js';
import { durableGet, durableSet } from '../utils/safeStorage.js';
import { isNative } from '../utils/native.js';

/** One serialized writer per client; Web Locks coordinate supported web tabs. */
export function createWorkspaceClient({
  read = durableGet,
  write = durableSet,
  lock = (fn) => (!isNative && navigator.locks ? navigator.locks.request(WORKSPACE_KEY, fn) : fn()),
} = {}) {
  let raw,
    value,
    blocked = true;
  let queue = Promise.resolve();
  return {
    async load() {
      raw = await read(WORKSPACE_KEY);
      value = raw === null ? emptyWorkspace() : validateWorkspace(JSON.parse(raw)).workspace;
      if (!value)
        throw new Error(
          'Notes and preparation data cannot be read by this app. Export it before changing anything.'
        );
      blocked = false;
      return value;
    },
    save(change, beforeWrite = async () => {}) {
      const run = queue.then(() =>
        lock(async () => {
          if (blocked) throw new Error('Saving is paused. Reload before trying again.');
          if ((await read(WORKSPACE_KEY)) !== raw) {
            blocked = true;
            throw new Error(
              'Notes or preparation changed in another window. Keep your draft, export it, then reload.'
            );
          }
          const result = validateWorkspace({ ...change(value), revision: value.revision + 1 });
          if (!result.ok) throw new Error('Invalid notes or preparation data');
          const nextRaw = JSON.stringify(result.workspace);
          await beforeWrite(value);
          await write(WORKSPACE_KEY, nextRaw);
          raw = nextRaw;
          value = result.workspace;
          return value;
        })
      );
      queue = run.catch(() => {});
      return run;
    },
    async rawExport() {
      return read(WORKSPACE_KEY);
    },
  };
}
