import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import InstallPrompt from './components/InstallPrompt';
import UpdatePrompt from './components/UpdatePrompt';
import OfflineIndicator from './components/OfflineIndicator';

// Lazy load non-critical pages for better initial load performance
const Stats = lazy(() => import('./pages/Stats'));
const Settings = lazy(() => import('./pages/Settings'));
const Links = lazy(() => import('./pages/Links'));
const News = lazy(() => import('./pages/News'));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="loading loading-spinner loading-lg text-primary"></span>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <div className="app">
            {/* PWA Components */}
            <OfflineIndicator />
            <UpdatePrompt />

            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/news" element={<News />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/links" element={<Links />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Suspense>
            <BottomNav />

            {/* Install Prompt (shown at bottom) */}
            <InstallPrompt />
          </div>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
