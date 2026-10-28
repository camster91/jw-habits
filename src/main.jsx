import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { recordDiagnostic, pruneDiagnostics } from './utils/diagnostics.js';
import { initializeNative, isNative, appLifecycle } from './utils/native.js';
import { consumeBack } from './utils/backStack.js';
import { StoreProvider } from './data/StoreProvider.jsx';
import { registerReminderSync } from './native/reminders.js';
import { registerWhatsNewCheck } from './native/whatsNewClient.js';
import { registerWidgetBridge } from './native/widgetBridge.js';
import { registerBadgeAwards } from './native/badgeAwards.js';

// Initial distribution is English-only (#259). Legacy detector preferences
// remain untouched; user-written labels, links and stored history are preserved.
i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en'],
  interpolation: { escapeValue: false },
});
document.documentElement.lang = 'en';

// Global error logging function
function logGlobalError(type, message, source, error) {
  recordDiagnostic(type);

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error(`[${type}]`, message, error);
  }
}

pruneDiagnostics();

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
// Apply widget check-ins on foreground and keep the widget snapshot current
registerWidgetBridge();
// Award badges once when their rules are met (never revoked)
registerBadgeAwards();

// Initialize native mobile features
initializeNative().catch(console.error);

// Handle back button on Android
if (isNative) {
  let lastBackPress = 0;
  appLifecycle.onBackButton(({ canGoBack }) => {
    // An open sheet closes first.
    if (consumeBack()) return;
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
