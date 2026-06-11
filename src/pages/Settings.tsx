import { useTranslation } from 'react-i18next';
import { Trash2, Download, Upload, Moon, Sun, Bell, BellOff, Clock, Flame, BookOpen, Heart, Users, Calendar, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, X, Bot, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import useProgressStore from '../stores/progressStore.js';
import useSettingsStore, { type Notifications } from '../stores/settingsStore.js';
import { useToast } from '../components/Toast.jsx';
import { haptics } from '../utils/native.js';
import PageHeader from '../components/PageHeader.jsx';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  initializeReminders
} from '../utils/notifications.js';
import { NotificationItem, WeeklyNotificationItem } from '../components/settings/NotificationItems.js';

function Settings() {
  const { t } = useTranslation();
  const toast = useToast();
  const { clearAll } = useProgressStore();
  // Data fields are pulled via a single destructure for readability, but
  // action functions are read via stable selectors. The full-destructure
  // pattern can drop action functions if zustand's persist middleware
  // rehydrates a state shape that doesn't include them (e.g. on first
  // mount before hydration finishes, or after a partial-state merge),
  // and the destructure binds them as `undefined` for that render. A
  // selector re-reads the function on every render, so rehydration
  // can't break it. See Onboarding.jsx for the same pattern.
  const {
    notificationsEnabled,
    notifications,
    theme,
    ai,
    setNotificationsEnabled,
    toggleNotification,
    setNotificationTime,
    setTheme,
    setAiSettings,
  } = useSettingsStore();
  const setUserName = useSettingsStore((s) => s.setUserName);
  const userName = useSettingsStore((s) => s.userName);

  const [showApiKey, setShowApiKey] = useState(false);
  const [aiTestStatus, setAiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

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
      const settings = useSettingsStore.getState();
      initializeReminders(settings);
      toast.success(t("settings.notificationsEnabled"));
    } else {
      toast.error(t("settings.permissionDenied"));
    }
  };

  const handleDisableNotifications = () => {
    setNotificationsEnabled(false);
    toast.info(t("settings.notificationsDisabled"));
  };

  const handleToggleNotification = (key: string) => {
    toggleNotification(key as keyof Notifications);
    haptics.light();
    // Re-schedule after toggle
    setTimeout(() => initializeReminders(useSettingsStore.getState()), 50);
  };

  const handleSetNotificationTime = (key: string, time: string) => {
    setNotificationTime(key as keyof Notifications, time);
    // Re-schedule after time change
    setTimeout(() => initializeReminders(useSettingsStore.getState()), 50);
  };

  const handleClearData = () => {
    if (confirm(t("settings.clearConfirm"))) {
      clearAll();
      toast.success(t("settings.dataCleared"));
      window.location.reload();
    }
  };

  const handleUpdateApp = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    window.location.reload();
    toast.success(t("settings.checkingUpdates"));
  };

  const handleTestAi = async () => {
    setAiTestStatus('testing');
    try {
      const { chatWithOllama } = await import('../utils/ollama.js');
      const baseUrl = ai.ollamaBaseUrl || 'https://ollama.com';
      const apiKey = ai.ollamaApiKey;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: ai.ollamaModel || 'llama3.2',
          messages: [{ role: 'user', content: 'Say "OK" in one word.' }],
          stream: false,
        }),
      });

      if (response.ok) {
        setAiTestStatus('success');
        toast.success(t("settings.aiSuccess"));
      } else {
        const err = await response.text();
        setAiTestStatus('error');
        toast.error(t("settings.aiError", { status: response.status }));
        console.error('Ollama test failed:', err);
      }
    } catch (error) {
      setAiTestStatus('error');
      toast.error(t("settings.aiFailed"));
      console.error('Ollama test error:', error);
    }
  };

  const STORAGE_KEYS = [
    'jw-progress-storage',
    'jw-progress-settings',
    'jw-gamification-storage',
    'jw-goals-storage',
    'jw-memories-storage',
    'jw-news-store',
  ];

  const handleExportData = () => {
    const storeData: Record<string, unknown> = {};
    STORAGE_KEYS.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (raw) storeData[key] = JSON.parse(raw);
    });
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: storeData,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jw-habits-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("settings.dataExported"));
  };

  const [importModal, setImportModal] = useState<{ data: any; isOldFormat: boolean; versionMismatch: boolean } | null>(null);
  const pendingImportData = useRef<any>(null);

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        // Detect versioned format (version + data wrapper)
        let isOldFormat = false;
        let versionMismatch = false;
        let storeData = parsed;

        if (parsed.version !== undefined && parsed.data !== undefined) {
          // New versioned format
          if (parsed.version !== 1) {
            versionMismatch = true;
          }
          storeData = parsed.data;
        } else {
          // Legacy format: raw store keys at top level
          isOldFormat = !!(parsed.progress || parsed.settings);
        }

        const hasKnownKeys = STORAGE_KEYS.some((key) => key in storeData);
        if (!isOldFormat && !hasKnownKeys) {
          toast.error(t("settings.invalidFormat"));
          return;
        }

        // Store parsed data and show confirmation modal
        pendingImportData.current = { storeData, isOldFormat, versionMismatch };
        setImportModal({ data: parsed, isOldFormat, versionMismatch });
      } catch {
        toast.error(t("settings.importFailed"));
      }
    };
    input.click();
  };

  const confirmImport = () => {
    if (!pendingImportData.current) return;
    const { storeData, isOldFormat } = pendingImportData.current;

    if (STORAGE_KEYS.some((key) => key in storeData)) {
      STORAGE_KEYS.forEach((key) => {
        if (storeData[key]) localStorage.setItem(key, JSON.stringify(storeData[key]));
      });
    } else if (isOldFormat) {
      // Legacy format support
      if (storeData.progress) localStorage.setItem('jw-progress-storage', JSON.stringify(storeData.progress));
      if (storeData.settings) localStorage.setItem('jw-progress-settings', JSON.stringify(storeData.settings));
    }

    setImportModal(null);
    pendingImportData.current = null;
    toast.success(t("settings.importSuccess"));
    setTimeout(() => window.location.reload(), 1000);
  };

  const cancelImport = () => {
    setImportModal(null);
    pendingImportData.current = null;
    toast.info(t("settings.importCancelled"));
  };

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        shadow
        noBlurs
      />
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-2xl">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg"><Bell className="w-5 h-5" /> {t("settings.notifications")}</h2>
            <div className="divider my-2"></div>
            {!notificationSupported ? (
              <div className="alert alert-warning">{t("settings.notSupported")}</div>
            ) : notificationPermission === 'denied' ? (
              <div className="alert alert-error">{t("settings.blocked")}</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-base-200/50 rounded-xl">
                  <div><p className="font-medium">{t("settings.enableReminders")}</p></div>
                  {notificationsEnabled ? (
                    <button onClick={handleDisableNotifications} className="btn btn-sm btn-outline">{t("settings.disable")}</button>
                  ) : (
                    <button onClick={handleEnableNotifications} className="btn btn-sm btn-primary">{t("settings.enable")}</button>
                  )}
                </div>
                {notificationsEnabled && (
                  <div className="space-y-2">
                    {/* Daily notifications */}
                    <NotificationItem icon={BookOpen} label={notifications?.dailyText?.label ?? t("settings.dailyText")} description="Read today's scripture text" enabled={notifications?.dailyText?.enabled ?? true} onToggle={() => handleToggleNotification('dailyText')} onTimeChange={(time) => handleSetNotificationTime('dailyText', time)} time={notifications?.dailyText?.time ?? '07:00'} color="text-primary" />
                    <NotificationItem icon={Heart} label={notifications?.bibleReading?.label ?? t("settings.bibleReading")} description="Daily Bible reading reminder" enabled={notifications?.bibleReading?.enabled ?? true} onToggle={() => handleToggleNotification('bibleReading')} onTimeChange={(time) => handleSetNotificationTime('bibleReading', time)} time={notifications?.bibleReading?.time ?? '20:00'} color="text-accent" />
                    <NotificationItem icon={Flame} label={notifications?.streakMotivation?.label ?? "Keep Your Streak"} description="Stay consistent with your habits" enabled={notifications?.streakMotivation?.enabled ?? true} onToggle={() => handleToggleNotification('streakMotivation')} onTimeChange={(time) => handleSetNotificationTime('streakMotivation', time)} time={notifications?.streakMotivation?.time ?? '10:00'} color="text-warning" />

                    {/* Prayer notifications */}
                    <div className="pt-2">
                      <p className="text-xs font-semibold text-base-content/70 uppercase tracking-wider px-1 mb-1">Prayer Reminders</p>
                      <NotificationItem icon={Heart} label={notifications?.morningPrayer?.label ?? t("settings.morningPrayer")} enabled={notifications?.morningPrayer?.enabled ?? true} onToggle={() => handleToggleNotification('morningPrayer')} onTimeChange={(time) => handleSetNotificationTime('morningPrayer', time)} time={notifications?.morningPrayer?.time ?? '06:30'} color="text-info" />
                      <NotificationItem icon={Heart} label={notifications?.afternoonPrayer?.label ?? t("settings.afternoonPrayer")} enabled={notifications?.afternoonPrayer?.enabled ?? true} onToggle={() => handleToggleNotification('afternoonPrayer')} onTimeChange={(time) => handleSetNotificationTime('afternoonPrayer', time)} time={notifications?.afternoonPrayer?.time ?? '12:00'} color="text-info" />
                      <NotificationItem icon={Heart} label={notifications?.eveningPrayer?.label ?? t("settings.eveningPrayer")} enabled={notifications?.eveningPrayer?.enabled ?? true} onToggle={() => handleToggleNotification('eveningPrayer')} onTimeChange={(time) => handleSetNotificationTime('eveningPrayer', time)} time={notifications?.eveningPrayer?.time ?? '21:00'} color="text-info" />
                    </div>

                    {/* Weekly notifications */}
                    <div className="pt-2">
                      <p className="text-xs font-semibold text-base-content/70 uppercase tracking-wider px-1 mb-1">Weekly Reminders</p>
                      <WeeklyNotificationItem
                        icon={Calendar}
                        label={notifications?.meetingPrep?.label ?? "Meeting Preparation"}
                        description="Remind the day before midweek and weekend meetings"
                        enabled={notifications?.meetingPrep?.enabled ?? true}
                        onToggle={() => handleToggleNotification('meetingPrep')}
                        onTimeChange={(time) => handleSetNotificationTime('meetingPrep', time)}
                        time={notifications?.meetingPrep?.time ?? '19:00'}
                        meetingDays={notifications?.meetingPrep?.meetingDays ?? [4, 0]}
                        onMeetingDaysChange={(days) => {
                          const store = useSettingsStore.getState();
                          store.updateNotification('meetingPrep', { meetingDays: days });
                          initializeReminders(useSettingsStore.getState());
                        }}
                        color="text-secondary"
                        isMeetingPrep
                      />
                      <WeeklyNotificationItem
                        icon={Users}
                        label={notifications?.familyWorship?.label ?? "Family Worship"}
                        description="Weekly family worship reminder"
                        enabled={notifications?.familyWorship?.enabled ?? true}
                        onToggle={() => handleToggleNotification('familyWorship')}
                        onTimeChange={(time) => handleSetNotificationTime('familyWorship', time)}
                        time={notifications?.familyWorship?.time ?? '19:00'}
                        dayOfWeek={notifications?.familyWorship?.dayOfWeek ?? 1}
                        onDayChange={(day) => {
                          const store = useSettingsStore.getState();
                          store.updateNotification('familyWorship', { dayOfWeek: day });
                          initializeReminders(useSettingsStore.getState());
                        }}
                        color="text-error"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">{t("settings.appearance")}</h2>
            <div className="divider my-2"></div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Your name</span>
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value.slice(0, 30))}
                placeholder="Your first name"
                className="input input-bordered w-full"
                maxLength={30}
                autoComplete="given-name"
              />
              <p className="text-xs text-base-content/70 mt-1">Used in the home greeting. Stored on this device only.</p>
            </div>
            <div className="divider my-2"></div>
            <button onClick={toggleTheme} className="btn btn-outline w-full justify-start">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              {theme === 'light' ? t("settings.darkMode") : t("settings.lightMode")}
            </button>
          </div>
        </div>

        {/* Help & Tour — re-open the onboarding intro for users who skipped or want a refresher */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">
              <BookOpen className="w-5 h-5" /> {t("settings.help", "Help & Tour")}
            </h2>
            <div className="divider my-2"></div>
            <p className="text-sm text-base-content/70 mb-3">
              {t("settings.helpDesc", "Take the quick tour again or read the about page for the full story.")}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  haptics.light();
                  window.dispatchEvent(new CustomEvent('jw-habits:reopen-onboarding'));
                }}
                className="btn btn-outline w-full justify-start"
              >
                <RefreshCw className="w-5 h-5" /> {t("settings.replayTour", "Replay intro tour")}
              </button>
              <a
                href="/about"
                className="btn btn-outline w-full justify-start"
              >
                <BookOpen className="w-5 h-5" /> {t("settings.aboutApp", "About this app")}
              </a>
            </div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">{t("settings.dataManagement")}</h2>
            <div className="divider my-2"></div>
            <button onClick={handleExportData} className="btn btn-outline w-full justify-start"><Download className="w-5 h-5" /> {t("settings.exportData")}</button>
            <button onClick={handleImportData} className="btn btn-outline w-full justify-start"><Upload className="w-5 h-5" /> {t("settings.importData")}</button>
            <button onClick={handleClearData} className="btn btn-error btn-outline w-full justify-start"><Trash2 className="w-5 h-5" /> {t("settings.clearAllData")}</button>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg"><Bot className="w-5 h-5" /> {t("settings.aiAssistant")}</h2>
            <div className="divider my-2"></div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-base-200/50 rounded-xl">
                <div><p className="font-medium">{t("settings.aiProvider")}</p></div>
                <select
                  className="select select-sm select-bordered"
                  value={ai.provider}
                  onChange={(e) => setAiSettings({ provider: e.target.value as 'ollama' | 'none' })}
                >
                  <option value="none">{t("settings.disabled")}</option>
                  <option value="ollama">{t("settings.ollama")}</option>
                </select>
              </div>
              {ai.provider === 'ollama' && (
                <>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-base-content/70">{t("settings.baseUrl")}</label>
                    <input
                      type="text"
                      className="input input-bordered input-sm w-full"
                      value={ai.ollamaBaseUrl}
                      onChange={(e) => setAiSettings({ ollamaBaseUrl: e.target.value })}
                      placeholder="https://ollama.com or http://localhost:11434"
                    />
                    <p className="text-xs text-base-content/70">Cloud: ollama.com | Local: localhost:11434</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-base-content/70">{t("settings.apiKey")}</label>
                    <div className="flex gap-2">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        className="input input-bordered input-sm flex-1"
                        value={ai.ollamaApiKey}
                        onChange={(e) => setAiSettings({ ollamaApiKey: e.target.value })}
                        placeholder="Ollama Cloud API key (not needed for local)"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="btn btn-sm btn-ghost"
                        aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-base-content/70">Get key at ollama.com (account settings)</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-base-content/70">{t("settings.model")}</label>
                    <input
                      type="text"
                      className="input input-bordered input-sm w-full"
                      value={ai.ollamaModel}
                      onChange={(e) => setAiSettings({ ollamaModel: e.target.value })}
                      placeholder="llama3.2, mistral-small3.1, deepseek-r1, etc."
                    />
                    <p className="text-xs text-base-content/70">Cloud models: llama3.2, llama3.3, mistral-small3.1, qwen3, gemma3, phi4, deepseek-r1</p>
                  </div>
                  <button
                    onClick={handleTestAi}
                    disabled={aiTestStatus === 'testing'}
                    className="btn btn-outline btn-sm w-full gap-2"
                  >
                    {aiTestStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {aiTestStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-success" />}
                    {aiTestStatus === 'error' && <XCircle className="w-4 h-4 text-error" />}
                    {t("settings.testConnection")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg"><RefreshCw className="w-5 h-5" /> {t("settings.appUpdates")}</h2>
            <div className="divider my-2"></div>
            <button onClick={handleUpdateApp} className="btn btn-primary w-full justify-start"><RefreshCw className="w-5 h-5" /> {t("settings.checkForUpdates")}</button>
          </div>
        </div>
      </div>

      {/* Import Confirmation Modal */}
      {importModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card bg-base-100 shadow-2xl w-full max-w-md">
            <div className="card-body">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  {t("settings.importTitle")}
                </h2>
                <button onClick={cancelImport} className="btn btn-ghost btn-sm btn-circle" aria-label="Cancel import">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="divider my-1"></div>
              {importModal.versionMismatch && (
                <div className="alert alert-warning mb-3">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm">{t("settings.versionMismatch")}</span>
                </div>
              )}
              {importModal.isOldFormat && (
                <div className="alert alert-info mb-3">
                  <span className="text-sm">{t("settings.oldFormat")}</span>
                </div>
              )}
              <p className="text-base-content/70 mb-4">
                {t("settings.importWarning")}
              </p>
              {importModal.data.exportedAt && (
                <p className="text-xs text-base-content/70 mb-4">
                  {t("settings.backupCreated", { date: new Date(importModal.data.exportedAt).toLocaleString() })}
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <button onClick={cancelImport} className="btn btn-ghost btn-sm">{t("settings.cancel")}</button>
                <button onClick={confirmImport} className="btn btn-error btn-outline">{t("settings.replaceData")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Settings;
