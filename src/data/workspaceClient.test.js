import { describe, it, expect, vi } from 'vitest';
import { createWorkspaceClient } from './workspaceClient.js';
import { emptyWorkspace, WORKSPACE_KEY } from '../domain/workspace.js';

const setup = (initial = null) => {
  let raw = initial;
  const read = vi.fn(async () => raw);
  const write = vi.fn(async (_key, value) => {
    raw = value;
  });
  const lock = vi.fn((fn) => fn());
  return {
    client: createWorkspaceClient({ read, write, lock }),
    read,
    write,
    lock,
    external: (value) => {
      raw = value;
    },
  };
};
describe('workspace durable acknowledgement', () => {
  it('loads empty without writing; serializes edits and increments revision after save', async () => {
    const s = setup();
    expect(await s.client.load()).toEqual(emptyWorkspace());
    expect(s.write).not.toHaveBeenCalled();
    await Promise.all([s.client.save((w) => w), s.client.save((w) => w)]);
    expect(s.write).toHaveBeenCalledTimes(2);
    expect(JSON.parse(await s.client.rawExport()).revision).toBe(2);
    expect(s.lock).toHaveBeenCalledTimes(2);
    expect(s.read).toHaveBeenCalledWith(WORKSPACE_KEY);
  });
  it.each(['bad', '{"version":2}', '{"version":1}'])(
    'never replaces unreadable data %s',
    async (raw) => {
      const s = setup(raw);
      await expect(s.client.load()).rejects.toThrow();
      await expect(s.client.save((w) => w)).rejects.toThrow('paused');
      expect(await s.client.rawExport()).toBe(raw);
      expect(s.write).not.toHaveBeenCalled();
    }
  );
  it('read failure cannot turn existing data into an empty writable store', async () => {
    const s = setup();
    s.read.mockRejectedValue(new Error('read failed'));
    await expect(s.client.load()).rejects.toThrow('read failed');
    await expect(s.client.save((w) => w)).rejects.toThrow('paused');
    expect(s.write).not.toHaveBeenCalled();
  });
  it('a stale tab refuses all edits until reloaded', async () => {
    const s = setup();
    await s.client.load();
    s.external(JSON.stringify({ ...emptyWorkspace(), revision: 1 }));
    await expect(s.client.save((w) => w)).rejects.toThrow('another window');
    await expect(s.client.save((w) => w)).rejects.toThrow('paused');
    expect(s.write).not.toHaveBeenCalled();
    await s.client.load();
    await s.client.save((w) => w);
    expect(JSON.parse(await s.client.rawExport()).revision).toBe(2);
  });
  it('rejects invalid edits without writing', async () => {
    const s = setup();
    await s.client.load();
    await expect(s.client.save((w) => ({ ...w, notes: [null] }))).rejects.toThrow('Invalid');
    expect(s.write).not.toHaveBeenCalled();
  });
  it('a failed write or recovery preparation is not acknowledged and can be retried', async () => {
    const s = setup();
    await s.client.load();
    s.write.mockRejectedValueOnce(new Error('full'));
    await expect(s.client.save((w) => w)).rejects.toThrow('full');
    expect(await s.client.rawExport()).toBeNull();
    await expect(
      s.client.save(
        (w) => w,
        async () => {
          throw new Error('recovery failed');
        }
      )
    ).rejects.toThrow('recovery failed');
    expect(s.write).toHaveBeenCalledTimes(1);
    await s.client.save((w) => w);
    expect(JSON.parse(await s.client.rawExport()).revision).toBe(1);
  });
});
