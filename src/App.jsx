import StorageNotice from './components/StorageNotice.jsx';
import { lazy, Suspense, useLayoutEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import InstallPrompt from './components/InstallPrompt';
import UpdatePrompt from './components/UpdatePrompt';
import OfflineIndicator from './components/OfflineIndicator';
import { PWAProvider } from './components/PWAProvider';
const Share = lazy(() => import('./pages/Share.jsx'));
import Today from './screens/Today';
import Badges from './screens/Badges.jsx';
import BadgeToast from './components/fun/BadgeToast.jsx';
import Progress from './screens/Progress';
import Plans from './screens/Plans.jsx';
import PlanTrail from './screens/PlanTrail.jsx';
import FamilyWeeks from './screens/FamilyWeeks.jsx';
import Onboarding from './screens/onboarding/Onboarding.jsx';
import TabBar from './components/TabBar';
import SettingsSheet from './screens/SettingsSheet';
import { useStore } from './data/useStore.js';
import { applyTheme } from './theme/theme.js';
import { isWeb } from './utils/native.js';

// Faithful Days shell: onboarding until it is done, then Today, Plans
// (and each plan's trail) and Progress. The install/update/offline chrome and the /share route exist
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
  // Apply the stored appearance before newly loaded screens paint.
  useLayoutEffect(() => applyTheme({ accent, theme }), [accent, theme]);

  const withTabs = (screen) => (
    <>
      {screen}
      <TabBar onOpenSettings={openSettings} />
    </>
  );
  const today = withTabs(<Today onOpenSettings={openSettings} />);
  return (
    <>
      <Routes>
        {isWeb && (
          <Route
            path="/share"
            element={
              <Suspense fallback={<p role="status">Loading shared content…</p>}>
                <Share />
              </Suspense>
            }
          />
        )}
        {!onboardingDone ? (
          <Route path="*" element={<Onboarding />} />
        ) : (
          <>
            <Route path="/" element={today} />
            <Route path="/plans" element={withTabs(<Plans />)} />
            <Route path="/plans/family" element={withTabs(<FamilyWeeks />)} />
            <Route path="/plans/:planId" element={withTabs(<PlanTrail />)} />
            <Route path="/progress/badges" element={withTabs(<Badges />)} />
            <Route path="/progress" element={withTabs(<Progress />)} />
            <Route path="*" element={today} />
          </>
        )}
      </Routes>
      {onboardingDone && <BadgeToast />}
      <StorageNotice onBackup={openSettings} />
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
