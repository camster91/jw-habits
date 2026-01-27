import { Trash2, Download, Upload, Moon, Sun, Bell, BellOff, Clock, Flame, BookOpen, Heart, Users, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import useProgressStore from '../stores/progressStore';
import useSettingsStore from '../stores/settingsStore';
import { useToast } from '../components/Toast';
import { haptics } from '../utils/native';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showNotification,
  initializeReminders
} from '../utils/notifications';

// Notification item component
function NotificationItem({ icon: Icon, label, description, enabled, time, onToggle, onTimeChange, color = 'text-primary' }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-base-200 last:border-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`p-2 rounded-lg bg-base-200 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-base-content/60 truncate">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {time !== undefined && enabled && (
          <input
            type="time"
            className="input input-xs input-bordered w-24"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
          />
        )}
        <input
          type="checkbox"
          className="toggle toggle-primary toggle-sm"
          checked={enabled}
          onChange={onToggle}
        />
      </div>
    </div>
  );
}

function Settings() {
  const toast = useToast();
  const { clearAll } = useProgressStore();
  const {
    notificationsEnabled,
    notifications,
    theme,
    setNotificationsEnabled,
    toggleNotification,
    setNotificationTime,
    setTheme,
  } = useSettingsStore();

  const [notificationPermission, setNotificationPermission] = useState(() => getNotificationPermission());
  const [notificationSupported] = useState(() => isNotificationSupported());
  const [showAllNotifications, setShowAllNotifications] = useState(false);

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

    haptics.light();
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);

    if (permission === 'granted') {
      setNotificationsEnabled(true);
      showNotification('Notifications Enabled', {
        body: 'You will now receive reminders for your spiritual activities!',
      });
      initializeReminders({
        notificationsEnabled: true,
        dailyTextReminderTime: notifications?.dailyText?.time || '07:00',
        bibleReadingReminderTime: notifications?.bibleReading?.time || '20:00',
      });
      haptics.success();
    } else if (permission === 'denied') {
      toast.error('Notification permission was denied. Please enable it in your browser settings.');
    }
  };

  const handleDisableNotifications = () => {
    haptics.light();
    setNotificationsEnabled(false);
  };

  const handleToggleNotification = (key) => {
    haptics.light();
    toggleNotification(key);
  };

  const handleSetNotificationTime = (key, time) => {
    setNotificationTime(key, time);
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

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate the data structure
        if (!data.progress && !data.settings) {
          toast.error('Invalid backup file format');
          return;
        }

        // Confirm before importing
        if (!confirm('This will replace your current data. Continue?')) {
          return;
        }

        // Import progress data
        if (data.progress) {
          localStorage.setItem('jw-progress-storage', JSON.stringify(data.progress));
        }

        // Import settings data
        if (data.settings) {
          localStorage.setItem('jw-progress-settings', JSON.stringify(data.settings));
        }

        toast.success('Data imported successfully! Refreshing...');

        // Reload to apply imported data
        setTimeout(() => window.location.reload(), 1000);
      } catch {
        toast.error('Failed to import data. Please check the file format.');
      }
    };
    input.click();
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
                <div className="flex items-center justify-between p-3 bg-base-200/50 rounded-xl">
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
                  <div className="space-y-2">
                    {/* Essential Reminders */}
                    <div className="bg-base-200/30 rounded-xl p-3">
                      <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">Daily Reminders</p>

                      <NotificationItem
                        icon={BookOpen}
                        label="Daily Text"
                        description="Morning reminder to read"
                        enabled={notifications?.dailyText?.enabled ?? true}
                        time={notifications?.dailyText?.time ?? '07:00'}
                        onToggle={() => handleToggleNotification('dailyText')}
                        onTimeChange={(time) => handleSetNotificationTime('dailyText', time)}
                        color="text-primary"
                      />

                      <NotificationItem
                        icon={BookOpen}
                        label="Bible Reading"
                        description="Evening reminder"
                        enabled={notifications?.bibleReading?.enabled ?? true}
                        time={notifications?.bibleReading?.time ?? '20:00'}
                        onToggle={() => handleToggleNotification('bibleReading')}
                        onTimeChange={(time) => handleSetNotificationTime('bibleReading', time)}
                        color="text-secondary"
                      />
                    </div>

                    {/* Prayer Reminders */}
                    <div className="bg-base-200/30 rounded-xl p-3">
                      <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">Prayer Reminders</p>

                      <NotificationItem
                        icon={Heart}
                        label="Morning Prayer"
                        description="Start your day with prayer"
                        enabled={notifications?.morningPrayer?.enabled ?? true}
                        time={notifications?.morningPrayer?.time ?? '06:30'}
                        onToggle={() => handleToggleNotification('morningPrayer')}
                        onTimeChange={(time) => handleSetNotificationTime('morningPrayer', time)}
                        color="text-amber-500"
                      />

                      <NotificationItem
                        icon={Heart}
                        label="Afternoon Prayer"
                        description="Midday reminder"
                        enabled={notifications?.afternoonPrayer?.enabled ?? true}
                        time={notifications?.afternoonPrayer?.time ?? '12:00'}
                        onToggle={() => handleToggleNotification('afternoonPrayer')}
                        onTimeChange={(time) => handleSetNotificationTime('afternoonPrayer', time)}
                        color="text-sky-500"
                      />

                      <NotificationItem
                        icon={Heart}
                        label="Evening Prayer"
                        description="End your day in prayer"
                        enabled={notifications?.eveningPrayer?.enabled ?? true}
                        time={notifications?.eveningPrayer?.time ?? '21:00'}
                        onToggle={() => handleToggleNotification('eveningPrayer')}
                        onTimeChange={(time) => handleSetNotificationTime('eveningPrayer', time)}
                        color="text-indigo-500"
                      />
                    </div>

                    {/* Show More Toggle */}
                    <button
                      onClick={() => {
                        haptics.light();
                        setShowAllNotifications(!showAllNotifications);
                      }}
                      className="btn btn-ghost btn-sm w-full gap-2"
                    >
                      {showAllNotifications ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          More Options
                        </>
                      )}
                    </button>

                    {/* Additional Reminders (collapsed by default) */}
                    {showAllNotifications && (
                      <div className="space-y-2 animate-fade-in-up">
                        {/* Weekly Reminders */}
                        <div className="bg-base-200/30 rounded-xl p-3">
                          <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">Weekly Reminders</p>

                          <NotificationItem
                            icon={Users}
                            label="Family Worship"
                            description="Weekly reminder"
                            enabled={notifications?.familyWorship?.enabled ?? true}
                            time={notifications?.familyWorship?.time ?? '19:00'}
                            onToggle={() => handleToggleNotification('familyWorship')}
                            onTimeChange={(time) => handleSetNotificationTime('familyWorship', time)}
                            color="text-purple-500"
                          />

                          <NotificationItem
                            icon={Calendar}
                            label="Meeting Preparation"
                            description="Day before meeting"
                            enabled={notifications?.meetingPrep?.enabled ?? true}
                            time={notifications?.meetingPrep?.time ?? '19:00'}
                            onToggle={() => handleToggleNotification('meetingPrep')}
                            onTimeChange={(time) => handleSetNotificationTime('meetingPrep', time)}
                            color="text-green-500"
                          />
                        </div>

                        {/* Motivation */}
                        <div className="bg-base-200/30 rounded-xl p-3">
                          <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">Motivation</p>

                          <NotificationItem
                            icon={Flame}
                            label="Keep Your Streak"
                            description="Reminder to maintain streaks"
                            enabled={notifications?.streakMotivation?.enabled ?? true}
                            time={notifications?.streakMotivation?.time ?? '10:00'}
                            onToggle={() => handleToggleNotification('streakMotivation')}
                            onTimeChange={(time) => handleSetNotificationTime('streakMotivation', time)}
                            color="text-orange-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
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

              <button
                onClick={handleImportData}
                className="btn btn-outline w-full justify-start"
              >
                <Upload className="w-5 h-5" />
                Import Progress Data
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
