/**
 * Applies the notification plan through @capacitor/local-notifications.
 * Reminders are best-effort: denied permission or plugin failure leaves
 * the app working. A failed cancellation may leave earlier reminders pending;
 * later foreground/settings sync can retry.
 */
import { durableGet } from '../utils/safeStorage.js';
import { ORGANISER_KEY, validateOrganiser } from '../domain/organiser.js';
import { planOrganiserNotifications } from '../domain/organiserNotifications.js';
import i18n from 'i18next';
import { LocalNotifications } from '@capacitor/local-notifications';
import { planNotifications } from '../domain/notifications.js';
import { onForeground, onStoreChange } from '../data/StoreProvider.jsx';
import { isNative } from '../utils/native.js';

/** Permission is checked here; only explicit onboarding/settings actions request it. */
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
async function applyReminders(store, t) {
  if (!isNative) return { scheduled: 0 };
  try {
    const now = new Date();
    const raw = await durableGet(ORGANISER_KEY);
    const organiser = raw ? validateOrganiser(JSON.parse(raw)) : null;
    const plan = [
      ...planNotifications(store, now, t),
      ...(organiser?.ok ? planOrganiserNotifications(organiser.organiser, store, now) : []),
    ]
      .sort((a, b) => a.at - b.at)
      .slice(0, 64);

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

// Native cancel/schedule must be one transaction at a time: an older sync
// must not schedule after a newer request has disabled reminders.
let pendingSync = Promise.resolve();
export function syncReminders(store, t) {
  const result = pendingSync.then(() => applyReminders(store, t));
  pendingSync = result.catch(() => {});
  return result;
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
  let timer = null;
  let lastStore = null;
  const onOrganiser = () => {
    if (!lastStore) return;
    clearTimeout(timer);
    timer = setTimeout(() => void sync(lastStore), RESCHEDULE_DELAY_MS);
  };
  window.addEventListener('faithful-organiser-changed', onOrganiser);
  const offForeground = onForeground(({ store }) => {
    lastStore = store;
    clearTimeout(timer);
    return sync(store);
  });
  const offChange = onStoreChange((store) => {
    lastStore = store;
    clearTimeout(timer);
    timer = setTimeout(() => void sync(store), RESCHEDULE_DELAY_MS);
  });
  return () => {
    window.removeEventListener('faithful-organiser-changed', onOrganiser);
    offForeground();
    offChange();
    clearTimeout(timer);
  };
}
