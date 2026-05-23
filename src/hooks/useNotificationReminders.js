/**
 * useNotificationReminders Hook
 * Schedules native local notifications on Capacitor, web notifications on PWA.
 * Re-schedules whenever notification settings change.
 */

import { useEffect, useRef } from 'react';
import useSettingsStore from '../stores/settingsStore';
import {
  requestNotificationPermission,
  initializeReminders,
  cancelAllNotifications,
} from '../utils/notifications';

export default function useNotificationReminders() {
  const cancelHandles = useRef([]);
  const { notificationsEnabled, notifications } = useSettingsStore();

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      // Cancel any previously scheduled reminders
      cancelHandles.current.forEach((h) => {
        if (h && typeof h.cancel === 'function') h.cancel();
      });
      cancelHandles.current = [];
      await cancelAllNotifications();

      // Schedule new reminders if notifications are enabled
      if (notificationsEnabled) {
        const perm = await requestNotificationPermission();
        if (perm === 'granted' && !cancelled) {
          const handles = await initializeReminders({ notificationsEnabled, notifications });
          cancelHandles.current = handles;
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
      cancelHandles.current.forEach((h) => {
        if (h && typeof h.cancel === 'function') h.cancel();
      });
      cancelHandles.current = [];
      cancelAllNotifications();
    };
  }, [notificationsEnabled, notifications]);
}