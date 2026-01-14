/**
 * PWA Notification Utilities
 */

/**
 * Check if notifications are supported
 * @returns {boolean}
 */
export function isNotificationSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get current notification permission status
 * @returns {string} 'granted', 'denied', or 'default'
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission
 * @returns {Promise<string>} Permission result
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'error';
  }
}

/**
 * Show a notification immediately
 * @param {string} title - Notification title
 * @param {Object} options - Notification options
 * @returns {Promise<boolean>} Success status
 */
export async function showNotification(title, options = {}) {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported');
    return false;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      ...options,
    });
    return true;
  } catch (error) {
    console.error('Error showing notification:', error);
    return false;
  }
}

/**
 * Schedule a notification for a specific time today
 * Note: Browser notifications can't be truly scheduled.
 * This sets up a timeout that will fire at the specified time.
 * The app must be running for this to work.
 * @param {string} time - Time in HH:MM format
 * @param {string} title - Notification title
 * @param {Object} options - Notification options
 * @returns {number|null} Timeout ID or null if scheduling failed
 */
export function scheduleNotificationForToday(time, title, options = {}) {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const scheduledTime = new Date();
  scheduledTime.setHours(hours, minutes, 0, 0);

  // If the time has passed today, don't schedule
  if (scheduledTime <= now) {
    return null;
  }

  const delay = scheduledTime - now;
  const timeoutId = setTimeout(() => {
    showNotification(title, options);
  }, delay);

  return timeoutId;
}

/**
 * Schedule daily text reminder
 * @param {string} time - Time in HH:MM format
 * @returns {number|null} Timeout ID
 */
export function scheduleDailyTextReminder(time) {
  return scheduleNotificationForToday(time, 'Daily Text Reminder', {
    body: "Don't forget to read today's daily text!",
    tag: 'daily-text-reminder',
  });
}

/**
 * Schedule Bible reading reminder
 * @param {string} time - Time in HH:MM format
 * @returns {number|null} Timeout ID
 */
export function scheduleBibleReadingReminder(time) {
  return scheduleNotificationForToday(time, 'Bible Reading Reminder', {
    body: 'Time for your daily Bible reading!',
    tag: 'bible-reading-reminder',
  });
}

/**
 * Schedule meeting reminder (shows the day before)
 * @param {Date} meetingDate - Date of the meeting
 * @returns {number|null} Timeout ID
 */
export function scheduleMeetingReminder(meetingDate) {
  const reminderDate = new Date(meetingDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(18, 0, 0, 0); // 6 PM the day before

  const now = new Date();
  if (reminderDate <= now) {
    return null;
  }

  const delay = reminderDate - now;
  const timeoutId = setTimeout(() => {
    showNotification('Meeting Tomorrow', {
      body: 'Remember to prepare for tomorrow\'s meeting!',
      tag: 'meeting-reminder',
    });
  }, delay);

  return timeoutId;
}

/**
 * Cancel a scheduled notification
 * @param {number} timeoutId - Timeout ID from scheduling
 */
export function cancelScheduledNotification(timeoutId) {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
}

/**
 * Initialize notification reminders based on settings
 * @param {Object} settings - Settings from settingsStore
 * @returns {Object} Object containing timeout IDs
 */
export function initializeReminders(settings) {
  const timeouts = {};

  if (settings.notificationsEnabled && getNotificationPermission() === 'granted') {
    timeouts.dailyText = scheduleDailyTextReminder(settings.dailyTextReminderTime);
    timeouts.bibleReading = scheduleBibleReadingReminder(settings.bibleReadingReminderTime);
  }

  return timeouts;
}
