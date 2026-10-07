import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BADGES } from '../../domain/badges.js';

export default function BadgeToast() {
  const { t } = useTranslation();
  const [ids, setIds] = useState([]);
  useEffect(() => {
    const receive = (event) => {
      const incoming = Array.isArray(event.detail?.ids) ? event.detail.ids : [];
      const known = incoming.filter((id) => BADGES.some((b) => b.id === id));
      setIds((old) => [...new Set([...old, ...known])]);
    };
    window.addEventListener('fd-badge', receive);
    return () => window.removeEventListener('fd-badge', receive);
  }, []);
  useEffect(() => {
    if (!ids.length) return;
    const timer = setTimeout(() => setIds((old) => old.slice(1)), 5000);
    return () => clearTimeout(timer);
  }, [ids]);
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        ids.length
          ? 'fixed bottom-24 left-4 right-4 z-30 mx-auto max-w-md rounded-2xl bg-base-100 p-4 shadow-lg'
          : 'sr-only'
      }
    >
      {ids.length > 0 && (
        <>
          <p>{t('fd.fun.badgeEarned', { name: t(`fd.fun.badges.${ids[0]}`) })}</p>
          <button
            type="button"
            className="btn btn-ghost min-h-11"
            onClick={() => setIds((old) => old.slice(1))}
          >
            {t('fd.fun.dismiss')}
          </button>
        </>
      )}
    </div>
  );
}
