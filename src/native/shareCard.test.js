import { describe, it, expect, vi, afterEach } from 'vitest';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { shareCard } from './shareCard.js';
const platform = vi.hoisted(() => ({ isNative: true }));
vi.mock('../utils/native.js', () => ({
  get isNative() {
    return platform.isNative;
  },
}));
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Encoding: {},
  Filesystem: {
    writeFile: vi.fn(async () => ({ uri: 'file://card.png' })),
    deleteFile: vi.fn(async () => {}),
  },
}));
vi.mock('@capacitor/share', () => ({ Share: { share: vi.fn(async () => {}) } }));
afterEach(() => vi.clearAllMocks());
describe('shareCard', () => {
  it('shares a PNG file and cleans up its cache', async () => {
    await shareCard(new Blob(['PNG'], { type: 'image/png' }), 'card.png');
    expect(Filesystem.writeFile).toHaveBeenCalledWith({
      path: 'card.png',
      data: 'UE5H',
      directory: 'CACHE',
    });
    expect(Share.share).toHaveBeenCalledWith({
      title: 'Faithful Days',
      files: ['file://card.png'],
    });
    expect(Filesystem.deleteFile).toHaveBeenCalled();
  });
  it('treats user cancellation as normal', async () => {
    Share.share.mockRejectedValueOnce(new Error('User cancelled'));
    await expect(shareCard(new Blob(['PNG']), 'card.png')).resolves.toBeUndefined();
  });
  it('surfaces other share errors and still cleans up', async () => {
    Share.share.mockRejectedValueOnce(new Error('Unavailable'));
    await expect(shareCard(new Blob(['PNG']), 'card.png')).rejects.toThrow('Unavailable');
    expect(Filesystem.deleteFile).toHaveBeenCalled();
  });
});
