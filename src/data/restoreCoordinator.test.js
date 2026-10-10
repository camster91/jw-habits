import { it, expect, vi } from 'vitest';
import { defaultStore } from '../domain/store.js';
import { emptyWorkspace, exportBundle, importBundle } from '../domain/workspace.js';
import { emptyOrganiser, newOrganiserItem } from '../domain/organiser.js';
import { exportOrganiserBundle, importOrganiserBundle } from '../domain/organiserBackup.js';
import { restoreBundle, recoverRestore } from './restoreCoordinator.js';
import { DATA_KEYS, RECOVERY_KEY, RESTORE_JOURNAL_KEY } from './restoreKeys.js';
const today = '2026-10-10',
  store = defaultStore(today, 'en'),
  workspace = emptyWorkspace(),
  organiser = { ...emptyOrganiser(), tasks: [newOrganiserItem('task', { title: 'Keep me' })] };
const backup = exportOrganiserBundle(store, workspace, organiser);
const next = { ...store, tone: 'quiet' };
function setup() {
  const map = new Map(
    DATA_KEYS.map((k, i) => [k, JSON.stringify([store, workspace, organiser][i])])
  );
  return {
    map,
    read: vi.fn(async (k) => map.get(k) ?? null),
    write: vi.fn(async (k, v) => map.set(k, v)),
  };
}
it('round-trips full data and refuses new envelopes in the old importer', () => {
  expect(importOrganiserBundle(backup, today).organiser).toEqual(organiser);
  expect(importBundle(backup, today).ok).toBe(false);
  expect(importOrganiserBundle(exportBundle(store, workspace), today).organiser).toBeUndefined();
  expect(importOrganiserBundle(JSON.stringify(store), today).legacy).toBe(true);
  expect(importOrganiserBundle('{bad', today).ok).toBe(false);
  expect(
    importOrganiserBundle(JSON.stringify({ ...JSON.parse(backup), version: 2 }), today).ok
  ).toBe(false);
  expect(importOrganiserBundle(' '.repeat(8 * 1024 * 1024 + 1), today).ok).toBe(false);
  expect(() => exportOrganiserBundle(store, workspace, { version: 2 })).toThrow('cannot be read');
});
it('retains a full backup and verifies all stores before clearing recovery', async () => {
  const s = setup();
  await restoreBundle({ backup, store: next, workspace, organiser }, s);
  expect(s.map.get(RECOVERY_KEY)).toBe(backup);
  expect(JSON.parse(s.map.get(RESTORE_JOURNAL_KEY)).status).toBe('complete');
  expect(JSON.parse(s.map.get(DATA_KEYS[0])).tone).toBe('quiet');
});
it.each(DATA_KEYS)('recovers pre-import data after failure writing %s', async (key) => {
  const s = setup();
  s.write.mockImplementation(async (k, v) => {
    if (k === key) throw new Error('full');
    s.map.set(k, v);
  });
  await expect(restoreBundle({ backup, store: next, workspace, organiser }, s)).rejects.toThrow(
    'Reload to recover'
  );
  expect(JSON.parse(s.map.get(RESTORE_JOURNAL_KEY)).status).toBe('pending');
  s.write.mockImplementation(async (k, v) => s.map.set(k, v));
  await recoverRestore(today, s);
  expect(JSON.parse(s.map.get(DATA_KEYS[0]))).toEqual(store);
  expect(JSON.parse(s.map.get(DATA_KEYS[2]))).toEqual(organiser);
  expect(JSON.parse(s.map.get(RESTORE_JOURNAL_KEY)).status).toBe('complete');
});
it('does not mutate device data when a pre-import copy or journal cannot be saved', async () => {
  for (const key of [RECOVERY_KEY, RESTORE_JOURNAL_KEY]) {
    const s = setup();
    s.write.mockImplementation(async (k, v) => {
      if (k === key) throw new Error('full');
      s.map.set(k, v);
    });
    await expect(restoreBundle({ backup, store: next, workspace, organiser }, s)).rejects.toThrow(
      'full'
    );
    expect(JSON.parse(s.map.get(DATA_KEYS[0]))).toEqual(store);
  }
});
it('retains a pending journal on a false write acknowledgement or invalid recovery', async () => {
  const s = setup();
  s.write.mockImplementation(async (k, v) => {
    if (k !== DATA_KEYS[0]) s.map.set(k, v);
  });
  await expect(restoreBundle({ backup, store: next, workspace, organiser }, s)).rejects.toThrow(
    'verification'
  );
  s.map.set(RESTORE_JOURNAL_KEY, JSON.stringify({ version: 1, status: 'pending', before: {} }));
  await expect(recoverRestore(today, s)).rejects.toThrow('cannot be read');
});

it('rejects unsupported minimum readers before any restore write', () => {
  const parsed = JSON.parse(backup);
  for (const minimumReader of ['5.3.1', '5.4.0', '6.0.0', 'bad'])
    expect(
      importOrganiserBundle(JSON.stringify({ ...parsed, minimumReader }), today)
    ).toMatchObject({ ok: false, reason: 'newerVersion' });
  expect(
    importOrganiserBundle(JSON.stringify({ ...parsed, minimumReader: '5.2.9' }), today).ok
  ).toBe(true);
});
