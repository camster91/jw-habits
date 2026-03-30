# CLAUDE.md — JW Habits

## What This Is

A Capacitor (React + Vite) mobile/PWA app for Jehovah's Witnesses to track daily spiritual habits. Published as **JW Habits** on Android/iOS.

- **App ID:** `com.ashbi.jwnews`
- **Version:** 3.0.0
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
├── pages/                # 9 route pages (lazy-loaded except Home)
│   ├── Home.jsx          # Dashboard: daily tasks, prayers, family worship, study
│   ├── News.jsx          # Daily check-in tracker with streaks
│   ├── Meeting.jsx       # Meeting prep (midweek/weekend)
│   ├── Goals.jsx         # Goal tracking with categories
│   ├── Projects.jsx      # Project management with tasks
│   ├── Stats.jsx         # Gamification stats, achievements, streaks
│   ├── Links.jsx         # JW.org resource links (8 categories, 50+ links)
│   ├── Memories.jsx      # Daily reflections journal
│   └── Settings.tsx      # Notifications, theme, data import/export
├── stores/               # Zustand state (all persisted)
│   ├── progressStore.ts  # Daily texts, prayers, family worship, Bible, meetings
│   ├── gamificationStore.ts # Points, levels, 38 achievements, streaks
│   ├── settingsStore.ts  # Notifications, theme, reading pace
│   ├── newsStore.ts      # Daily check-in history and streaks
│   ├── goalsStore.js     # Goals + projects CRUD
│   └── memoriesStore.ts  # Reflections by date
├── components/           # ~20 reusable components
│   ├── BottomNav.jsx     # 5-tab nav: Home, News, Meeting, Goals, Projects
│   ├── SideDrawer.tsx    # Hamburger drawer: Stats, Links, Settings, Memories
│   ├── DailyTasksSection.tsx
│   ├── PrayerTrackingCard.jsx
│   ├── FamilyWorshipCard.jsx
│   ├── StudyTab.jsx
│   ├── MeetingCard.jsx
│   ├── WeeklyBibleReading.jsx
│   ├── GoalsTab.jsx
│   ├── ProjectsTab.jsx
│   ├── AchievementPopup.tsx  # Confetti + popup on unlock
│   ├── Toast.jsx         # Context-based toast system (useToast hook)
│   ├── ErrorBoundary.jsx
│   ├── LoadingSpinner.jsx / Skeleton.jsx
│   ├── OfflineIndicator.jsx / UpdatePrompt.jsx / InstallPrompt.jsx
│   ├── NewsCard.jsx
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
| `/news` | News | Lazy | Bottom |
| `/meeting` | Meeting | Lazy | Bottom |
| `/goals` | Goals | Lazy | Bottom |
| `/projects` | Projects | Lazy | Bottom |
| `/stats` | Stats | Lazy | Side drawer |
| `/links` | Links | Lazy | Side drawer |
| `/settings` | Settings | Lazy | Side drawer |
| `/memories` | Memories | Lazy | Side drawer |

## State Management

All stores use Zustand with `persist` middleware to localStorage:

| Store | Storage Key | Purpose |
|-------|------------|---------|
| progressStore | `jw-progress-storage` | Daily texts, prayers, family worship, Bible reading, meetings |
| gamificationStore | `jw-gamification-storage` | Points (100/level), 38 achievements, streaks |
| settingsStore | `jw-progress-settings` | Notifications, theme, Bible reading pace |
| newsStore | `jw-news-store` | Daily check-in history, streak |
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

Tests live alongside source files (`*.test.js`):
- `src/stores/settingsStore.test.js`
- `src/stores/progressStore.test.js`
- `src/utils/jwLibraryLinks.test.js`
- `src/utils/notifications.test.js`

Config: `vitest.config.js` with jsdom environment, globals enabled, v8 coverage.

## PWA Configuration

- Service worker: auto-update via Workbox (vite-plugin-pwa)
- Offline caching: JW.org (NetworkFirst), images (CacheFirst), fonts (CacheFirst), API (StaleWhileRevalidate)
- App shortcuts: Daily Text, News, Stats, Settings
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
