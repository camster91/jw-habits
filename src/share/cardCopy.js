import { weekStart } from '../domain/day.js';
import { labelFor } from '../domain/store.js';
import { ROUTINE_IDS } from '../domain/routines.js';

/** Explicit allowlist: notes and links are never read or put on cards. */
export function cardCopy(kind, data, t) {
  switch (kind) {
    case 'milestone':
      return {
        title: data.badge
          ? t('fd.share.badge', { title: data.title })
          : t('fd.share.finished', { title: data.title }),
        lines: [],
      };
    case 'garden':
      return {
        title: t('fd.share.garden'),
        lines: data.showGameLayer
          ? [t('fd.fun.level', { name: data.name, level: data.level })]
          : [],
      };
    case 'streak':
      return {
        title: data.title,
        lines: [
          t('fd.share.days', { count: data.days }),
          ...(data.streak > 0 ? [t('fd.progress.streak', { count: data.streak })] : []),
        ],
      };
    case 'weekly': {
      const { store, today } = data;
      const log = store.log.filter((e) => e.day >= weekStart(today) && e.day <= today);
      const lines = ROUTINE_IDS.flatMap((id) => {
        const days = new Set(log.filter((e) => e.routine === id).map((e) => e.day)).size;
        return days
          ? [t('fd.share.routineDays', { title: labelFor(store, id, t), count: days })]
          : [];
      });
      const chapters = log
        .filter((e) => e.routine === 'bibleReading')
        .reduce((n, e) => n + (e.value?.chapters?.length ?? 0), 0);
      if (chapters) lines.push(t('fd.progress.chapters', { count: chapters }));
      return { title: t('fd.share.weekly'), lines };
    }
    default:
      throw new Error('Unknown card kind');
  }
}
