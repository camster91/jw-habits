import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import InstallPrompt from './components/InstallPrompt';
import UpdatePrompt from './components/UpdatePrompt';
import OfflineIndicator from './components/OfflineIndicator';
import { PWAProvider } from './components/PWAProvider';
import Share from './pages/Share';
import Today from './screens/Today';
import Progress from './screens/Progress';
import Onboarding from './screens/Onboarding';
import SettingsSheet from './screens/SettingsSheet';
import { useStore } from './data/useStore.js';
import { applyTheme } from './theme/theme.js';
import { isWeb } from './utils/native.js';

// Faithful Days shell: onboarding until it is done, then Today and
// Progress. The install/update/offline chrome and the /share route exist
// only in the web build; the native app has no use for them.

function routerBasename() {
  try {
    const base = import.meta.env.BASE_URL;
    return base === '/' ? '/' : base.replace(/\/$/, '');
  } catch {
    return '/';
  }
}

function Screens() {
  const { store } = useStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = () => setSettingsOpen(true);

  const { accent, theme, onboardingDone } = store;
  useEffect(() => applyTheme({ accent, theme }), [accent, theme]);

  const today = <Today onOpenSettings={openSettings} />;
  return (
    <>
      <Routes>
        {isWeb && <Route path="/share" element={<Share />} />}
        {!onboardingDone ? (
          <Route path="*" element={<Onboarding />} />
        ) : (
          <>
            <Route path="/" element={today} />
            <Route path="/progress" element={<Progress />} />
            <Route path="*" element={today} />
          </>
        )}
      </Routes>
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

function App() {
  const shell = (
    <Router basename={routerBasename()}>
      <Screens />
    </Router>
  );

  return (
    <ErrorBoundary>
      {isWeb ? (
        <PWAProvider>
          <OfflineIndicator />
          <UpdatePrompt />
          {shell}
          <InstallPrompt />
        </PWAProvider>
      ) : (
        shell
      )}
    </ErrorBoundary>
  );
}

export default App;
