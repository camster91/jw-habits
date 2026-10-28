/**
 * Stores as older app versions wrote them, built from today's defaults by
 * removing what later versions added. Test-only fixtures.
 */
import { defaultStore } from '../domain/store.js';

/** A v3 store (v5.1/v5.2): no whatsNew routine, events, backup or v4 reminder switches. */
export function v3Store(day = '2026-09-01') {
  // eslint-disable-next-line no-unused-vars
  const { events, backup, ...rest } = defaultStore(day, 'en');
  // eslint-disable-next-line no-unused-vars
  const { events: e, backup: b, ...reminders } = rest.reminders;
  return {
    ...rest,
    version: 3,
    reminders,
    schedule: rest.schedule.map((entry) => {
      // eslint-disable-next-line no-unused-vars
      const { whatsNew, ...enabled } = entry.enabled;
      return { ...entry, enabled };
    }),
  };
}

/** A v2 store (v5.0): the v3 store without the v3 fields, plus `studyTopic`. */
export function v2Store(day = '2026-09-01', studyTopic = '') {
  // eslint-disable-next-line no-unused-vars
  const { plans, activePlan, familyAgendas, badges, showGameLayer, showShare, ...rest } =
    v3Store(day);
  return { ...rest, version: 2, studyTopic };
}
