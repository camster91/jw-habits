import { useTranslation } from 'react-i18next';
import { Moon, Sun, Trash2, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import useSettingsStore from '../stores/settingsStore.js';
import { useToast } from '../components/Toast.jsx';
import { haptics } from '../utils/native.js';

/**
 * Settings — stripped down for the launchpad version of the app.
 *
 * Sections that survived:
 *   1. Appearance  — light/dark mode toggle
 *   2. Help & Tour  — link to the /about page
 *   3. Data Reset   — wipes all localStorage and reloads (the only
 *                      destructive action; the app no longer tracks
 *                      data so there is nothing to export/import)
 *
 * Sections that were removed (along with their data stores):
 *   - Notifications     (utils/notifications.js, hook, schedule)
 *   - Daily routine     (trackedHabits / picker — no more picker)
 *   - AI Assistant      (Ollama — independent feature, removed to
 *                        reduce surface area; re-enable if requested)
 *   - App updates       (manual check; the PWA handles its own
 *                        auto-update via vite-plugin-pwa)
 *   - Data export/import (no tracked data to export)
 */
function Settings() {
  const { t } = useTranslation();
  const toast = useToast();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const [isResetting, setIsResetting] = useState(false);

  // Apply the theme to <html data-theme> in real time. Without
  // this useEffect, the theme only applies on next page load
  // (main.jsx reads it once on mount). The current app is the
  // launchpad — light/dark must flip immediately so the user
  // sees the change without a refresh.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    haptics.light();
    setTheme(theme === 'light' ? 'dark' : 'light');
    toast.info(theme === 'light' ? t('settings.darkModeOn', 'Dark mode on') : t('settings.lightModeOn', 'Light mode on'));
  };

  const handleReset = () => {
    if (!window.confirm(t('settings.clearConfirm', 'Clear all local data? This cannot be undone.'))) {
      return;
    }
    setIsResetting(true);
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('jw-')) localStorage.removeItem(k);
      });
      toast.success(t('settings.dataCleared', 'All local data cleared.'));
    } catch (e) {
      toast.error(t('settings.dataClearFailed', 'Failed to clear data.'));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 pb-16">
      {/* iOS large title — settings page */}
      <h1 className="ios-large-title">
        {t('settings.title', 'Settings')}
        <span className="sub">{t('settings.subtitle', 'Theme, data reset, and links')}</span>
      </h1>

      <div className="container mx-auto px-4 py-6 space-y-4 max-w-2xl">
        {/* Appearance — light/dark toggle */}
        <div className="ios-grouped">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-base-content mb-3">
              {theme === 'light' ? <Sun className="w-5 h-5 inline mr-1" /> : <Moon className="w-5 h-5 inline mr-1" />}
              {t('settings.appearance', 'Appearance')}
            </h2>
            <button
              onClick={toggleTheme}
              className="btn btn-outline w-full justify-start"
              aria-label={t('settings.toggleTheme', 'Toggle light / dark mode')}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              {theme === 'light' ? t('settings.darkMode', 'Dark mode') : t('settings.lightMode', 'Light mode')}
            </button>
          </div>
        </div>

        {/* Help & Tour — single link to the About page */}
        <div className="ios-grouped">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-base-content mb-3">
              <BookOpen className="w-5 h-5 inline mr-1" />
              {t('settings.help', 'Help & Tour')}
            </h2>
            <a
              href="/about"
              className="btn btn-outline w-full justify-start"
            >
              <BookOpen className="w-5 h-5" />
              {t('settings.aboutApp', 'About this app')}
            </a>
          </div>
        </div>

        {/* Data Reset — destructive action. Wipes all jw-* localStorage
            keys and reloads. Replaces the old Export/Import/Reset
            section since the launchpad no longer tracks data. */}
        <div className="ios-grouped">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-base-content mb-3">
              <Trash2 className="w-5 h-5 inline mr-1" />
              {t('settings.dataReset', 'Data reset')}
            </h2>
            <p className="text-sm text-base-content/70 mb-3">
              {t(
                'settings.dataResetDesc',
                "This app doesn't track your habits, but if you want to reset all local settings (theme, dismissed banners), tap below."
              )}
            </p>
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="btn btn-error btn-outline w-full justify-start"
            >
              <Trash2 className="w-5 h-5" />
              {isResetting
                ? t('settings.clearing', 'Clearing…')
                : t('settings.clearAllData', 'Reset all local data')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
