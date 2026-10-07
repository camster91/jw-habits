/**
 * Applies the notification plan through @capacitor/local-notifications.
 * Reminders are best-effort: a denied permission or a plugin failure leaves
 * the app working and just schedules nothing.
 */
import i18n from 'i18next';
import { LocalNotifications } from '@capacitor/local-notifications';
import { planNotifications } from '../domain/notifications.js';
import { onForeground, onStoreChange } from '../data/StoreProvider.jsx';
import { isNative } from '../utils/native.js';

/** Permission is only ever checked here; it is requested during onboarding. */
async function permitted() {
  const { display } = await LocalNotifications.checkPermissions();
  return display === 'granted';
}

/**
 * Cancel everything pending, then schedule the next days' plan if
 * notifications are allowed. Never asks for permission and never throws;
 * resolves how many notifications were scheduled.
 * @returns {Promise<{scheduled: number}>}
 */
export async function syncReminders(store, t) {
  if (!isNative) return { scheduled: 0 };
  try {
    const plan = planNotifications(store, new Date(), t);

    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    if (plan.length === 0 || !(await permitted())) return { scheduled: 0 };
    await LocalNotifications.schedule({
      notifications: plan.map(({ id, at, body }) => ({
        id,
        title: t('fd.notify.title'),
        body,
        schedule: { at, allowWhileIdle: true },
      })),
    });
    return { scheduled: plan.length };
  } catch (error) {
    console.warn('Could not schedule reminders:', error);
    return { scheduled: 0 };
  }
}

const RESCHEDULE_DELAY_MS = 1000;

/**
 * Reschedule every time the app opens (spec 2.7). Call once at startup,
 * after i18n is initialised. Settings changes reschedule after a short debounce. Lives here, not in StoreProvider, so the
 * provider never imports the native plugin.
 * @returns {() => void} unsubscribe
 */
export function registerReminderSync() {
  const sync = (store) => syncReminders(store, i18n.t.bind(i18n));
  const offForeground = onForeground(({ store }) => sync(store));
  let timer = null;
  const offChange = onStoreChange((store) => {
    clearTimeout(timer);
    timer = setTimeout(() => void sync(store), RESCHEDULE_DELAY_MS);
  });
  return () => {
    offForeground();
    offChange();
    clearTimeout(timer);
  };
}
