/**
 * Notification Utilities — Platform-aware
 * Uses Capacitor LocalNotifications on native, web Notification API on PWA
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isAndroid } from './native';

const isCapacitor = Capacitor.isNativePlatform();

// ── Permission helpers ─────────────────────────────────────────────

export function isNotificationSupported() {
  if (isCapacitor) return true;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function getNotificationPermission() {
  if (isCapacitor) return 'granted'; // checked at request time
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (isCapacitor) {
    try {
      // Android 13+ requires runtime permission
      if (isAndroid) {
        const { state } = await LocalNotifications.checkPermissions();
        if (state === 'prompt' || state === 'prompt-with-rationale') {
          const result = await LocalNotifications.requestPermissions();
          return result.state === 'granted' ? 'granted' : 'denied';
        }
        return state === 'granted' ? 'granted' : 'denied';
      }
      return 'granted';
    } catch (e) {
      console.warn('Capacitor notification permission error:', e);
      return 'error';
    }
  }

  if (!isNotificationSupported()) {
    console.warn('Notifications not supported');
    return 'unsupported';
  }

  try {
    return await Notification.requestPermission();
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'error';
  }
}

// ── Scheduling IDs (must be positive integers on Android) ──────────

let nextId = 1;
function getNextId() {
  return nextId++;
}

// ── Schedule a daily recurring notification ────────────────────────

/**
 * Schedule a recurring daily notification at a specific time.
 * On native: uses Capacitor LocalNotifications (survives app close).
 * On web: uses setTimeout (only works while tab is open).
 *
 * @param {string} time - Time in HH:MM format
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {number} id - Stable numeric ID for this notification type
 * @returns {Promise<{cancel: Function}>} Cancel handle
 */
export async function scheduleDailyNotification(time, title, body, id) {
  const notifId = id || getNextId();

  if (isCapacitor) {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: notifId,
          title,
          body,
          schedule: {
            at: parseTimeToday(time),
            repeats: true,
          },
          sound: null,
          attachments: null,
          actionTypeId: '',
          extra: null,
        }],
      });
      return { cancel: () => cancelNotification(notifId) };
    } catch (e) {
      console.warn('Capacitor schedule error:', e);
      return { cancel: () => {} };
    }
  }

  // Web fallback: setTimeout (only works while tab open)
  const timeoutId = scheduleNotificationForTodayWeb(time, title, { body, tag: `reminder-${notifId}` });
  return { cancel: () => { if (timeoutId) clearTimeout(timeoutId); } };
}

// ── Schedule a weekly notification ─────────────────────────────────

/**
 * Schedule a weekly notification on a specific day and time.
 * @param {number} dayOfWeek - 0=Sun, 1=Mon, ..., 6=Sat
 * @param {string} time - HH:MM
 * @param {string} title
 * @param {string} body
 * @param {number} id
 */
export async function scheduleWeeklyNotification(dayOfWeek, time, title, body, id) {
  const notifId = id || getNextId();

  if (isCapacitor) {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: notifId,
          title,
          body,
          schedule: {
            on: { weekday: dayOfWeek + 1 }, // Capacitor uses 1=Sun..7=Sat
            at: parseTimeOnly(time),
          },
          sound: null,
          attachments: null,
          actionTypeId: '',
          extra: null,
        }],
      });
      return { cancel: () => cancelNotification(notifId) };
    } catch (e) {
      console.warn('Capacitor weekly schedule error:', e);
      return { cancel: () => {} };
    }
  }

  // Web fallback: setTimeout for next occurrence this week
  const timeoutId = scheduleWebWeekly(dayOfWeek, time, title, { body, tag: `reminder-${notifId}` });
  return { cancel: () => { if (timeoutId) clearTimeout(timeoutId); } };
}

// ── Cancel ────────────────────────────────────────────────────────

export async function cancelNotification(id) {
  if (isCapacitor) {
    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
    } catch (e) {
      console.warn('Capacitor cancel error:', e);
    }
  }
}

export async function cancelAllNotifications() {
  if (isCapacitor) {
    try {
      await LocalNotifications.cancelAll();
    } catch (e) {
      console.warn('Capacitor cancelAll error:', e);
    }
  }
}

// ── Initialize all reminders from settings ────────────────────────

/**
 * Schedule all notification reminders based on settings.
 * Returns array of cancel handles.
 */
export async function initializeReminders(settings) {
  const cancelHandles = [];

  if (!settings.notificationsEnabled) return cancelHandles;

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return cancelHandles;

  // Cancel existing first
  await cancelAllNotifications();

  const notifs = settings.notifications;

  // Daily notifications (repeating every day)
  const dailyItems = [
    { key: 'dailyText', id: 1, title: 'Daily Text Reminder', body: "Don't forget to read today's daily text!" },
    { key: 'morningPrayer', id: 2, title: 'Morning Prayer', body: 'Time for your morning prayer.' },
    { key: 'afternoonPrayer', id: 3, title: 'Afternoon Prayer', body: 'Time for your afternoon prayer.' },
    { key: 'eveningPrayer', id: 4, title: 'Evening Prayer', body: 'Time for your evening prayer.' },
    { key: 'bibleReading', id: 5, title: 'Bible Reading Reminder', body: 'Time for your daily Bible reading!' },
    { key: 'streakMotivation', id: 6, title: 'Keep Your Streak', body: 'Stay consistent with your spiritual habits!' },
  ];

  for (const item of dailyItems) {
    const setting = notifs[item.key];
    if (setting && setting.enabled) {
      const handle = await scheduleDailyNotification(
        setting.time,
        item.title,
        item.body,
        item.id
      );
      cancelHandles.push(handle);
    }
  }

  // Weekly notifications
  if (notifs.familyWorship?.enabled) {
    const day = notifs.familyWorship.dayOfWeek ?? 1; // Monday default
    const handle = await scheduleWeeklyNotification(
      day,
      notifs.familyWorship.time,
      'Family Worship Reminder',
      'Time for family worship tonight!',
      7
    );
    cancelHandles.push(handle);
  }

  if (notifs.meetingPrep?.enabled) {
    const meetingDays = notifs.meetingPrep.meetingDays || [0, 4]; // Sun, Thu
    // Schedule reminder for the day before each meeting day
    for (let i = 0; i < meetingDays.length; i++) {
      const dayBefore = (meetingDays[i] + 6) % 7; // day before (wrap around)
      const handle = await scheduleWeeklyNotification(
        dayBefore,
        notifs.meetingPrep.time,
        'Meeting Tomorrow',
        'Remember to prepare for tomorrow\'s meeting!',
        8 + i
      );
      cancelHandles.push(handle);
    }
  }

  return cancelHandles;
}

// ── Legacy compat (used by existing tests) ────────────────────────

export function showNotification(title, options = {}) {
  if (isCapacitor) {
    // On native, use LocalNotifications for immediate display
    return LocalNotifications.schedule({
      notifications: [{
        id: getNextId(),
        title,
        body: options.body || '',
        schedule: { at: new Date(Date.now() + 100) },
        sound: null,
        attachments: null,
        actionTypeId: '',
        extra: null,
      }],
    }).then(() => true).catch(() => false);
  }

  if (!isNotificationSupported()) return Promise.resolve(false);
  if (Notification.permission !== 'granted') return Promise.resolve(false);

  return navigator.serviceWorker.ready
    .then((registration) => {
      registration.showNotification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        ...options,
      });
      return true;
    })
    .catch(() => false);
}

export function scheduleNotificationForToday(time, title, options = {}) {
  // Back-compat: returns timeoutId for web, or calls async version for native
  if (isCapacitor) {
    scheduleDailyNotification(time, title, options.body || '', getNextId());
    return -1; // no meaningful timeoutId on native
  }
  return scheduleNotificationForTodayWeb(time, title, options);
}

export function scheduleDailyTextReminder(time) {
  return scheduleNotificationForToday(time, 'Daily Text Reminder', {
    body: "Don't forget to read today's daily text!",
    tag: 'daily-text-reminder',
  });
}

export function scheduleBibleReadingReminder(time) {
  return scheduleNotificationForToday(time, 'Bible Reading Reminder', {
    body: 'Time for your daily Bible reading!',
    tag: 'bible-reading-reminder',
  });
}

export function scheduleMeetingReminder(meetingDate) {
  const reminderDate = new Date(meetingDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(18, 0, 0, 0);

  const now = new Date();
  if (reminderDate <= now) return null;

  if (isCapacitor) {
    scheduleWeeklyNotification(
      reminderDate.getDay(),
      '18:00',
      'Meeting Tomorrow',
      'Remember to prepare for tomorrow\'s meeting!',
      getNextId()
    );
    return -1;
  }

  const delay = reminderDate - now;
  return setTimeout(() => {
    showNotification('Meeting Tomorrow', {
      body: 'Remember to prepare for tomorrow\'s meeting!',
      tag: 'meeting-reminder',
    });
  }, delay);
}

export function cancelScheduledNotification(timeoutId) {
  if (timeoutId && timeoutId !== -1) {
    clearTimeout(timeoutId);
  }
}

// ── Internal helpers ──────────────────────────────────────────────

function parseTimeToday(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  // If time already passed today, schedule for tomorrow
  if (date <= new Date()) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function parseTimeOnly(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function scheduleNotificationForTodayWeb(time, title, options = {}) {
  if (!isNotificationSupported()) return null;

  const [hours, minutes] = time.split(':').map(Number);
  const scheduledTime = new Date();
  scheduledTime.setHours(hours, minutes, 0, 0);

  if (scheduledTime <= new Date()) return null;

  const delay = scheduledTime - new Date();
  return setTimeout(() => {
    showNotification(title, options);
  }, delay);
}

function scheduleWebWeekly(dayOfWeek, time, title, options = {}) {
  if (!isNotificationSupported()) return null;

  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  // Find next occurrence of this day of week
  const currentDay = now.getDay();
  let daysUntil = dayOfWeek - currentDay;
  if (daysUntil < 0) daysUntil += 7;
  if (daysUntil === 0 && target <= now) daysUntil = 7;
  target.setDate(target.getDate() + daysUntil);

  const delay = target - now;
  return setTimeout(() => {
    showNotification(title, options);
  }, delay);
}