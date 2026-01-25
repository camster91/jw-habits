/**
 * Native Notifications Utilities
 * Handles local and push notifications using Capacitor plugins
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

const isNative = Capacitor.isNativePlatform();

/**
 * Check if local notifications are available
 */
export const isLocalNotificationAvailable = () => {
  return isNative;
};

/**
 * Request local notification permissions
 */
export const requestLocalNotificationPermission = async () => {
  if (!isNative) {
    return { granted: false, reason: 'not-native' };
  }

  try {
    const result = await LocalNotifications.requestPermissions();
    return {
      granted: result.display === 'granted',
      result,
    };
  } catch (error) {
    console.error('Error requesting local notification permission:', error);
    return { granted: false, error };
  }
};

/**
 * Schedule a local notification
 */
export const scheduleLocalNotification = async ({
  id,
  title,
  body,
  schedule,
  extra = {},
}) => {
  if (!isNative) {
    console.warn('Local notifications not available on web');
    return null;
  }

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          schedule,
          sound: 'beep.wav',
          extra,
          actionTypeId: '',
          attachments: [],
        },
      ],
    });
    return { success: true, id };
  } catch (error) {
    console.error('Error scheduling local notification:', error);
    return { success: false, error };
  }
};

/**
 * Schedule daily text reminder
 */
export const scheduleDailyTextReminder = async (hour = 7, minute = 0) => {
  return scheduleLocalNotification({
    id: 1001,
    title: 'Daily Text Reminder',
    body: "Don't forget to read today's daily text!",
    schedule: {
      on: {
        hour,
        minute,
      },
      repeats: true,
    },
    extra: { type: 'daily-text' },
  });
};

/**
 * Schedule Bible reading reminder
 */
export const scheduleBibleReadingReminder = async (hour = 19, minute = 0) => {
  return scheduleLocalNotification({
    id: 1002,
    title: 'Bible Reading Reminder',
    body: 'Time for your daily Bible reading!',
    schedule: {
      on: {
        hour,
        minute,
      },
      repeats: true,
    },
    extra: { type: 'bible-reading' },
  });
};

/**
 * Schedule meeting reminder (day before at 6 PM)
 */
export const scheduleMeetingReminder = async (meetingDate) => {
  const reminderDate = new Date(meetingDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(18, 0, 0, 0);

  if (reminderDate <= new Date()) {
    return null;
  }

  return scheduleLocalNotification({
    id: Math.floor(Date.now() / 1000), // Unique ID based on timestamp
    title: 'Meeting Tomorrow',
    body: "Remember to prepare for tomorrow's meeting!",
    schedule: {
      at: reminderDate,
    },
    extra: { type: 'meeting' },
  });
};

/**
 * Cancel a specific notification
 */
export const cancelNotification = async (id) => {
  if (!isNative) return false;

  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
    return true;
  } catch (error) {
    console.error('Error canceling notification:', error);
    return false;
  }
};

/**
 * Cancel all notifications
 */
export const cancelAllNotifications = async () => {
  if (!isNative) return false;

  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }
    return true;
  } catch (error) {
    console.error('Error canceling all notifications:', error);
    return false;
  }
};

/**
 * Get all pending notifications
 */
export const getPendingNotifications = async () => {
  if (!isNative) return [];

  try {
    const result = await LocalNotifications.getPending();
    return result.notifications;
  } catch (error) {
    console.error('Error getting pending notifications:', error);
    return [];
  }
};

/**
 * Add notification received listener
 */
export const addNotificationReceivedListener = (callback) => {
  if (!isNative) return () => {};

  const listener = LocalNotifications.addListener(
    'localNotificationReceived',
    callback
  );
  return () => listener.then((l) => l.remove());
};

/**
 * Add notification action listener (when user taps notification)
 */
export const addNotificationActionListener = (callback) => {
  if (!isNative) return () => {};

  const listener = LocalNotifications.addListener(
    'localNotificationActionPerformed',
    callback
  );
  return () => listener.then((l) => l.remove());
};

// ============ Push Notifications ============

/**
 * Check if push notifications are available
 */
export const isPushNotificationAvailable = () => {
  return isNative;
};

/**
 * Request push notification permissions
 */
export const requestPushNotificationPermission = async () => {
  if (!isNative) {
    return { granted: false, reason: 'not-native' };
  }

  try {
    const result = await PushNotifications.requestPermissions();
    if (result.receive === 'granted') {
      await PushNotifications.register();
    }
    return {
      granted: result.receive === 'granted',
      result,
    };
  } catch (error) {
    console.error('Error requesting push notification permission:', error);
    return { granted: false, error };
  }
};

/**
 * Add push notification registration listener
 */
export const addPushRegistrationListener = (callback) => {
  if (!isNative) return () => {};

  const listener = PushNotifications.addListener('registration', callback);
  return () => listener.then((l) => l.remove());
};

/**
 * Add push notification registration error listener
 */
export const addPushRegistrationErrorListener = (callback) => {
  if (!isNative) return () => {};

  const listener = PushNotifications.addListener('registrationError', callback);
  return () => listener.then((l) => l.remove());
};

/**
 * Add push notification received listener
 */
export const addPushReceivedListener = (callback) => {
  if (!isNative) return () => {};

  const listener = PushNotifications.addListener(
    'pushNotificationReceived',
    callback
  );
  return () => listener.then((l) => l.remove());
};

/**
 * Add push notification action listener (when user taps)
 */
export const addPushActionListener = (callback) => {
  if (!isNative) return () => {};

  const listener = PushNotifications.addListener(
    'pushNotificationActionPerformed',
    callback
  );
  return () => listener.then((l) => l.remove());
};

/**
 * Initialize all notification listeners
 */
export const initializeNotificationListeners = (handlers = {}) => {
  const cleanups = [];

  if (handlers.onLocalReceived) {
    cleanups.push(addNotificationReceivedListener(handlers.onLocalReceived));
  }

  if (handlers.onLocalAction) {
    cleanups.push(addNotificationActionListener(handlers.onLocalAction));
  }

  if (handlers.onPushRegistration) {
    cleanups.push(addPushRegistrationListener(handlers.onPushRegistration));
  }

  if (handlers.onPushRegistrationError) {
    cleanups.push(addPushRegistrationErrorListener(handlers.onPushRegistrationError));
  }

  if (handlers.onPushReceived) {
    cleanups.push(addPushReceivedListener(handlers.onPushReceived));
  }

  if (handlers.onPushAction) {
    cleanups.push(addPushActionListener(handlers.onPushAction));
  }

  return () => cleanups.forEach((cleanup) => cleanup());
};

export default {
  isLocalNotificationAvailable,
  requestLocalNotificationPermission,
  scheduleLocalNotification,
  scheduleDailyTextReminder,
  scheduleBibleReadingReminder,
  scheduleMeetingReminder,
  cancelNotification,
  cancelAllNotifications,
  getPendingNotifications,
  addNotificationReceivedListener,
  addNotificationActionListener,
  isPushNotificationAvailable,
  requestPushNotificationPermission,
  addPushRegistrationListener,
  addPushRegistrationErrorListener,
  addPushReceivedListener,
  addPushActionListener,
  initializeNotificationListeners,
};
