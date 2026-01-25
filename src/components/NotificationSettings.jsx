/**
 * NotificationSettings Component
 * Allows users to configure push notifications
 */

import { useState } from 'react';
import { Bell, BellOff, Clock, Check } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import { showNotification, scheduleDailyReminder } from '../utils/pwa';
import { haptics } from '../utils/native';

// Load saved reminder settings from localStorage
function loadSavedReminderSettings() {
  const savedTime = localStorage.getItem('dailyReminderTime');
  if (savedTime) {
    try {
      const { hour, minute } = JSON.parse(savedTime);
      return {
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        enabled: true,
      };
    } catch {
      // Ignore parse errors
    }
  }
  return { time: '07:00', enabled: false };
}

function NotificationSettings() {
  const { notificationPermission, requestNotifications, notificationsSupported } = usePWA();
  const savedSettings = loadSavedReminderSettings();
  const [reminderTime, setReminderTime] = useState(savedSettings.time);
  const [reminderEnabled, setReminderEnabled] = useState(savedSettings.enabled);
  const [testSent, setTestSent] = useState(false);

  const handleEnableNotifications = async () => {
    haptics.medium();
    const result = await requestNotifications();
    if (result.granted) {
      haptics.success();
    }
  };

  const handleTestNotification = async () => {
    haptics.light();
    const result = await showNotification('JW Progress Tracker', {
      body: 'Notifications are working! You\'ll receive daily reminders.',
      tag: 'test-notification',
    });
    if (result) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }
  };

  const handleSaveReminder = async () => {
    haptics.medium();
    const [hour, minute] = reminderTime.split(':').map(Number);
    await scheduleDailyReminder(hour, minute);
    setReminderEnabled(true);
    haptics.success();
  };

  const handleDisableReminder = () => {
    haptics.light();
    localStorage.removeItem('dailyReminderTime');
    setReminderEnabled(false);
  };

  if (!notificationsSupported) {
    return (
      <div className="card bg-base-100 shadow-sm rounded-2xl">
        <div className="card-body p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-base-200">
              <BellOff className="w-6 h-6 text-base-content/50" />
            </div>
            <div>
              <h3 className="font-bold">Notifications</h3>
              <p className="text-sm text-base-content/50">
                Not supported in this browser
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-sm rounded-2xl">
      <div className="card-body p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${notificationPermission === 'granted' ? 'bg-success/10' : 'bg-primary/10'}`}>
            <Bell className={`w-6 h-6 ${notificationPermission === 'granted' ? 'text-success' : 'text-primary'}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">Notifications</h3>
            <p className="text-sm text-base-content/50">
              {notificationPermission === 'granted'
                ? 'Enabled'
                : notificationPermission === 'denied'
                ? 'Blocked in browser settings'
                : 'Not enabled'}
            </p>
          </div>
        </div>

        {/* Permission Request */}
        {notificationPermission !== 'granted' && notificationPermission !== 'denied' && (
          <button
            onClick={handleEnableNotifications}
            className="btn btn-primary w-full gap-2"
          >
            <Bell className="w-5 h-5" />
            Enable Notifications
          </button>
        )}

        {notificationPermission === 'denied' && (
          <div className="alert alert-warning">
            <BellOff className="w-5 h-5" />
            <span className="text-sm">
              Notifications are blocked. Please enable them in your browser settings.
            </span>
          </div>
        )}

        {/* Notification Settings (when enabled) */}
        {notificationPermission === 'granted' && (
          <>
            {/* Test Notification */}
            <button
              onClick={handleTestNotification}
              className={`btn w-full gap-2 ${testSent ? 'btn-success' : 'btn-outline'}`}
              disabled={testSent}
            >
              {testSent ? (
                <>
                  <Check className="w-5 h-5" />
                  Test Sent!
                </>
              ) : (
                <>
                  <Bell className="w-5 h-5" />
                  Send Test Notification
                </>
              )}
            </button>

            {/* Daily Reminder */}
            <div className="divider text-xs text-base-content/50">Daily Reminder</div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-base-content/50" />
                <span className="text-sm font-medium flex-1">Remind me at:</span>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="input input-bordered input-sm w-28"
                />
              </div>

              <p className="text-xs text-base-content/50">
                Get a daily reminder to read your Daily Text and Bible reading.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveReminder}
                  className="btn btn-primary btn-sm flex-1 gap-1"
                >
                  <Check className="w-4 h-4" />
                  {reminderEnabled ? 'Update' : 'Enable'} Reminder
                </button>
                {reminderEnabled && (
                  <button
                    onClick={handleDisableReminder}
                    className="btn btn-ghost btn-sm"
                  >
                    Disable
                  </button>
                )}
              </div>

              {reminderEnabled && (
                <div className="flex items-center gap-2 text-success text-sm">
                  <Check className="w-4 h-4" />
                  <span>Daily reminder set for {reminderTime}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default NotificationSettings;
