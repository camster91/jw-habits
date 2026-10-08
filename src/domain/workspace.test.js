import { describe, it, expect } from 'vitest';
import {
  emptyWorkspace,
  validateWorkspace,
  putNote,
  searchNotes,
  exportBundle,
  importBundle,
  MEETING_PARTS,
} from './workspace.js';
import { defaultStore } from './store.js';

const today = '2026-10-08';
const note = () =>
  putNote(
    emptyWorkspace(),
    {
      title: 'Question',
      body: 'James 1:5',
      tags: ['study', ' study '],
      links: ['https://www.jw.org/'],
      context: { kind: 'day', id: today },
    },
    today
  );
const meeting = { id: 'm1', type: 'midweek', date: today, prepared: [MEETING_PARTS.midweek[0]] };
const assignment = {
  id: 'a1',
  title: 'Bible reading',
  type: 'Bible reading',
  date: today,
  details: '',
  tasks: [{ id: 't1', title: 'Practise', done: false }],
};
describe('workspace records', () => {
  it('copies valid records and never mutates source data', () => {
    const w = { ...note(), meetings: [meeting], assignments: [assignment] };
    const result = validateWorkspace(w);
    expect(result.ok).toBe(true);
    result.workspace.notes[0].title = 'Changed';
    expect(w.notes[0].title).toBe('Question');
    expect(
      validateWorkspace({
        ...w,
        meetings: [{ ...meeting, type: 'weekend', prepared: [MEETING_PARTS.weekend[0]] }],
      }).ok
    ).toBe(true);
    expect(validateWorkspace({ ...w, notes: [{ ...w.notes[0], context: null }] }).ok).toBe(true);
  });
  it.each([
    null,
    [],
    {},
    { version: 2 },
    { ...emptyWorkspace(), revision: -1 },
    { ...emptyWorkspace(), notes: null },
    { ...emptyWorkspace(), notes: Array(2001).fill({}) },
  ])('refuses malformed or future workspace %j', (x) =>
    expect(validateWorkspace(x).ok).toBe(false)
  );
  it.each([
    { title: '' },
    { title: 'x'.repeat(121) },
    { body: 1 },
    { body: 'x'.repeat(8001) },
    { tags: Array(11).fill('t') },
    { tags: [''] },
    { tags: ['x'.repeat(33)] },
    { tags: ['t', 't'] },
    { links: ['javascript:alert(1)'] },
    { links: ['https://user:pass@example.com'] },
    { links: Array(6).fill('https://example.com') },
    { context: {} },
    { context: { kind: 'invalid', id: 'p' } },
    { context: { kind: 'plan', id: '' } },
    { createdOn: '2026-02-30' },
    { updatedOn: 'bad' },
    { id: '' },
  ])('refuses invalid note %j', (patch) => {
    const w = note();
    w.notes[0] = { ...w.notes[0], ...patch };
    expect(validateWorkspace(w).ok).toBe(false);
  });
  it.each(['plan', 'step', 'meeting', 'assignment'])('retains dangling %s context', (kind) => {
    const w = note();
    w.notes[0].context = { kind, id: 'deleted' };
    expect(validateWorkspace(w).ok).toBe(true);
  });
  it.each([
    { type: 'unknown' },
    { date: '2026-02-30' },
    { prepared: ['unknown'] },
    { prepared: [MEETING_PARTS.midweek[0], MEETING_PARTS.midweek[0]] },
  ])('refuses invalid meeting %j', (patch) =>
    expect(
      validateWorkspace({ ...emptyWorkspace(), meetings: [{ ...meeting, ...patch }] }).ok
    ).toBe(false)
  );
  it.each([
    { title: '' },
    { type: 'unknown' },
    { date: 'bad' },
    { details: 1 },
    { tasks: null },
    { tasks: [{ id: 't', title: 'P', done: 1 }] },
    {
      tasks: [
        { id: 't', title: 'P', done: false },
        { id: 't', title: 'P', done: false },
      ],
    },
  ])('refuses invalid assignment %j', (patch) =>
    expect(
      validateWorkspace({ ...emptyWorkspace(), assignments: [{ ...assignment, ...patch }] }).ok
    ).toBe(false)
  );
  it('refuses duplicate records in every collection', () => {
    const w = note();
    for (const [key, value] of [
      ['notes', w.notes[0]],
      ['meetings', meeting],
      ['assignments', assignment],
    ])
      expect(validateWorkspace({ ...emptyWorkspace(), [key]: [value, value] }).ok).toBe(false);
  });
  it('edits a note without changing creation day or losing its context', () => {
    const w = note();
    const n = w.notes[0];
    const edited = putNote(
      w,
      { id: n.id, title: 'Renamed', body: '', tags: [], links: [] },
      '2026-10-09'
    );
    expect(edited.notes[0]).toMatchObject({
      id: n.id,
      createdOn: today,
      updatedOn: '2026-10-09',
      context: n.context,
    });
    expect(w.notes[0].title).toBe('Question');
    expect(() => putNote(w, { title: '', body: '', tags: [], links: [] }, today)).toThrow();
    expect(
      putNote(w, { title: 'Other', body: '', tags: [], links: [] }, today).notes[1].context
    ).toBeNull();
  });
  it('searches all words across title, body and tags and filters by tag', () => {
    const w = putNote(
      note(),
      { title: 'Tomorrow', body: 'Reading', tags: ['family'], links: [] },
      '2026-10-09'
    );
    expect(searchNotes(w, '')[0].title).toBe('Tomorrow');
    expect(searchNotes(w, 'QUESTION james').length).toBe(1);
    expect(searchNotes(w, '', 'family').length).toBe(1);
    expect(searchNotes(w, 'missing')).toEqual([]);
    expect(searchNotes(w, 'james', 'family')).toEqual([]);
  });
  it('validates both backup stores before import and supports legacy backups', () => {
    const r = defaultStore(today, 'en');
    const w = note();
    const raw = exportBundle(r, w);
    expect(importBundle(raw, today)).toMatchObject({
      ok: true,
      store: r,
      workspace: w,
      legacy: false,
    });
    expect(importBundle(JSON.stringify(r), today)).toMatchObject({ ok: true, legacy: true });
    expect(importBundle('bad', today).ok).toBe(false);
    expect(
      importBundle(
        JSON.stringify({ format: 'faithful-days-backup', version: 2, routines: r, workspace: w }),
        today
      ).ok
    ).toBe(false);
    expect(
      importBundle(
        JSON.stringify({
          format: 'faithful-days-backup',
          version: 1,
          routines: null,
          workspace: w,
        }),
        today
      ).ok
    ).toBe(false);
  });
});
