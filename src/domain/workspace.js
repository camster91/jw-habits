import { addDays } from './day.js';
import { newId } from './ids.js';
import { isSafeHttpUrl } from '../utils/safeUrls.js';
import { importJson } from './store.js';

export const WORKSPACE_KEY = 'faithful-days-workspace-v1';
export const MEETING_PARTS = {
  midweek: [
    'Treasures From God’s Word',
    'Spiritual Gems',
    'Bible Reading',
    'Apply Yourself to the Field Ministry',
    'Living as Christians',
    'Congregation Bible Study',
  ],
  weekend: ['Public Talk', 'Watchtower Study'],
};
export const ASSIGNMENT_TYPES = [
  'Bible reading',
  'Starting a Conversation',
  'Following Up',
  'Making Disciples',
  'Explaining Your Beliefs',
  'What Would You Say?',
  'Talk',
  'Other',
];
export const emptyWorkspace = () => ({
  version: 1,
  revision: 0,
  notes: [],
  meetings: [],
  assignments: [],
});
const object = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const text = (x, max, required = false) =>
  typeof x === 'string' && x.length <= max && (!required || Boolean(x.trim()));
const day = (x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && addDays(x, 0) === x;
const id = (x) => text(x, 100, true);
const unique = (xs) => new Set(xs.map((x) => x.id)).size === xs.length;
const list = (xs, max, test) => Array.isArray(xs) && xs.length <= max && xs.every(test);
const context = (x) =>
  x === null ||
  (object(x) && ['day', 'plan', 'step', 'meeting', 'assignment'].includes(x.kind) && id(x.id));
const note = (x) =>
  object(x) &&
  id(x.id) &&
  text(x.title, 120, true) &&
  text(x.body, 8000) &&
  list(x.tags, 10, (t) => text(t, 32, true)) &&
  new Set(x.tags).size === x.tags.length &&
  list(x.links, 5, (u) => text(u, 2000, true) && isSafeHttpUrl(u)) &&
  context(x.context) &&
  day(x.createdOn) &&
  day(x.updatedOn);
const task = (x) =>
  object(x) && id(x.id) && text(x.title, 120, true) && typeof x.done === 'boolean';
const meeting = (x) =>
  object(x) &&
  id(x.id) &&
  Object.hasOwn(MEETING_PARTS, x.type) &&
  day(x.date) &&
  list(x.prepared, MEETING_PARTS[x.type].length, (p) => MEETING_PARTS[x.type].includes(p)) &&
  new Set(x.prepared).size === x.prepared.length;
const assignment = (x) =>
  object(x) &&
  id(x.id) &&
  text(x.title, 120, true) &&
  ASSIGNMENT_TYPES.includes(x.type) &&
  day(x.date) &&
  text(x.details, 2000) &&
  list(x.tasks, 30, task) &&
  unique(x.tasks);

/** Validate without repairing or dropping user records; copy to prevent aliasing. */
export function validateWorkspace(x) {
  if (
    !object(x) ||
    x.version !== 1 ||
    !Number.isSafeInteger(x.revision) ||
    x.revision < 0 ||
    !list(x.notes, 2000, note) ||
    !unique(x.notes) ||
    !list(x.meetings, 1000, meeting) ||
    !unique(x.meetings) ||
    !list(x.assignments, 1000, assignment) ||
    !unique(x.assignments)
  )
    return { ok: false };
  return { ok: true, workspace: JSON.parse(JSON.stringify(x)) };
}

/** Saving an edited note retains its identity, creation day and context. */
export function putNote(workspace, input, today) {
  const existing = workspace.notes.find((n) => n.id === input.id);
  const next = {
    id: existing?.id ?? newId(),
    title: input.title.trim(),
    body: input.body,
    tags: [...new Set(input.tags.map((t) => t.trim()).filter(Boolean))],
    links: input.links.map((u) => u.trim()).filter(Boolean),
    context: input.context ?? existing?.context ?? null,
    createdOn: existing?.createdOn ?? today,
    updatedOn: today,
  };
  const result = {
    ...workspace,
    notes: [...workspace.notes.filter((n) => n.id !== next.id), next],
  };
  if (!validateWorkspace(result).ok) throw new Error('Invalid note or note limit reached');
  return result;
}

export function searchNotes(workspace, query, tag = '') {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return workspace.notes
    .filter(
      (n) =>
        (!tag || n.tags.includes(tag)) &&
        words.every((w) => [n.title, n.body, ...n.tags].join(' ').toLocaleLowerCase().includes(w))
    )
    .sort((a, b) => b.updatedOn.localeCompare(a.updatedOn));
}

/** Search related local records without mutating them or indexing remotely. */
export function searchRelated(workspace, store, query) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const records = [
    ...store.plans.flatMap((p) => [
      {
        key: `plan-${p.id}`,
        title: p.title,
        text: p.title,
        kind: 'Study/family plan',
        url: `/plans/${encodeURIComponent(p.id)}`,
      },
      ...p.steps.map((s) => ({
        key: `step-${s.id}`,
        title: s.title,
        text: `${p.title} ${s.title} ${s.note ?? ''}`,
        kind: 'Plan step',
        url: `/plans/${encodeURIComponent(p.id)}`,
      })),
    ]),
    ...workspace.meetings.map((m) => ({
      key: `meeting-${m.id}`,
      title: `${m.type} meeting · ${m.date}`,
      text: `${m.type} ${m.date} ${m.prepared.join(' ')}`,
      kind: 'Meeting preparation',
      url: '/plans/preparation',
    })),
    ...workspace.assignments.map((a) => ({
      key: `assignment-${a.id}`,
      title: a.title,
      text: `${a.title} ${a.type} ${a.date} ${a.details} ${a.tasks.map((t) => t.title).join(' ')}`,
      kind: 'Assignment',
      url: '/plans/preparation',
    })),
  ];
  return records.filter((r) => words.every((w) => r.text.toLocaleLowerCase().includes(w)));
}

export function exportBundle(routines, workspace) {
  return JSON.stringify(
    { format: 'faithful-days-backup', version: 1, routines, workspace },
    null,
    2
  );
}

/** Legacy imports deliberately retain the current workspace. Neither branch writes. */
export function importBundle(raw, today) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'notObject' };
  }
  if (parsed?.format !== 'faithful-days-backup') return { ...importJson(raw, today), legacy: true };
  if (parsed.version !== 1 || !validateWorkspace(parsed.workspace).ok)
    return { ok: false, reason: 'badShape' };
  const routines = importJson(JSON.stringify(parsed.routines), today);
  return routines.ok
    ? { ...routines, workspace: validateWorkspace(parsed.workspace).workspace, legacy: false }
    : routines;
}
