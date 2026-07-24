import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Home from './pages/Home';
import ErrorBoundary from './components/ErrorBoundary';
import InstallPrompt from './components/InstallPrompt';
import UpdatePrompt from './components/UpdatePrompt';
import OfflineIndicator from './components/OfflineIndicator';

// Share is an OS share_target landing page — lazy so the main
// habit path does not pay for its chunk on every visit.
const Share = lazy(() => import('./pages/Share'));

// The app is one page. Settings, Ideas, About, the side
// drawer, the toast provider, and the per-user settings store
// have all been removed. The only persisted state is the
// per-day habit state in jw-daily-habits-state. The home page
// does everything: habit rows, each with a link to a jw.org
// surface and a checkbox to mark "done." The /share route
// exists because the PWA manifest declares a share_target
// pointing at /share — the OS sends shared URLs here when the
// user shares from another app.

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
      <Router basename={routerBasename}>
        <Routes>
          <Route path="/" element={<HomeWithChrome />} />
          <Route
            path="/share"
            element={
              <Suspense fallback={<div className="min-h-screen bg-base-200" aria-busy="true" />}>
                <Share />
              </Suspense>
            }
          />
          {/* Catch-all: any path that doesn't match a known
              route renders the home. This makes /ideas, /about,
              /settings all fall through to the home rather than
              producing a blank page. Cloudflare/Traefik serves
              index.html for any unknown path on this domain, and
              the SPA's only "page" is the home, so any deep link
              to a non-existent route should land on the home. */}
          <Route path="*" element={<HomeWithChrome />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

// Home is the main page. Wrap it in the PWA chrome
// (offline indicator + update prompt + install banner). The
// install prompt is a small bottom banner that auto-dismisses
// — it's not a settings menu, just a one-time browser
// affordance.
function HomeWithChrome() {
  return (
    <>
      <OfflineIndicator />
      <UpdatePrompt />
      <Home />
      <InstallPrompt />
    </>
  );
}

export default App;
