# CLAUDE.md — JW Habits

## What This Is

A Capacitor (React + Vite) mobile/PWA app for Jehovah's Witnesses to track daily spiritual habits. Published as **JW Habits** on Android/iOS.

- **App ID:** `com.ashbi.jwnews`
- **Version:** 4.1.0
- **Node requirement:** >= 18.0.0

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 7 |
| Routing | React Router DOM 7 |
| State | Zustand 5 (persisted to localStorage) |
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
├── pages/                # 5 route pages (lazy-loaded except Home)
│   ├── Home.jsx          # Dashboard: daily text + reflection, prayers, family worship, Bible reading
│   ├── Study.jsx         # Meeting prep (midweek/weekend) + deeper study
│   ├── Goals.jsx         # Merged goals + projects with tab switcher
│   ├── Stats.jsx         # Gamification stats, achievements, streaks
│   ├── Links.jsx         # JW.org resource links (8 categories, 50+ links)
│   └── Settings.tsx      # Notifications, theme, data import/export
├── stores/               # Zustand state (all persisted)
│   ├── progressStore.ts  # Daily texts, prayers, family worship, Bible, meetings
│   ├── gamificationStore.ts # Points, levels, 38 achievements, streaks
│   ├── settingsStore.ts  # Notifications, theme, reading pace
│   ├── newsStore.ts      # Daily check-in history and streaks
│   ├── goalsStore.js     # Goals + projects CRUD
│   └── memoriesStore.ts  # Reflections by date
├── components/           # ~20 reusable components
│   ├── BottomNav.jsx     # 3-tab nav: Home, Study, Goals
│   ├── SideDrawer.tsx    # Hamburger drawer: Stats, Links, Settings
│   ├── DailyTasksSection.tsx  # Daily text + optional reflection + daily check
│   ├── PrayerTrackingCard.jsx
│   ├── FamilyWorshipCard.jsx
│   ├── BibleReadingCard.jsx
│   ├── MeetingCard.jsx
│   ├── DeeperStudySection.jsx
│   ├── WeeklyBibleReading.jsx
│   ├── GoalsTab.jsx
│   ├── ProjectsTab.jsx
│   ├── AchievementPopup.tsx  # Confetti + popup on unlock
│   ├── Toast.jsx         # Context-based toast system (useToast hook)
│   ├── ErrorBoundary.jsx
│   ├── LoadingSpinner.jsx / Skeleton.jsx
│   ├── OfflineIndicator.jsx / UpdatePrompt.jsx / InstallPrompt.jsx
│   └── settings/NotificationItems.tsx
├── hooks/
│   ├── useDrawer.js      # Drawer context (import from HERE, not SideDrawer)
│   └── usePWA.js         # Install prompt, online status, SW updates
└── utils/
    ├── native.js         # Capacitor: haptics, statusBar, keyboard, splash
    ├── jwLibraryLinks.js # JW Library deep links + jw.org URLs
    ├── bibleReadingSchedule.js # 366-day Bible reading schedule
    ├── pwa.js            # PWA install, cache, storage utilities
    ├── notifications.js  # Service worker notification helpers
    └── webVitals.js      # Core Web Vitals logging
```

## Routes

| Path | Page | Loading | Nav |
|------|------|---------|-----|
| `/` | Home | Eager | Bottom |
| `/study` | Study | Lazy | Bottom |
| `/goals` | Goals | Lazy | Bottom |
| `/stats` | Stats | Lazy | Side drawer |
| `/links` | Links | Lazy | Side drawer |
| `/settings` | Settings | Lazy | Side drawer |

## State Management

All stores use Zustand with `persist` middleware to localStorage:

| Store | Storage Key | Purpose |
|-------|------------|---------|
| progressStore | `jw-progress-storage` | Daily texts, prayers, family worship, Bible reading, meetings |
| gamificationStore | `jw-gamification-storage` | Points (100/level), 38 achievements, streaks |
| settingsStore | `jw-progress-settings` | Notifications, theme, Bible reading pace |
| newsStore | `jw-news-store` | Daily check-in streak (simplified) |
| goalsStore | `jw-goals-storage` | Goals and projects with tasks |
| memoriesStore | `jw-memories-storage` | Reflections indexed by date |

### Gamification System

Every activity records to `gamificationStore` via `record*()` methods:
- `recordDailyTextCompletion()` — +10 XP, updates streak
- `recordPrayerCompletion(allDone)` — +5 XP (+streak if all 3 done)
- `recordFamilyWorshipCompletion()` — +25 XP
- `recordBibleReading()` — +10 XP, updates streak
- `recordGoalCompleted()` — +20 XP
- `recordProjectCompleted()` — +30 XP
- `recordMeetingPrepared()` — +15 XP
- `recordReflection()` — +5 XP
- `recordNewsRead()` — +5 XP

Achievement unlocks are checked automatically after each activity. The `AchievementPopup` component (rendered globally in `App.jsx`) displays newly unlocked achievements.

## Build & Development

```bash
# Development
npm run dev              # Vite dev server only
npm start                # Dev server + API server (concurrently)

# Build
npm run build            # Production build → dist/
npm run preview          # Preview production build

# Mobile
npm run mobile:build     # Build + cap sync
npm run mobile:android   # Build + sync + open Android Studio
npm run mobile:ios       # Build + sync + open Xcode
npm run android:build:debug    # Full debug APK
npm run android:build:release  # Full release AAB

# Cap commands
npx cap sync android     # Sync web → Android
npx cap open android     # Open in Android Studio

# Quality
npm run lint             # ESLint
npm run format           # Prettier write
npm run format:check     # Prettier check
npm test                 # Vitest run once
npm run test:watch       # Vitest watch mode
npm run test:coverage    # Vitest with v8 coverage
```

## Styling

- **Theme colors:** jw-blue `#4A6FA4`, jw-green `#71BC37`
- **DaisyUI themes:** `light` and `dark` (toggled in Settings)
- **Custom CSS animations** in `src/index.css`: fade-in-up, slide-up, achievement-pop, confetti, flame, level-up, shimmer, and more
- **Safe area utilities:** `.pt-safe`, `.pb-safe` etc. for notched devices
- **Touch targets:** `.btn-touch` ensures 44px minimum

## Key Conventions

### Imports
- **useDrawer:** Always import from `src/hooks/useDrawer.js`, NOT from `SideDrawer.tsx`
- **READING_PACE_OPTIONS:** Exported from `src/stores/settingsStore.ts` — do not remove
- **Icons:** Use `lucide-react` (not heroicons, not font-awesome)
- **Types:** Use `import type { ... }` for type-only imports from lucide-react

### Component Patterns
- All pages have a gradient header with `paddingTop: 'env(safe-area-inset-top)'`
- Haptic feedback via `haptics.light()` / `haptics.success()` on user interactions
- Toast notifications via `useToast()` hook from `components/Toast.jsx`
- Gamification: call the appropriate `record*()` method when a user completes an activity

### State Patterns
- Zustand stores use `(set, get) => ({...})` pattern with `persist` middleware
- `get()` for computed values (streaks, rates), `set()` for mutations
- All stores `partialize` to exclude actions from persistence

## DO NOT

- Do not remove the `READING_PACE_OPTIONS` export from `settingsStore.ts`
- Do not change the import path of `useDrawer` back to `SideDrawer`
- Do not commit the keystore password (`JWHabits2026!`) to git
- Do not delete `android/app/jw-habits-release.keystore`
- Do not change the app ID from `com.ashbi.jwnews` without updating both `capacitor.config.json` and Android build files

## Testing

Tests live alongside source files (`*.test.js` / `*.test.ts`):
- `src/stores/settingsStore.test.js`
- `src/stores/progressStore.test.js`
- `src/stores/newsStore.test.ts`
- `src/stores/gamificationStore.test.ts`
- `src/stores/memoriesStore.test.ts`
- `src/stores/goalsStore.test.js`
- `src/components/DailyTasksSection.test.tsx`
- `src/components/PrayerTrackingCard.test.tsx`
- `src/components/MeetingCard.test.tsx`
- `src/utils/jwLibraryLinks.test.js`
- `src/utils/notifications.test.js`

Config: `vitest.config.js` with jsdom environment, globals enabled, v8 coverage.

### End-to-end verification (persona harness)

The `_verify-2026-06-12.cjs` script at the repo root is the canonical
QA harness — 11 Playwright tests against the live SPA, modeled on
the 11 critical FAIL claims from the 2026-06-11 persona runs.

**Run locally** (preferred — VPS is unstable, this is faster):

```bash
# 1. Build the dist (one-time per change)
npm run build

# 2. Start the SPA-aware static server in another terminal
node scripts/serve-dist.cjs ./dist 8766

# 3. Run the verification
node _verify-2026-06-12.cjs
# override URL with: VERIFY_URL=http://127.0.0.1:9999 node _verify-2026-06-12.cjs
```

`scripts/serve-dist.cjs` is required — `python3 -m http.server` does
NOT fall back to `index.html` for client-side routes, so `/about`,
`/settings`, etc. return 404 without it. The script is also where
the `?bust=` cache-buster pattern lives (or rather, was retired from).

**Run against a remote**: set `VERIFY_URL=https://jwhabits.ashbi.ca/`.
The script expects 200s on every route and a properly-served PWA shell.

**What it tests** (each row is one test, T1-T11):
- T1: Morning Prayer click mutates the prayer counter
- T2: Daily Text click writes to `jw-progress-storage`
- T3: Bible chapter click writes to `jw-progress-storage`
- T4: "How this app works" link navigates to /about
- T5-T6: /stats, /links pages render content
- T7: Onboarding does NOT reappear for a returning user
- T8: Dark mode toggle writes to localStorage AND updates `data-theme`
- T9: Service Quick Add writes to `jw-service-storage` + shows a toast
- T10: Goals "New" button opens a form
- T11: /projects page renders content

**Why these are all green as of 2026-06-12**: see commit `18578ab` —
the previous version (`_verify-2026-06-11.cjs`) had three bugs that
caused 7 false-negatives (URL placed the route in the query string,
onboarding flag wiped after being set, force-clicks on off-screen
elements). The current script and the live app both pass.

## PWA Configuration

- Service worker: auto-update via Workbox (vite-plugin-pwa)
- Offline caching: JW.org (NetworkFirst), images (CacheFirst), fonts (CacheFirst), API (StaleWhileRevalidate)
- App shortcuts: Daily Text, Study, Stats, Settings
- Install prompt with 7-day dismissal (`InstallPrompt.jsx`)
- Update prompt when new SW detected (`UpdatePrompt.jsx`)

## Mobile (Capacitor)

- Splash screen: 2s, `#4A6FA4` background, immersive
- Status bar: light style, `#4A6FA4` background (Android)
- Keyboard: body resize mode
- Haptics: full integration via `src/utils/native.js`
- Back button: double-tap to exit (Android, handled in `main.jsx`)

## Data Files

- `public/data/bible-reading.json` — Bible reading schedule data
- `public/data/meeting-workbooks.json` — Meeting workbook data by ISO week

## Next Steps (Launch)

- Get screenshots for Google Play listing
- Register Google Play Developer account ($25)
- Write/host privacy policy at ashbi.ca/privacy/jw-habits
- Generate signed Android bundle via Android Studio
- Submit to Google Play Store
