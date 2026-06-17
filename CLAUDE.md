# CLAUDE.md — JW Habits

## What This Is

A Capacitor (React + Vite) mobile/PWA app for Jehovah's Witnesses. A **simple habit tracker** — one page, no settings menu, no hamburger, no drawer. The home is a single iOS list of 5 link-out rows (Daily text, Daily Bible reading, Meeting prep, Family worship, Prayer), each with a checkbox to mark it done. Tap the row to open the jw.org surface in a new tab; tap the checkbox to mark the habit done. The actual habit happens on jw.org itself — the app is just a fast way to get there. No streaks, no XP, no timer, no toasts, no animations, no celebrations. Per-day state in localStorage, yesterday's checks don't carry over.

**The app is link-out only.** It contains no Bible text, no prayer content, no progress summaries. Its only job is: open jw.org surfaces and remember which ones you've already done today.

- **App ID:** `com.ashbi.jwnews`
- **Version:** 4.1.0
- **Node requirement:** >= 18.0.0

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 7 |
| Routing | React Router DOM 7 (1 page + /share PWA share_target + `*` catch-all → home) |
| State | none in app code; just localStorage for the per-day habit state |
| Styling | Tailwind CSS 3 + DaisyUI 4 (light/dark themes, OS-controlled via `prefers-color-scheme`) |
| Icons | lucide-react |
| Dates | date-fns |
| Mobile | Capacitor 8 (iOS + Android) |
| PWA | vite-plugin-pwa + Workbox |
| Testing | Vitest + Testing Library |
| Linting | ESLint 9 + Prettier |

## Architecture Overview

```
src/
├── main.jsx              # Entry point (error logging, back button, SW updates, theme at startup)
├── App.jsx               # Router (Home + /share + catch-all → Home) + PWA chrome
├── index.css             # Tailwind base + iOS tokens
├── pages/
│   ├── Home.jsx          # The only user-facing page (5 rows + checkboxes + footer disclaimer)
│   └── Share.jsx         # PWA share_target landing (OS-level entry point, not user-facing)
├── components/
│   ├── ErrorBoundary.jsx
│   ├── InstallPrompt.jsx # Bottom install banner (PWA)
│   ├── OfflineIndicator.jsx # Top "you're offline" indicator
│   └── UpdatePrompt.jsx  # "New version available" banner (PWA)
├── hooks/
│   └── usePWA.js         # Install prompt, online status, SW updates
└── utils/
    ├── native.js              # Capacitor: haptics, statusBar, keyboard, splash
    ├── jwLibraryLinks.js      # JW.org / JW Library URL helpers (getDailyTextLink, parseReadingToLink, etc.)
    ├── bibleBooks.ts          # Bible book name → number map (66 books)
    ├── pwa.js                 # PWA install / SW update utilities
    ├── storageErrorHandler.js # LRU eviction for localStorage quota
    └── dailyBibleReading.js   # 366-entry reading schedule → jwlibrary:// deep link
```

## Routes

| Path | Page | Loading | Notes |
|------|------|---------|-------|
| `/` | Home (5 link-out rows + checkboxes) | Eager | The only user-facing page |
| `/share` | Share (PWA share_target) | Eager | OS-level entry point; receives URLs shared from other apps |
| `*` (catch-all) | Home | Eager | Any path that doesn't match (e.g. /ideas, /about, /settings) renders the home |

There is no Settings page, no About page, no Ideas page, no hamburger menu, no drawer. All navigation happens by tapping a row, which opens jw.org in a new tab. The top bar contains the "JW HABITS" title only — no icons on either side.

## What was stripped (and why)

Per Cam's "I don't need a ton of complexity" + "Strip all" directives, the app has been aggressively reduced:

- **Settings page** (deleted 2026-06-17): theme toggle, help link, data reset. Removed because the Settings UI duplicated a browser feature (theme follows OS preference; data reset is browser site-data settings). Keeping the Settings UI would re-introduce the menu/settings/drawer chrome that Cam said to strip.
- **About page** (deleted): the third-party disclaimer is now inline in the home footer.
- **Ideas page** (deleted): it was a redundant list of jw.org links — the home already has them.
- **Side drawer + hamburger** (deleted): the drawer had 3 items, all now removed.
- **Toast provider + useToast hook** (deleted): no toasts triggered by anyone. Was used only by the deleted Settings page.
- **useDrawer hook** (deleted): only the deleted SideDrawer used it.
- **settingsStore (Zustand)** (deleted): the only field was `theme`, which is now resolved at startup from localStorage or `prefers-color-scheme` directly in `main.jsx`. No UI toggle exists to update it.
- **Reset today button** (deleted): it was a per-day convenience. Per-day state resets at midnight anyway. The browser's site-data settings is the only path to wipe state mid-day.
- **LoadingSpinner, Skeleton, SideDrawer, Toast, BottomNav** (all deleted): all dead code from earlier turns.

What survives is:
- One page (Home)
- Top bar with only the "JW HABITS" title
- 5 habit rows (Daily text, Daily Bible reading, Meeting prep, Family worship, Prayer)
- A checkbox to the right of each row to mark "done"
- A footer with the third-party disclaimer (3rd-party ToS requirement)
- A first-launch hint that shows once then disappears forever
- PWA chrome (install banner, offline indicator, update prompt)
- A `/share` route that receives URLs shared from other apps (PWA OS integration)
- A catch-all `*` route that renders the home for any other path

## Build & Development

- Service worker: auto-update via Workbox (vite-plugin-pwa)
- Offline caching: JW.org (NetworkFirst), images (CacheFirst), fonts (CacheFirst), API (StaleWhileRevalidate)
- App shortcuts: Home (since bottom nav was removed)
- Install prompt with 7-day dismissal (`InstallPrompt.jsx`)
- Update prompt when new SW detected (`UpdatePrompt.jsx`)

## Mobile (Capacitor)

- Splash screen: 2s, `#4A6FA4` background, immersive
- Status bar: light style, `#4A6FA4` background (Android)
- Keyboard: body resize mode
- Haptics: full integration via `src/utils/native.js`
- Back button: double-tap to exit (Android, handled in main.jsx)

## Data Files

- `public/data/bible-reading.json` — Bible reading schedule (used by `jwLibraryLinks.js` for daily text link generation)
- `public/data/meeting-workbooks.json` — Meeting workbook data by ISO week (used by `jwLibraryLinks.js` for meeting prep link generation)

## Next Steps (Launch)

- Get screenshots for Google Play listing (use `screenshot-store-assets.cjs` after the next deploy)
- Register Google Play Developer account ($25)
- Write/host privacy policy at ashbi.ca/privacy/jw-habits
- Generate signed Android bundle via Android Studio
- Submit to Google Play Store

The live app at `https://jwhabits.ashbi.ca/` is a simple habit tracker: the home opens with 5 link-out rows, each one opens a jw.org surface in a new tab, and a small checkbox to the right of each row marks it done. No streaks, no XP, no timer, no celebrations. The user does the actual habit in the linked jw.org surface.
