import { Trash2, Download, Upload, Moon, Sun, Bell, BellOff, Clock, Flame, BookOpen, Heart, Users, Calendar, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import useProgressStore from '../stores/progressStore';
import useSettingsStore from '../stores/settingsStore';
import { useToast } from '../components/Toast';
import { haptics } from '../utils/native';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  initializeReminders
} from '../utils/notifications';
import { NotificationItem, WeeklyNotificationItem } from '../components/settings/NotificationItems';

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      initializeReminders();
      toast.success('Notifications enabled');
    } else {
      toast.error('Permission denied');
    }
  };

  const handleDisableNotifications = () => {
    setNotificationsEnabled(false);
    toast.info('Notifications disabled');
  };

  const handleToggleNotification = (key: any) => {
    toggleNotification(key);
    haptics.light();
  };

  const handleSetNotificationTime = (key: any, time: string) => {
    setNotificationTime(key, time);
  };

  const handleClearData = () => {
    if (confirm('This will clear all data. Continue?')) {
      clearAll();
      toast.success('Data cleared');
      window.location.reload();
    }
  };

  const handleUpdateApp = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    window.location.reload();
    toast.success('Checking for updates...');
  };

  const handleExportData = () => {
    const progressData = localStorage.getItem('jw-progress-storage');
    const settingsData = localStorage.getItem('jw-progress-settings');
    const exportData = {
      progress: progressData ? JSON.parse(progressData) : null,
      settings: settingsData ? JSON.parse(settingsData) : null,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jw-progress-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported');
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.progress && !data.settings) {
          toast.error('Invalid backup file format');
          return;
        }
        if (!confirm('This will replace your current data. Continue?')) return;
        if (data.progress) localStorage.setItem('jw-progress-storage', JSON.stringify(data.progress));
        if (data.settings) localStorage.setItem('jw-progress-settings', JSON.stringify(data.settings));
        toast.success('Data imported successfully! Refreshing...');
        setTimeout(() => window.location.reload(), 1000);
      } catch {
        toast.error('Failed to import data');
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <header className="relative bg-gradient-to-br from-primary via-primary to-blue-700 text-primary-content shadow-lg" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="relative p-6">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm opacity-90 mt-1">Customize your experience</p>
        </div>
      </header>
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-2xl">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg"><Bell className="w-5 h-5" /> Notifications</h2>
            <div className="divider my-2"></div>
            {!notificationSupported ? (
              <div className="alert alert-warning">Notifications not supported.</div>
            ) : notificationPermission === 'denied' ? (
              <div className="alert alert-error">Notifications blocked.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-base-200/50 rounded-xl">
                  <div><p className="font-medium">Enable Reminders</p></div>
                  {notificationsEnabled ? (
                    <button onClick={handleDisableNotifications} className="btn btn-sm btn-outline">Disable</button>
                  ) : (
                    <button onClick={handleEnableNotifications} className="btn btn-sm btn-primary">Enable</button>
                  )}
                </div>
                {notificationsEnabled && (
                  <div className="space-y-2">
                    <NotificationItem icon={BookOpen} label="Daily Text" enabled={notifications?.dailyText?.enabled ?? true} onToggle={() => handleToggleNotification('dailyText')} onTimeChange={(time) => handleSetNotificationTime('dailyText', time)} time={notifications?.dailyText?.time ?? '07:00'} />
                    <NotificationItem icon={Heart} label="Bible Reading" enabled={notifications?.bibleReading?.enabled ?? true} onToggle={() => handleToggleNotification('bibleReading')} onTimeChange={(time) => handleSetNotificationTime('bibleReading', time)} time={notifications?.bibleReading?.time ?? '20:00'} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">Appearance</h2>
            <div className="divider my-2"></div>
            <button onClick={toggleTheme} className="btn btn-outline w-full justify-start">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">Data Management</h2>
            <div className="divider my-2"></div>
            <button onClick={handleExportData} className="btn btn-outline w-full justify-start"><Download className="w-5 h-5" /> Export Data</button>
            <button onClick={handleImportData} className="btn btn-outline w-full justify-start"><Upload className="w-5 h-5" /> Import Data</button>
            <button onClick={handleClearData} className="btn btn-error btn-outline w-full justify-start"><Trash2 className="w-5 h-5" /> Clear All Data</button>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg"><RefreshCw className="w-5 h-5" /> App Updates</h2>
            <div className="divider my-2"></div>
            <button onClick={handleUpdateApp} className="btn btn-primary w-full justify-start"><RefreshCw className="w-5 h-5" /> Check for Updates</button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Settings;
