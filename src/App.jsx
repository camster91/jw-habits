import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import InstallPrompt from './components/InstallPrompt';
import UpdatePrompt from './components/UpdatePrompt';
import OfflineIndicator from './components/OfflineIndicator';
import AchievementPopup from './components/AchievementPopup';
import SideDrawer from './components/SideDrawer';
import useNotificationReminders from './hooks/useNotificationReminders';

// Lazy load non-critical pages for better initial load performance
const Study = lazy(() => import('./pages/Study'));
const Goals = lazy(() => import('./pages/Goals'));
const Service = lazy(() => import('./pages/Service'));
const Stats = lazy(() => import('./pages/Stats'));
const Settings = lazy(() => import('./pages/Settings'));
const Links = lazy(() => import('./pages/Links'));
const SharePage = lazy(() => import('./pages/Share'));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="loading loading-spinner loading-lg text-primary"></span>
    </div>
  );
}

function App() {
  useNotificationReminders();

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <SideDrawer>
            <div className="app">
              {/* PWA Components */}
              <OfflineIndicator />
              <UpdatePrompt />

              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/study" element={<Study />} />
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/service" element={<Service />} />
                  <Route path="/stats" element={<Stats />} />
                  <Route path="/links" element={<Links />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/share" element={<SharePage />} />
                </Routes>
              </Suspense>
              <BottomNav />

              {/* Install Prompt (shown at bottom) */}
              <InstallPrompt />

              {/* Achievement Popup */}
              <AchievementPopup />
            </div>
          </SideDrawer>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;