/**
 * Habit-done state shape helpers.
 *
 * The localStorage `done` map for `jw-daily-habits-state` was
 * originally `{ key: boolean }`. After the "personal note per
 * row" feature, the shape is:
 *
 *   { [rowKey]: { done: boolean, note: string } }
 *
 * The transition was designed to be backward-compatible: any
 * old `boolean` value in `done[k]` is treated as `{ done: boolean,
 * note: '' }` by every reader. Writes always go through these
 * helpers, so the shape is consistent once a user has touched
 * the new code path.
 *
 * Notes are:
 *   - per-row, per-day (reset at midnight like the checkbox state)
 *   - capped at 200 chars (defense against pasted walls of text)
 *   - stored only on the user's device — never sent to a server,
 *     never logged, never exported in any analytics.
 *
 * Notes are the user's own words. The app does not sanitize,
 * filter, or auto-suggest. The only validation is the length cap.
 */

const NOTE_MAX = 200;

export function getDone(done, key) {
  if (!done || typeof done !== 'object') return { done: false, note: '' };
  const v = done[key];
  if (typeof v === 'boolean') return { done: v, note: '' };
  if (v && typeof v === 'object') {
    return {
      done: !!v.done,
      note: typeof v.note === 'string' ? v.note.slice(0, NOTE_MAX) : '',
    };
  }
  return { done: false, note: '' };
}

export function setDone(done, key, patch) {
  const cur = getDone(done, key);
  const next = {
    ...cur,
    ...(patch && typeof patch === 'object' ? patch : {}),
    note: typeof (patch && patch.note) === 'string' ? patch.note.slice(0, NOTE_MAX) : cur.note,
  };
  return { ...done, [key]: next };
}

export function isDone(done, key) {
  return getDone(done, key).done;
}

export function getNote(done, key) {
  return getDone(done, key).note;
}

export const NOTE_MAX_LENGTH = NOTE_MAX;
