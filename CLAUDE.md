# CLAUDE.md — JW Habits

## What This Is

A Capacitor (React + Vite) mobile/PWA app for Jehovah's Witnesses. A **launchpad** to jw.org surfaces — the home is a single list of link-out rows (Daily text, Bible reading, Prayer, Family worship, Meeting prep, News) and tapping any of them opens the actual jw.org page. The app does NOT track completions, XP, streaks, or any other state. The user does the actual habit in the external surface and the app is just a fast way to get there.

- **App ID:** `com.ashbi.jwnews`
- **Version:** 4.1.0
- **Node requirement:** >= 18.0.0

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 7 |
| Routing | React Router DOM 7 |
| State | Zustand 5 (settings only — no data tracking) |
| Styling | Tailwind CSS 3 + DaisyUI 4 |
| Icons | lucide-react |
| Dates | date-fns |
| Mobile | Capacitor 8 (iOS + Android) |
| PWA | vite-plugin-pwa + Workbox |
| Testing | Vitest + Testing Library |
| Linting | ESLint 9 + Prettier |

## Architecture Overview

```
src/
├── main.jsx              # Entry point (error logging, back button, SW updates)
├── App.jsx               # Router + global wrappers (ErrorBoundary, Toast, Drawer)
├── index.css             # Tailwind base + 20+ custom animations
├── pages/                # 4 routes total (everything else is link-out)
│   ├── Home.jsx          # Greeting + 6 link-out rows (the only user-facing page)
│   ├── Settings.tsx      # Appearance (theme) + Help + Data reset
│   ├── About.jsx         # Third-party disclaimer (jw.org required content)
│   ├── IdeasPage.jsx     # Curated jw.org link-out rows for inspiration
│   └── Share.jsx         # PWA share_target landing
├── stores/
│   └── settingsStore.ts  # Theme + reset state. Nothing else.
├── components/
│   ├── BottomNav.jsx     # ← deleted (no more tabs)
│   ├── SideDrawer.tsx    # Hamburger menu: Settings, Ideas, About
│   ├── ErrorBoundary.jsx
│   ├── InstallPrompt.jsx
│   ├── LoadingSpinner.jsx / Skeleton.jsx
│   ├── OfflineIndicator.jsx / UpdatePrompt.jsx
│   └── Toast.jsx         # Context-based toast system
├── hooks/
│   ├── useDrawer.js      # Drawer context
│   └── usePWA.js         # Install prompt, online status, SW updates
└── utils/
    ├── native.js         # Capacitor: haptics, statusBar, keyboard, splash
    ├── jwLibraryLinks.js # JW.org / JW Library URL helpers
    ├── bibleBooks.ts     # Bible book name → number map
    ├── pwa.js            # PWA install / SW update utilities
    ├── storageErrorHandler.js  # LRU eviction for localStorage quota
    └── jwLibraryLinks.test.js, bibleBooks.test.ts, native.test.js, relativeDate.test.js, storageErrorHandler.test.js
```

## Routes

| Path | Page | Loading | Nav |
|------|------|---------|-----|
| `/` | Home | Eager | Hamburger + direct |
| `/settings` | Settings | Lazy | Side drawer |
| `/share` | Share (PWA share_target) | Lazy | (PWA OS) |
| `/ideas` | Ideas | Lazy | Side drawer |
| `/about` | About | Lazy | Side drawer + home footer link |

## What was stripped (and why)

The previous version of jw-habits had full in-app habit tracking: prayer checkboxes, daily text completion, Bible chapter check-offs, family worship toggle, XP/levels/achievements, 366-day reading plans, meeting workbooks, service hours logging, goals CRUD with projects, daily reflection textarea, streak rings, heatmaps. Cam said: "too much going on." So:

- **Deleted components (49 files, ~70KB of code)**: DailyTasksSection, PrayerTrackingCard, FamilyWorshipCard, BibleReadingCard, UnifiedDashboardCard, HabitHeatmap, WelcomeBack, TodaysFocus, StreakRecords, StreakRing, GoalsTab, ProjectsTab, SmartSuggestions, Onboarding, AchievementPopup, CommandPalette, QuickAddFAB, BottomNav, MeetingCard, ReadingSection, WeeklyBibleReading, MidweekMeetingSection, WeekendMeetingSection, DeeperStudySection, PageHeader, MeetingSection, StudyTab, NotificationItems, SmartSuggestions.css, QuickAddFAB.css, App.css (empty).
- **Deleted data stores (5 files, ~80KB)**: progressStore, gamificationStore, serviceStore, newsStore, memoriesStore, goalsStore. **Only `settingsStore` remains** for theme + onboarding state.
- **Deleted utils**: webVitals, notifications, bibleReadingSchedule, ollama. **Only `pwa.js` (PWA install/SW utilities), `native.js` (Capacitor), `jwLibraryLinks.js` (URL helpers), and `storageErrorHandler.js` (LRU) remain.**
- **Deleted hooks**: useNotificationReminders.
- **Deleted pages (7 files)**: Study, StudyReading, DeeperStudyPage, Goals, Service, Stats, Links. **Only Home, Settings, About, IdeasPage, Share remain.**
- **Deleted bottom tab nav**: 4 tabs collapsed. Hamburger menu is the only nav.

## What was kept

- **Settings (theme + reset only)** — Appearance toggle (with real-time data-theme update via useEffect), Help & Tour link, Data reset button.
- **About** — Required by jw.org Terms of Use: identify as unofficial third-party, identify developer, disclaim affiliation, link to the official Terms of Use, provide Watchtower Developer Support contact for takedown.
- **Ideas** — Curated list of link-out rows to jw.org surfaces for inspiration.
- **Share** — PWA share_target handler.
- **PWA** — Install prompt, offline support, auto-update via Workbox, jw.org network-first caching.
- **Capacitor (iOS + Android)** — Haptics, status bar, back button handling, splash screen.

## State Management

| Store | Storage Key | Purpose |
|-------|------------|---------|
| settingsStore | `jw-progress-settings` | Theme (light/dark) + onboarding flags |

That's it. There is no other state. No progress, no streaks, no goals, no XP.

## Build & Development

```bash
# Development
npm run dev              # Vite dev server only

# Build
npm run build            # Production build → dist/
npm run preview          # Preview production build

# Mobile
npm run mobile:build     # Build + cap sync
npm run mobile:android   # Build + sync + open Android Studio
npm run mobile:ios       # Build + sync + open Xcode
npm run android:build:debug    # Full debug APK
npm run android:build:release  # Full release AAB

# Quality
npm run lint             # ESLint
npm test                 # Vitest run once
npm run test:watch       # Vitest watch mode
npm run test:coverage    # Vitest coverage
```

## Styling

- **Theme colors:** jw-blue `#4A6FA4`, jw-green `#71BC37`
- **DaisyUI themes:** `light` and `dark` (toggled in Settings; the Settings page applies it in real time via a useEffect on the theme selector)
- **Custom CSS animations** in `src/index.css`: fade-in-up, slide-up, achievement-pop, confetti, flame, level-up, shimmer, and more
- **Safe area utilities:** `.pt-safe`, `.pb-safe` etc. for notched devices
- **Touch targets:** `.btn-touch` ensures 44px minimum

## Key Conventions

### Imports
- `useDrawer`: Always import from `src/hooks/useDrawer.js`, NOT from `SideDrawer.tsx`
- `JW_ORG_SECTIONS` + `getDailyTextLink` + `getBibleReadingLink`: link-out URL helpers, all from `src/utils/jwLibraryLinks.js`
- Icons: Use `lucide-react` (not heroicons, not font-awesome)
- Types: Use `import type { ... }` for type-only imports from lucide-react

### Component Patterns
- Top sticky bar: `bg-base-200/80 backdrop-blur-lg` so content scrolls under
- iOS large title: 34px / 700 weight, no gradient
- All link-out rows: `<a target="_blank" rel="noopener noreferrer">` with chevron-right
- Haptic feedback via `haptics.light()` / `haptics.success()` on user interactions
- Toast notifications via `useToast()` hook from `components/Toast.jsx`

## PWA Configuration

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

The live app at `https://jwhabits.ashbi.ca/` is a launchpad to jw.org. The user opens it, sees 6 link-out rows, taps one, and is taken to the actual jw.org surface. No tracking, no analytics, no account. Just fast access to the daily and weekly habits.
