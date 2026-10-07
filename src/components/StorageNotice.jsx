import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function StorageNotice({ onBackup }) {
  const { t } = useTranslation();
  const [full, setFull] = useState(false);
  useEffect(() => {
    const warn = () => setFull(true);
    window.addEventListener('jw-storage-full', warn);
    return () => window.removeEventListener('jw-storage-full', warn);
  }, []);
  if (!full) return null;
  return (
    <div
      role="alert"
      className="fixed left-4 right-4 top-4 z-50 mx-auto max-w-md rounded-2xl bg-base-100 p-4 shadow-lg"
    >
      <p>{t('fd.storage.full')}</p>
      <button type="button" className="btn min-h-11" onClick={onBackup}>
        {t('fd.storage.backup')}
      </button>
    </div>
  );
}
