import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import InstallPrompt from './components/InstallPrompt';
import UpdatePrompt from './components/UpdatePrompt';
import OfflineIndicator from './components/OfflineIndicator';
import SideDrawer from './components/SideDrawer';

// Lazy load the secondary pages. After the morning-routine
// feature shipped, the app has 4 in-app routes: home, /routine
// (the 4-step morning flow), /habits (the 6-row link-out
// directory), and the meta pages (settings, about, ideas,
// share). The bottom nav and 4 internal trackers are gone.
const Settings = lazy(() => import('./pages/Settings'));
const SharePage = lazy(() => import('./pages/Share'));
const IdeasPage = lazy(() => import('./pages/IdeasPage'));
const About = lazy(() => import('./pages/About'));
const RoutinePage = lazy(() => import('./pages/RoutinePage'));
const AllHabitsPage = lazy(() =>
  import('./pages/Home.jsx').then((m) => ({ default: m.AllHabitsPage }))
);

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="loading loading-spinner loading-lg text-primary"></span>
    </div>
  );
}

function App() {
  // Use Vite's base URL as React Router basename — works for both
  // Coolify (/) and GH Pages (/jw-habits/) without code changes
  const routerBasename = (() => {
    try {
      const base = import.meta.env.BASE_URL;
      return base === '/' ? '/' : base.replace(/\/$/, '');
    } catch {
      return '/';
    }
  })();

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router basename={routerBasename}>
          <SideDrawer>
            <div className="app">
              {/* PWA Components */}
              <OfflineIndicator />
              <UpdatePrompt />

              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/routine" element={<RoutinePage />} />
                  <Route path="/habits" element={<AllHabitsPage />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/share" element={<SharePage />} />
                  <Route path="/ideas" element={<IdeasPage />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/onboarding" element={<Home />} />
                </Routes>
              </Suspense>

              {/* Install Prompt (shown at bottom) */}
              <InstallPrompt />
            </div>
          </SideDrawer>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
