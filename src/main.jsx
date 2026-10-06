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
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { safeGetItem, safeSetItemQuiet } from './utils/safeStorage.js';
import { initializeNative, isNative, isWeb, appLifecycle } from './utils/native.js';
import { StoreProvider } from './data/StoreProvider.jsx';
import { registerReminderSync } from './native/reminders.js';
import { registerWhatsNewCheck } from './native/whatsNewClient.js';

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
    const existingLogs = JSON.parse(safeGetItem('jw-error-logs') || '[]');
    existingLogs.push(errorLog);
    // Keep only the last 20 errors
    const recentLogs = existingLogs.slice(-20);
    safeSetItemQuiet('jw-error-logs', JSON.stringify(recentLogs));
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

// Reschedule local notifications on every app open
registerReminderSync();
// Check jw.org's feed for new items (at most daily; dates only)
registerWhatsNewCheck();

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

// Create root and render
const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <StrictMode>
    <ErrorBoundary>
      <StoreProvider>
        <App />
      </StoreProvider>
    </ErrorBoundary>
  </StrictMode>
);

// Service worker update handler. The UpdatePrompt banner (driven
// by usePWA) is the user-visible flow for applying updates — we
// do NOT auto-reload on controllerchange, which would destroy any
// in-progress state. See src/components/UpdatePrompt.jsx for the
// banner and src/utils/native.js for the applyUpdate flow.
if (isWeb && 'serviceWorker' in navigator) {
  // Register the service worker (the plugin's auto-injection is off, so the
  // native build never registers one).
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch((error) => console.warn('Service worker registration failed:', error));

  // Handle notification clicks — focus app window. Only accept
  // messages from our controlling SW, and only same-origin paths.
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'NOTIFICATION_CLICK') return;
    if (event.source && event.source !== navigator.serviceWorker.controller) return;
    const raw = typeof event.data.url === 'string' ? event.data.url : '/';
    const safePath =
      raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\')
        ? raw
        : (() => {
            try {
              const parsed = new URL(raw, window.location.origin);
              return parsed.origin === window.location.origin
                ? `${parsed.pathname}${parsed.search}${parsed.hash}`
                : '/';
            } catch {
              return '/';
            }
          })();
    window.focus();
    window.location.href = safePath;
  });
}

// Listen for notification clicks directly (for when SW isn't controlling)
if (isWeb && 'serviceWorker' in navigator) {
  navigator.serviceWorker.ready
    .then(() => {
      // No-op: registration ready for notification scheduling
    })
    .catch(() => {});
}
