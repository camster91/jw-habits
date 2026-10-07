/**
 * Writes newly earned badges into the store (once, dated today) and tells the
 * UI through a `fd-badge` window event. Never removes a badge. A store change
 * caused by an award finds nothing new, so this cannot loop.
 */
import { newlyEarned } from '../domain/badges.js';
import { onForeground, onStoreChange } from '../data/StoreProvider.jsx';

/** @returns {string[]} the ids awarded by this call (empty when nothing was new) */
export function awardBadges(store, update, today) {
  if (!today || newlyEarned(store, today).length === 0) return [];
  let awarded = [];
  update((s) => {
    awarded = newlyEarned(s, today);
    if (awarded.length === 0) return s;
    const badges = { ...s.badges };
    for (const id of awarded) badges[id] = today;
    return { ...s, badges };
  });
  if (awarded.length > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fd-badge', { detail: { ids: awarded } }));
  }
  return awarded;
}

/**
 * Call once at startup. Runs after load/resume (so badges already earned by
 * migrated data get dated) and after every store change.
 * @returns {() => void} unsubscribe
 */
export function registerBadgeAwards() {
  const offForeground = onForeground(({ store, update, today }) => {
    awardBadges(store, update, today);
  });
  const offChange = onStoreChange((store, { update, today } = {}) => {
    if (update) awardBadges(store, update, today);
  });
  return () => {
    offForeground();
    offChange();
  };
}
