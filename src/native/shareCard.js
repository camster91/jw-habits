import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNative } from '../utils/native.js';
import { isShareCancel } from '../utils/backup.js';

export async function shareCard(blob, fileName) {
  if (isNative) {
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const { uri } = await Filesystem.writeFile({
      path: fileName,
      data,
      directory: Directory.Cache,
    });
    try {
      await Share.share({ title: 'Faithful Days', files: [uri] });
    } catch (error) {
      if (!isShareCancel(error)) throw error;
    } finally {
      await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache }).catch(() => {});
    }
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
