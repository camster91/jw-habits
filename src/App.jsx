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

// Lazy load non-critical pages for better initial load performance
const Stats = lazy(() => import('./pages/Stats'));
const Settings = lazy(() => import('./pages/Settings'));
const Links = lazy(() => import('./pages/Links'));
const News = lazy(() => import('./pages/News'));
const Memories = lazy(() => import('./pages/Memories'));
const Meeting = lazy(() => import('./pages/Meeting'));
const Goals = lazy(() => import('./pages/Goals'));
const Projects = lazy(() => import('./pages/Projects'));
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
                  <Route path="/news" element={<News />} />
                  <Route path="/meeting" element={<Meeting />} />
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/stats" element={<Stats />} />
                  <Route path="/links" element={<Links />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/memories" element={<Memories />} />
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
