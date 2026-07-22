import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import App from './App.jsx';
import { initializeNative, isNative, appLifecycle } from './utils/native.js';

// i18next — Spanish/French fall back to English when a key
// is missing. Language detected from navigator, cached in
// localStorage under the default i18next key.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
    },
    // Resolve "es-ES" → "es" so the regional locale detected
    // from navigator.language matches our resource key (which
    // is keyed by language, not locale). Without this, the
    // browser's "es-ES" falls through to the fallback "en".
    load: 'languageOnly',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['navigator', 'localStorage', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

// Global error logging function
function logGlobalError(type, message, source, error) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    type,
    message: message || 'Unknown error',
    source: source || 'unknown',
    stack: error?.stack || '',
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  try {
    const existingLogs = JSON.parse(localStorage.getItem('jw-error-logs') || '[]');
    existingLogs.push(errorLog);
    // Keep only the last 20 errors
    const recentLogs = existingLogs.slice(-20);
    localStorage.setItem('jw-error-logs', JSON.stringify(recentLogs));
  } catch {
    // Ignore storage errors
  }

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error(`[${type}]`, message, error);
  }
}

// Global error handler for uncaught exceptions
window.onerror = function (message, source, lineno, colno, error) {
  logGlobalError('uncaught_exception', message, `${source}:${lineno}:${colno}`, error);
  return false; // Let the error propagate
};

// Global handler for unhandled promise rejections
window.onunhandledrejection = function (event) {
  const error = event.reason;
  logGlobalError('unhandled_rejection', error?.message || String(error), 'Promise', error);
};

// Initialize native mobile features
initializeNative().catch(console.error);

// Handle back button on Android
if (isNative) {
  let lastBackPress = 0;
  appLifecycle.onBackButton(({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      // Double-tap to exit
      const now = Date.now();
      if (now - lastBackPress < 2000) {
        appLifecycle.exit();
      } else {
        lastBackPress = now;
        // Could show a toast here: "Press back again to exit"
      }
    }
  });
}

// Apply theme at app startup (before React mounts). The
// Settings page has been removed — there is no UI toggle. We
// resolve the theme from one of two sources, in priority order:
//  1. localStorage `jw-progress-settings.state.theme` — set
//     programmatically (or by a previous version of the app
//     before the Settings page was deleted). Preserved for
//     users who explicitly chose dark mode before the strip-down.
//  2. `prefers-color-scheme: dark` — the OS-level setting.
//  3. light — the default.
// Without this, a user on a dark OS would see a flash of
// light mode before React mounted and the daisyUI theme took
// over.
try {
  const persistedSettings = JSON.parse(localStorage.getItem('jw-progress-settings') || '{}');
  const storedTheme = persistedSettings?.state?.theme;
  let theme;
  if (storedTheme === 'dark' || storedTheme === 'light') {
    theme = storedTheme;
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme = 'dark';
  } else {
    theme = 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
} catch {
  // Ignore malformed localStorage; default theme is light.
}

// Create root and render
const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Service worker update handler. The UpdatePrompt banner (driven
// by usePWA) is the user-visible flow for applying updates — we
// do NOT auto-reload on controllerchange, which would destroy any
// in-progress state. See src/components/UpdatePrompt.jsx for the
// banner and src/utils/native.js for the applyUpdate flow.
if ('serviceWorker' in navigator) {
  // Handle notification clicks — focus app window
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'NOTIFICATION_CLICK') {
      const url = event.data.url || '/';
      window.focus();
      window.location.href = url;
    }
  });
}

// Listen for notification clicks directly (for when SW isn't controlling)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready
    .then(() => {
      // No-op: registration ready for notification scheduling
    })
    .catch(() => {});
}
