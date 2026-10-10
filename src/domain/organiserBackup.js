import { importBundle } from './workspace.js';
import { importJson } from './store.js';
import { validateWorkspace } from './workspace.js';
import { validateOrganiser } from './organiser.js';
export const BACKUP_FORMAT = 'faithful-days-organiser-backup';
export function exportOrganiserBundle(routines, workspace, organiser) {
  if (
    !importJson(JSON.stringify(routines), '2026-10-10').ok ||
    !validateWorkspace(workspace).ok ||
    !validateOrganiser(organiser).ok
  )
    throw new Error(
      'Some device data cannot be read. Export the original data before changing anything.'
    );
  return JSON.stringify(
    { format: BACKUP_FORMAT, version: 1, minimumReader: '5.3.0', routines, workspace, organiser },
    null,
    2
  );
}
export function importOrganiserBundle(raw, today) {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > 8 * 1024 * 1024)
    return { ok: false, reason: 'badShape' };
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'notObject' };
  }
  if (value?.format !== BACKUP_FORMAT) return importBundle(raw, today);
  if (
    value.minimumReader &&
    (!/^\d+\.\d+\.\d+$/.test(value.minimumReader) ||
      value.minimumReader
        .split('.')
        .map(Number)
        .some(
          (v, i, parts) => parts.slice(0, i).every((p, j) => p === [5, 3, 0][j]) && v > [5, 3, 0][i]
        ))
  )
    return { ok: false, reason: 'newerVersion' };
  if (
    value.version !== 1 ||
    !validateWorkspace(value.workspace).ok ||
    !validateOrganiser(value.organiser).ok
  )
    return { ok: false, reason: 'badShape' };
  const routines = importJson(JSON.stringify(value.routines), today);
  return routines.ok
    ? {
        ...routines,
        workspace: validateWorkspace(value.workspace).workspace,
        organiser: validateOrganiser(value.organiser).organiser,
        legacy: false,
      }
    : routines;
}
