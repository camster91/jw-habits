/**
 * Hands a backup file to the user: on a phone it is written to the cache
 * directory and offered through the share sheet; on the web it downloads.
 */
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNative } from './native.js';

/** True for the rejection a share sheet gives when the user just closes it. */
export function isShareCancel(error) {
  return /cancel/i.test(String(error?.message ?? error));
}

/**
 * @param {string} text the file's contents
 * @param {string} fileName e.g. 'faithful-days-backup-2026-10-06.json'
 * @param {string} title the share sheet's title
 */
export async function saveBackup(text, fileName, title) {
  if (isNative) {
    const { uri } = await Filesystem.writeFile({
      path: fileName,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title, url: uri });
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Some browsers start the download after click() returns; revoke later.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
