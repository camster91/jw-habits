import StorageNotice from './components/StorageNotice.jsx';
import { lazy, Suspense, useLayoutEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
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
import WorkspaceProvider from './data/WorkspaceProvider.jsx';
const Notes = lazy(() => import('./screens/Notes.jsx'));
const Preparation = lazy(() => import('./screens/Preparation.jsx'));

// Faithful Days shell: onboarding until it is done, then Today, Plans
// (and each plan's trail) and Progress. Unknown paths fall back to Today.

function routerBasename() {
  try {
    const base = import.meta.env.BASE_URL;
    return base === '/' ? '/' : base.replace(/\/$/, '');
  } catch {
    return '/';
  }
}

function Screens() {
  const { store, savingPaused } = useStore();
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
        {!onboardingDone ? (
          <Route path="*" element={<Onboarding />} />
        ) : (
          <>
            <Route path="/" element={today} />
            <Route path="/plans" element={withTabs(<Plans />)} />
            <Route path="/plans/family" element={withTabs(<FamilyWeeks />)} />
            <Route
              path="/plans/preparation"
              element={withTabs(
                <Suspense fallback={<p role="status">Loading preparation…</p>}>
                  <Preparation />
                </Suspense>
              )}
            />
            <Route
              path="/notes"
              element={withTabs(
                <Suspense fallback={<p role="status">Loading notes…</p>}>
                  <Notes />
                </Suspense>
              )}
            />
            <Route path="/plans/:planId" element={withTabs(<PlanTrail />)} />
            <Route path="/progress/badges" element={withTabs(<Badges />)} />
            <Route path="/progress" element={withTabs(<Progress />)} />
            <Route path="*" element={today} />
          </>
        )}
      </Routes>
      {onboardingDone && <BadgeToast />}
      <StorageNotice onBackup={openSettings} savingPaused={savingPaused} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router basename={routerBasename()}>
        <WorkspaceProvider>
          <Screens />
        </WorkspaceProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
