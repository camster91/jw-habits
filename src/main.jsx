import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n';
import App from './App.jsx';
import { logWebVitals } from './utils/webVitals.js';
import { initializeNative, isNative, appLifecycle } from './utils/native.js';

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
window.onerror = function(message, source, lineno, colno, error) {
  logGlobalError('uncaught_exception', message, `${source}:${lineno}:${colno}`, error);
  return false; // Let the error propagate
};

// Global handler for unhandled promise rejections
window.onunhandledrejection = function(event) {
  const error = event.reason;
  logGlobalError(
    'unhandled_rejection',
    error?.message || String(error),
    'Promise',
    error
  );
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

// Apply persisted theme at app startup (before React mounts).
// Without this, the theme only applied when the user visited Settings —
// a fresh page-load with theme:'dark' in localStorage would render in light mode.
try {
  const persistedSettings = JSON.parse(localStorage.getItem('jw-progress-settings') || '{}');
  const theme = persistedSettings?.state?.theme;
  if (theme === 'dark' || theme === 'light') {
    document.documentElement.setAttribute('data-theme', theme);
  }
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

// Report Web Vitals metrics in development
logWebVitals();

// Register service worker update handler
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // New service worker activated, reload to get updates
    window.location.reload();
  });

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
  navigator.serviceWorker.ready.then(() => {
    // No-op: registration ready for notification scheduling
  }).catch(() => {});
}
