/**
 * useNotificationReminders Hook
 * Schedules browser notification reminders based on settingsStore configuration.
 * Re-schedules whenever notification settings change.
 */

import { useEffect, useRef } from 'react';
import useSettingsStore from '../stores/settingsStore';
import {
  isNotificationSupported,
  getNotificationPermission,
  initializeReminders,
  cancelScheduledNotification,
} from '../utils/notifications';

export default function useNotificationReminders() {
  const scheduledTimeouts = useRef({});

  const { notificationsEnabled, notifications } = useSettingsStore();

  useEffect(() => {
    // Cancel any previously scheduled reminders
    Object.values(scheduledTimeouts.current).forEach((id) => {
      if (id != null) cancelScheduledNotification(id);
    });
    scheduledTimeouts.current = {};

    // Schedule new reminders if notifications are enabled and permission granted
    if (
      notificationsEnabled &&
      isNotificationSupported() &&
      getNotificationPermission() === 'granted'
    ) {
      const timeouts = initializeReminders({ notificationsEnabled, notifications });
      scheduledTimeouts.current = timeouts;
    }

    // Cleanup on unmount or before next effect run
    return () => {
      Object.values(scheduledTimeouts.current).forEach((id) => {
        if (id != null) cancelScheduledNotification(id);
      });
      scheduledTimeouts.current = {};
    };
  }, [notificationsEnabled, notifications]);
}