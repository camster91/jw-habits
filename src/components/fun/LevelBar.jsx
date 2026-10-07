import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { levelFor } from '../../domain/garden.js';
import { safeSessionGetItem, safeSessionSetItem } from '../../utils/safeStorage.js';
import { haptics } from '../../utils/native.js';
import Confetti from './Confetti.jsx';

export default function LevelBar({ xp, tone = 'warm' }) {
  const { t } = useTranslation();
  const info = levelFor(xp);
  const name =
    info.level < 8
      ? t(`fd.fun.levels.${info.level}`)
      : t('fd.fun.treeNumber', { count: info.level - 6 });
  const [celebrated, setCelebrated] = useState(null);
  useEffect(() => {
    if (info.level === 0) return;
    const key = `fd-level-${info.level}`;
    if (safeSessionGetItem(key)) return;
    // Queue outside the effect's synchronous render to keep StrictMode safe.
    const timer = setTimeout(() => {
      if (safeSessionGetItem(key)) return;
      safeSessionSetItem(key, '1');
      setCelebrated(info.level);
      if (tone !== 'quiet') void haptics.success();
    }, 0);
    return () => clearTimeout(timer);
  }, [info.level, tone]);
  return (
    <div className="space-y-2">
      <p>{t('fd.fun.level', { name, level: info.level })}</p>
      <progress
        className="progress w-full"
        aria-label={t('fd.fun.levelProgress')}
        value={xp - info.floor}
        max={info.next - info.floor}
      />
      <p className="text-sm">
        {t('fd.fun.xp', { earned: xp - info.floor, needed: info.next - info.floor })}
      </p>
      <div role="status">{celebrated === info.level && t('fd.fun.levelReached', { name })}</div>
      {celebrated === info.level && tone !== 'quiet' && <Confetti key={info.level} />}
    </div>
  );
}
