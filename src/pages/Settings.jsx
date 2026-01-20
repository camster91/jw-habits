import { Trash2, Download, Moon, Sun, Bell, BellOff, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import useProgressStore from '../stores/progressStore';
import useSettingsStore from '../stores/settingsStore';
import { useToast } from '../components/Toast';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showNotification,
  initializeReminders
} from '../utils/notifications';

function Settings() {
  const toast = useToast();
  const { clearAll } = useProgressStore();
  const {
    notificationsEnabled,
    dailyTextReminderTime,
    bibleReadingReminderTime,
    meetingReminderEnabled,
    theme,
    setNotificationsEnabled,
    setDailyTextReminderTime,
    setBibleReadingReminderTime,
    setMeetingReminderEnabled,
    setTheme,
  } = useSettingsStore();

  const [notificationPermission, setNotificationPermission] = useState(() => getNotificationPermission());
  const [notificationSupported] = useState(() => isNotificationSupported());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const handleEnableNotifications = async () => {
    if (!notificationSupported) {
      toast.warning('Notifications are not supported in this browser.');
      return;
    }

    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);

    if (permission === 'granted') {
      setNotificationsEnabled(true);
      showNotification('Notifications Enabled', {
        body: 'You will now receive reminders for your spiritual activities!',
      });
      initializeReminders({
        notificationsEnabled: true,
        dailyTextReminderTime,
        bibleReadingReminderTime,
      });
    } else if (permission === 'denied') {
      toast.error('Notification permission was denied. Please enable it in your browser settings.');
    }
  };

  const handleDisableNotifications = () => {
    setNotificationsEnabled(false);
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all progress data? This cannot be undone.')) {
      clearAll();
      toast.success('All data has been cleared successfully.');
    }
  };

  const handleExportData = () => {
    const progressData = localStorage.getItem('jw-progress-storage');
    const settingsData = localStorage.getItem('jw-progress-settings');
    const exportData = {
      progress: progressData ? JSON.parse(progressData) : null,
      settings: settingsData ? JSON.parse(settingsData) : null,
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jw-progress-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-content p-6 shadow-lg">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm opacity-90 mt-1">Customize your experience</p>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-2xl">
        {/* Notifications */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">
              <Bell className="w-5 h-5" />
              Notifications
            </h2>

            <div className="divider my-2"></div>

            {!notificationSupported ? (
              <div className="alert alert-warning">
                <BellOff className="w-5 h-5" />
                <span className="text-sm">Notifications are not supported in this browser.</span>
              </div>
            ) : notificationPermission === 'denied' ? (
              <div className="alert alert-error">
                <BellOff className="w-5 h-5" />
                <span className="text-sm">
                  Notifications are blocked. Please enable them in your browser settings.
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Enable/Disable Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable Reminders</p>
                    <p className="text-sm text-base-content/70">
                      Get reminders for daily activities
                    </p>
                  </div>
                  {notificationsEnabled ? (
                    <button
                      onClick={handleDisableNotifications}
                      className="btn btn-sm btn-outline"
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      onClick={handleEnableNotifications}
                      className="btn btn-sm btn-primary"
                    >
                      Enable
                    </button>
                  )}
                </div>

                {notificationsEnabled && (
                  <>
                    {/* Daily Text Reminder Time */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-base-content/60" />
                        <div>
                          <p className="font-medium text-sm">Daily Text Reminder</p>
                          <p className="text-xs text-base-content/70">Morning reminder</p>
                        </div>
                      </div>
                      <input
                        type="time"
                        className="input input-sm input-bordered w-28"
                        value={dailyTextReminderTime}
                        onChange={(e) => setDailyTextReminderTime(e.target.value)}
                      />
                    </div>

                    {/* Bible Reading Reminder Time */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-base-content/60" />
                        <div>
                          <p className="font-medium text-sm">Bible Reading Reminder</p>
                          <p className="text-xs text-base-content/70">Evening reminder</p>
                        </div>
                      </div>
                      <input
                        type="time"
                        className="input input-sm input-bordered w-28"
                        value={bibleReadingReminderTime}
                        onChange={(e) => setBibleReadingReminderTime(e.target.value)}
                      />
                    </div>

                    {/* Meeting Reminder */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Meeting Reminder</p>
                        <p className="text-xs text-base-content/70">Day before meeting</p>
                      </div>
                      <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={meetingReminderEnabled}
                        onChange={(e) => setMeetingReminderEnabled(e.target.checked)}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Appearance */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">Appearance</h2>

            <div className="divider my-2"></div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'light' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-base-content/70">
                    {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={theme === 'dark'}
                onChange={toggleTheme}
              />
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">Data Management</h2>

            <div className="divider my-2"></div>

            <div className="space-y-3">
              <button
                onClick={handleExportData}
                className="btn btn-outline w-full justify-start"
              >
                <Download className="w-5 h-5" />
                Export Progress Data
              </button>

              <div className="alert alert-warning">
                <span className="text-sm">
                  All your progress is stored locally on this device. Export regularly to backup your data.
                </span>
              </div>

              <button
                onClick={handleClearData}
                className="btn btn-error btn-outline w-full justify-start"
              >
                <Trash2 className="w-5 h-5" />
                Clear All Data
              </button>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">About</h2>

            <div className="divider my-2"></div>

            <div className="space-y-2 text-sm">
              <p><strong>Version:</strong> 2.0.0</p>
              <p><strong>Build:</strong> PWA (Progressive Web App)</p>
              <p className="text-base-content/70">
                This app helps you track your daily spiritual routine including
                daily text, Bible reading, and meeting preparation. Links open
                directly in JW Library app.
              </p>

              <div className="alert alert-info mt-4">
                <span className="text-sm">
                  Install this app to your home screen for quick access!
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <p className="text-xs text-base-content/60 text-center">
              This is an unofficial app and is not affiliated with or endorsed by
              Jehovah's Witnesses or the Watchtower Bible and Tract Society.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
