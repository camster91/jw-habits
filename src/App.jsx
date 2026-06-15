import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import InstallPrompt from './components/InstallPrompt';
import UpdatePrompt from './components/UpdatePrompt';
import OfflineIndicator from './components/OfflineIndicator';
import SideDrawer from './components/SideDrawer';

// Lazy load the meta pages. The home is the only user-facing
// page (one iOS list of 5 link-out rows + a checkbox per row
// to mark it done). Settings, About, Ideas, Share live in
// the side drawer / footer / PWA share target.
const Settings = lazy(() => import('./pages/Settings'));
const SharePage = lazy(() => import('./pages/Share'));
const IdeasPage = lazy(() => import('./pages/IdeasPage'));
const About = lazy(() => import('./pages/About'));

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
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/share" element={<SharePage />} />
                  <Route path="/ideas" element={<IdeasPage />} />
                  <Route path="/about" element={<About />} />
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
