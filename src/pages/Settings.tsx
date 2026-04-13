import { Trash2, Download, Upload, Moon, Sun, Bell, BellOff, Clock, Flame, BookOpen, Heart, Users, Calendar, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, X, Bot, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import useProgressStore from '../stores/progressStore';
import useSettingsStore from '../stores/settingsStore';
import { useToast } from '../components/Toast';
import { haptics } from '../utils/native';
import PageHeader from '../components/PageHeader';
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
    ai,
    setNotificationsEnabled,
    toggleNotification,
    setNotificationTime,
    setTheme,
    setAiSettings,
  } = useSettingsStore();

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
      toast.success('Notifications enabled');
    } else {
      toast.error('Permission denied');
    }
  };

  const handleDisableNotifications = () => {
    setNotificationsEnabled(false);
    toast.info('Notifications disabled');
  };

  const handleToggleNotification = (key: string) => {
    toggleNotification(key);
    haptics.light();
  };

  const handleSetNotificationTime = (key: string, time: string) => {
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

  const handleTestAi = async () => {
    setAiTestStatus('testing');
    try {
      const { chatWithOllama } = await import('../utils/ollama');
      const baseUrl = ai.ollamaBaseUrl || 'https://ollama.com';
      const apiKey = ai.ollamaApiKey;
      const headers = { 'Content-Type': 'application/json' };
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
        toast.success('AI connection successful');
      } else {
        const err = await response.text();
        setAiTestStatus('error');
        toast.error(`AI error: ${response.status}`);
        console.error('Ollama test failed:', err);
      }
    } catch (error) {
      setAiTestStatus('error');
      toast.error('AI connection failed');
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
    toast.success('Data exported');
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
          toast.error('Invalid backup file format');
          return;
        }

        // Store parsed data and show confirmation modal
        pendingImportData.current = { storeData, isOldFormat, versionMismatch };
        setImportModal({ data: parsed, isOldFormat, versionMismatch });
      } catch {
        toast.error('Failed to import data');
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
    toast.success('Data imported successfully! Refreshing...');
    setTimeout(() => window.location.reload(), 1000);
  };

  const cancelImport = () => {
    setImportModal(null);
    pendingImportData.current = null;
    toast.info('Import cancelled');
  };

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <PageHeader
        title="Settings"
        subtitle="Customize your experience"
        gradient="from-primary via-primary to-blue-700"
        shadow
        noBlurs
      />
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
            <h2 className="card-title text-lg"><Bot className="w-5 h-5" /> AI Assistant</h2>
            <div className="divider my-2"></div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-base-200/50 rounded-xl">
                <div><p className="font-medium">AI Provider</p></div>
                <select
                  className="select select-sm select-bordered"
                  value={ai.provider}
                  onChange={(e) => setAiSettings({ provider: e.target.value as 'ollama' | 'none' })}
                >
                  <option value="none">Disabled</option>
                  <option value="ollama">Ollama Cloud / Local</option>
                </select>
              </div>
              {ai.provider === 'ollama' && (
                <>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-base-content/70">Base URL</label>
                    <input
                      type="text"
                      className="input input-bordered input-sm w-full"
                      value={ai.ollamaBaseUrl}
                      onChange={(e) => setAiSettings({ ollamaBaseUrl: e.target.value })}
                      placeholder="https://ollama.com or http://localhost:11434"
                    />
                    <p className="text-xs text-base-content/50">Cloud: ollama.com | Local: localhost:11434</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-base-content/70">API Key</label>
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
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-base-content/50">Get key at ollama.com (account settings)</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-base-content/70">Model</label>
                    <input
                      type="text"
                      className="input input-bordered input-sm w-full"
                      value={ai.ollamaModel}
                      onChange={(e) => setAiSettings({ ollamaModel: e.target.value })}
                      placeholder="llama3.2, mistral-small3.1, deepseek-r1, etc."
                    />
                    <p className="text-xs text-base-content/50">Cloud models: llama3.2, llama3.3, mistral-small3.1, qwen3, gemma3, phi4, deepseek-r1</p>
                  </div>
                  <button
                    onClick={handleTestAi}
                    disabled={aiTestStatus === 'testing'}
                    className="btn btn-outline btn-sm w-full gap-2"
                  >
                    {aiTestStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {aiTestStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-success" />}
                    {aiTestStatus === 'error' && <XCircle className="w-4 h-4 text-error" />}
                    Test Connection
                  </button>
                </>
              )}
            </div>
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

      {/* Import Confirmation Modal */}
      {importModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card bg-base-100 shadow-2xl w-full max-w-md">
            <div className="card-body">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Import Data
                </h3>
                <button onClick={cancelImport} className="btn btn-ghost btn-sm btn-circle">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="divider my-1"></div>
              {importModal.versionMismatch && (
                <div className="alert alert-warning mb-3">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm">This backup was created by a different version of the app. Some data may not import correctly.</span>
                </div>
              )}
              {importModal.isOldFormat && (
                <div className="alert alert-info mb-3">
                  <span className="text-sm">This is a legacy backup file. Only progress and settings data will be imported.</span>
                </div>
              )}
              <p className="text-base-content/70 mb-4">
                This will <strong>replace all your current data</strong> with the imported backup. This action cannot be undone.
              </p>
              {importModal.data.exportedAt && (
                <p className="text-xs text-base-content/50 mb-4">
                  Backup created: {new Date(importModal.data.exportedAt).toLocaleString()}
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <button onClick={cancelImport} className="btn btn-ghost">Cancel</button>
                <button onClick={confirmImport} className="btn btn-error">Replace Data</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Settings;
