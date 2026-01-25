import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { logWebVitals } from './utils/webVitals.js';
import { initializeNative, isNative, appLifecycle } from './utils/native.js';

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
}
