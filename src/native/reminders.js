/**
 * Applies the notification plan through @capacitor/local-notifications.
 * Reminders are best-effort: a denied permission or a plugin failure leaves
 * the app working and just schedules nothing.
 */
import i18n from 'i18next';
import { LocalNotifications } from '@capacitor/local-notifications';
import { planNotifications } from '../domain/notifications.js';
import { onForeground } from '../data/StoreProvider.jsx';
import { isNative } from '../utils/native.js';

async function permitted() {
  let { display } = await LocalNotifications.checkPermissions();
  if (display === 'prompt' || display === 'prompt-with-rationale') {
    ({ display } = await LocalNotifications.requestPermissions());
  }
  return display === 'granted';
}

/**
 * Cancel everything pending, then schedule the next days' plan.
 * Never throws; resolves how many notifications were scheduled.
 * @returns {Promise<{scheduled: number}>}
 */
export async function syncReminders(store, t) {
  if (!isNative) return { scheduled: 0 };
  try {
    if (!(await permitted())) return { scheduled: 0 };

    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const plan = planNotifications(store, new Date(), t);
    if (plan.length === 0) return { scheduled: 0 };
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

/**
 * Reschedule every time the app opens (spec 2.7). Call once at startup,
 * after i18n is initialised. Lives here, not in StoreProvider, so the
 * provider never imports the native plugin.
 * @returns {() => void} unsubscribe
 */
export function registerReminderSync() {
  return onForeground(({ store }) => syncReminders(store, i18n.t.bind(i18n)));
}
