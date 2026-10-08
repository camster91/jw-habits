import { hasStorageFailure } from '../utils/safeStorage.js';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function StorageNotice({ onBackup, savingPaused = false }) {
  const { t } = useTranslation();
  const [full, setFull] = useState(hasStorageFailure);
  useEffect(() => {
    let active = true;
    const warn = () => {
      if (active) setFull(true);
    };
    window.addEventListener('jw-storage-full', warn);
    if (hasStorageFailure()) queueMicrotask(warn);
    return () => {
      active = false;
      window.removeEventListener('jw-storage-full', warn);
    };
  }, []);
  if (!full && !savingPaused) return null;
  return (
    <div
      role="alert"
      className="fixed left-4 right-4 top-4 z-50 mx-auto max-w-md rounded-2xl bg-base-100 p-4 shadow-lg"
    >
      <p>{t(savingPaused ? 'fd.storage.paused' : 'fd.storage.full')}</p>
      <button type="button" className="btn min-h-11" onClick={onBackup}>
        {t('fd.storage.backup')}
      </button>
    </div>
  );
}
