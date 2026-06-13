import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import InstallPrompt from './components/InstallPrompt';
import UpdatePrompt from './components/UpdatePrompt';
import Onboarding from './components/Onboarding';
import OfflineIndicator from './components/OfflineIndicator';
import AchievementPopup from './components/AchievementPopup';
import SideDrawer from './components/SideDrawer';
import CommandPalette from './components/CommandPalette';
import QuickAddFAB from './components/QuickAddFAB';
import './components/QuickAddFAB.css';
import useNotificationReminders from './hooks/useNotificationReminders';

// Lazy load non-critical pages for better initial load performance
const Study = lazy(() => import('./pages/Study'));
const Goals = lazy(() => import('./pages/Goals'));
const Projects = lazy(() => import('./pages/Goals')); // alias — Goals page has Projects sub-tab
const Service = lazy(() => import('./pages/Service'));
const Stats = lazy(() => import('./pages/Stats'));
const Settings = lazy(() => import('./pages/Settings'));
const Links = lazy(() => import('./pages/Links'));
const SharePage = lazy(() => import('./pages/Share'));
const IdeasPage = lazy(() => import('./pages/IdeasPage'));
const StudyReading = lazy(() => import('./pages/StudyReading'));
const DeeperStudyPage = lazy(() => import('./pages/DeeperStudyPage'));
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
  useNotificationReminders();

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
                  <Route path="/study" element={<Study />} />
                  <Route path="/study/reading" element={<StudyReading />} />
                  <Route path="/study/deeper-study" element={<DeeperStudyPage />} />
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/service" element={<Service />} />
                  <Route path="/statistics" element={<Stats />} />
                  <Route path="/links" element={<Links />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/share" element={<SharePage />} />
                  <Route path="/ideas" element={<IdeasPage />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/onboarding" element={<Home />} />
                </Routes>
              </Suspense>
              <BottomNav />

              {/* Install Prompt (shown at bottom) */}
              <InstallPrompt />

              {/* Achievement Popup */}
              <AchievementPopup />

              {/* Command Palette (Cmd+K) */}
              <CommandPalette />

              {/* Onboarding — shown only on first visit */}
              <Onboarding />
            </div>
          </SideDrawer>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;