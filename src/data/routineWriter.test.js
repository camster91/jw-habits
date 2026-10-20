import { describe, it, expect, vi } from 'vitest';
import { createRoutineWriter } from './routineWriter.js';

function harness(initial = 'a', options = {}) {
  const storage = { value: initial };
  const read = vi.fn(async () => storage.value);
  const write = vi.fn(async (key, value) => {
    storage.value = value;
  });
  const onConflict = vi.fn();
  const writer = createRoutineWriter({
    key: 'jw-habits-v2',
    initialRaw: initial,
    read,
    write,
    lock: (fn) => fn(),
    onConflict,
    ...options,
  });
  return { storage, read, write, onConflict, writer };
}

describe('routine writer', () => {
  it('coalesces rapid same-tab saves into the newest snapshot', async () => {
    const { writer, write, storage } = harness();
    const saves = [writer.save('b'), writer.save('c'), writer.save('d')];
    await Promise.all(saves);
    expect(write).toHaveBeenCalledTimes(1);
    expect(storage.value).toBe('d');
    await writer.save('e');
    expect(storage.value).toBe('e');
  });

  it('pauses without writing when storage changed since this window last read it', async () => {
    const { writer, write, storage, onConflict } = harness();
    storage.value = 'other window';
    await expect(writer.save('mine')).rejects.toThrow('Saving is paused');
    expect(write).not.toHaveBeenCalled();
    expect(onConflict).toHaveBeenCalledTimes(1);
    expect(writer.blocked).toBe(true);
    await expect(writer.save('again')).rejects.toThrow('Saving is paused');
    await expect(writer.replace('import')).rejects.toThrow('Saving is paused');
    expect(storage.value).toBe('other window');
    expect(onConflict).toHaveBeenCalledTimes(1);
  });

  it('keeps its baseline after a failed write (quota) and a failed read', async () => {
    const { writer, write, read, storage } = harness();
    write.mockRejectedValueOnce(new Error('quota'));
    await expect(writer.save('b')).rejects.toThrow('quota');
    read.mockRejectedValueOnce(new Error('read failed'));
    await expect(writer.save('c')).rejects.toThrow('read failed');
    expect(writer.blocked).toBe(false);
    await writer.save('d');
    expect(storage.value).toBe('d');
  });

  it('replace runs its restore step in the lock, skips the compare and drops queued snapshots', async () => {
    const order = [];
    const { writer, storage } = harness('a', {
      lock: async (fn) => {
        order.push('lock');
        return fn();
      },
    });
    writer.save('stale edit');
    await writer.replace('imported', async () => {
      order.push('restore');
      storage.value = 'imported';
    });
    expect(storage.value).toBe('imported');
    expect(order).toEqual(['lock', 'lock', 'restore']);
    await writer.save('after');
    expect(storage.value).toBe('after');
  });

  it('adopts another window only when in step and idle', async () => {
    const { writer, storage } = harness();
    expect(writer.canAdopt('a')).toBe(true);
    expect(writer.canAdopt('x')).toBe(false);
    const pending = writer.save('b');
    expect(writer.canAdopt('a')).toBe(false);
    await pending;
    writer.adopt('c');
    storage.value = 'c';
    await writer.save('d');
    expect(storage.value).toBe('d');
    writer.block();
    expect(writer.canAdopt('d')).toBe(false);
  });

  it('works without Web Locks and uses them when the browser provides them', async () => {
    const storage = { value: null };
    const read = async () => storage.value;
    const write = async (k, v) => {
      storage.value = v;
    };
    const original = navigator.locks;
    try {
      delete navigator.locks;
      await createRoutineWriter({ key: 'k', initialRaw: null, read, write }).save('x');
      expect(storage.value).toBe('x');
      const request = vi.fn((name, fn) => fn());
      navigator.locks = { request };
      await createRoutineWriter({ key: 'k', initialRaw: 'x', read, write }).save('y');
      expect(request).toHaveBeenCalledWith('k', expect.any(Function));
      expect(storage.value).toBe('y');
    } finally {
      if (original) navigator.locks = original;
      else delete navigator.locks;
    }
  });
});
