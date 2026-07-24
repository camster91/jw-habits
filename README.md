# JW Habits

**A spiritual habits tracking app for building consistent daily routines.**

JW Habits is a mobile-first progressive web application for Jehovah's Witnesses. It helps users build and maintain daily spiritual habits. Built with React 19 and Capacitor, it offers a native app experience across iOS, Android, and web platforms.

**Live:** https://jwhabits.ashbi.ca
**Package:** `com.ashbi.jwnews` (App Store + Google Play)
**Version:** 4.2.0 (iOS build 421)
**Platforms:** iOS · Android · Web (PWA)

## What this is

A Capacitor (React + Vite) mobile/PWA app for Jehovah's Witnesses. A **habit tracker with quick links to jw.org surfaces** — the app opens jw.org pages in a new tab and remembers which ones you already did today. The actual study/prayer/reading happens on jw.org itself. The app just remembers what you've done so you don't have to.

**One user-facing page.** The home is an iOS-style list of habit rows. Tap a row → open jw.org. Tap the checkbox → mark the habit done for today. Per-day state resets at midnight (localStorage-keyed). All state is on-device; no backend, no auth, no server.

## Tech stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React 19 + Vite 8 | `react: ^19.2.0`, `vite: ^8.1.5` |
| Routing | React Router DOM 7 | 1 page (`/`) + `/share` + `*` catch-all → home |
| State | localStorage only (per-day key + per-feature keys) | no Zustand, no React Context, no Redux |
| Styling | Tailwind CSS 4 + DaisyUI 5 | `@tailwindcss/vite` plugin |
| Icons | lucide-react | `1.16.0` |
| i18n | i18next + react-i18next + i18next-browser-languagedetector | en / es / fr |
| Dates | date-fns | `^4.4.0` |
| Mobile | Capacitor 8 (iOS + Android) | `@capacitor/* ^8.x` |
| PWA | vite-plugin-pwa 1.3 + Workbox (injectManifest, custom `src/sw.js`) | |
| Testing | Vitest 4 + Testing Library + Playwright | 273 tests, 17 files |
| Linting | ESLint 9 + Prettier 3 | |

**Node:** >= 18.0.0

## Quick start

```bash
git clone https://github.com/camster91/jw-habits.git
cd jw-habits
npm install --ignore-scripts          # macOS fix for sharp native build
npm run dev                           # vite dev server at http://localhost:5173
```

The whole app is one page at `/`. Open `http://localhost:5173` in your browser.

### Common scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build to `dist/` (PWA SW included) |
| `npm run preview` | Serve the production build at `http://localhost:4173` |
| `npm test` | Run all unit tests (Vitest) |
| `npm run test:coverage` | Run tests + coverage report (v8) |
| `npm run lint` | ESLint |
| `npm run format:check` | Prettier check (use `npm run format` to write) |
| `npm audit` | Check for vulnerable dependencies |
| `npm run smoke` | Run Playwright smoke suite (assumes `preview` running) |
| `npm run smoke:spawn` | Smoke suite, auto-spawns `vite preview` |
| `npm run verify:persona` | Original T1-T17 persona suite against live prod |

## Routes

| Path | Page | Notes |
|---|---|---|
| `/` | Home | The only user-facing page |
| `/share` | Share | OS-level entry point; receives URLs shared from other apps |
| `*` (catch-all) | Home | `/ideas`, `/about`, `/settings`, anything else all render the home |

There is no settings page route, no about page route, no ideas page route. Settings is rendered as a `<SettingsAccordion>` collapsed section inside Home.

## Home page shape

1. **Greeting** — time-of-day (`greeting.morning|afternoon|evening|night`)
2. **Date subtitle** — `Tuesday, July 22`
3. **Week strip** — Mon..Sun, today highlighted
4. **Weekly dots strip** — 7 dots; filled = a habit was checked that day
5. **Streak + today-progress line** — `🔥 N day streak · best X · today Y/Z`
6. **First-launch hint** — `Tap a row to open jw.org. Tap the checkbox when done.`
7. **Today row** — date-aware: Sunday = Public Meeting + Watchtower Study; Mon/Wed/Thu/Fri = Midweek Meeting Prep; Tuesday = Tonight — Midweek Meeting; Saturday = Field Service
8. **Daily text** — `jwlibrary:///showDailyText?...` deep link
9. **Daily Bible reading** — `jwlibrary:///finder?wtlocale=E&bible=BBCCCVVV-BCCCVVV`
10. **Year text** — current year's scripture on jw.org
11. **Meeting prep** — `jw.org/en/library/jw-meeting-workbook/`
12. **Family worship** — `jw.org/en/bible-teachings/family/`
13. **This week** — date-aware MWB schedule
14. **Sunday Watchtower Study** — visible Sat 8 AM → Sun end-of-day; `jwlibrary:///finder?...&docid=...` deep link
15. **Conventions** — convention finder on jw.org
16. **Memorial row** — only visible March/April (30 days before to day-of)
17. **Settings accordion** — collapsed by default
18. **Footer disclaimer** — "Unofficial third-party tool. Not affiliated with jw.org."

Row visibility is conditional based on date and settings — `todayProgress()` only counts rows the user actually sees.

## State (localStorage only)

All state is on-device. Clearing browser/site data wipes your streaks.

| Key | Shape | Purpose |
|---|---|---|
| `jw-daily-habits-state` | `{ date, done, history }` | Per-day habit state. `done` keys: `today`, `text`, `bible`, `meeting`, `family`, `thisWeek`, `memorial`, `yearText`, `sundayWatchtower`, `conventions` |
| `jw-daily-habits-state.done[k]` | `{ done: boolean, note: string }` or legacy `boolean` | Per-row check + optional note (≤200 chars) |
| `jw-daily-habits-state.history` | `string[]` of ISO YYYY-MM-DD | Dates with any habit checked; pruned to last 7 days on load |
| `jw-habits-first-done` | `'1'` | First-launch hint dismissed |
| `jw-habits-best-streak` | ISO numeric string | All-time best streak (monotonic) |
| `jw-user-settings` | `{ meetingDays, midweekDay, weekendDay, reminderTime, quietHours, ... }` | SettingsAccordion state |
| `jw-progress-settings` | `{ state: { theme: 'light'\|'dark' } }` | Legacy theme persistence |
| `jw-sunday-watchtower-weeks` | `string[]` of ISO YYYY-MM-DD | Sundays with attendance checked |
| `jw-bible-reading-days` | `string[]` of ISO YYYY-MM-DD | Bible-reading tracker |
| `jw-error-logs` | `ErrorLog[]` (last 20) | Global error capture (dev only) |

**Shape helpers** (`src/utils/doneState.js`): `getDone`, `setDone`, `isDone`, `getNote`. All readers should go through these helpers for backward compat with the legacy boolean shape.

## Source tree

```
src/
├── main.jsx              # Entry: error logging, back button, SW updates, theme, i18n
├── App.jsx               # Router (Home + /share + catch-all) + PWA chrome
├── sw.js                 # Workbox service worker (precache + SPA fallback)
├── index.css             # Tailwind 4 + iOS tokens + dark-mode overrides
├── pages/
│   ├── Home.jsx          # The only user-facing page (~1149 lines — split candidate)
│   └── Share.jsx         # PWA share_target landing
├── components/
│   ├── ErrorBoundary.jsx
│   ├── InstallPrompt.jsx
│   ├── OfflineIndicator.jsx
│   ├── SettingsAccordion.jsx
│   └── UpdatePrompt.jsx
├── hooks/
│   └── usePWA.js
├── locales/
│   ├── en.json
│   ├── es.json
│   └── fr.json
├── test/
│   └── setup.js          # Vitest setup: i18n init, localStorage/Notification/SW mocks
└── utils/
    ├── bibleBooks.ts          # 66-book name → number map
    ├── bibleReadingTracker.js # Bible-reading daily tracker
    ├── dailyBibleReading.js   # 366-entry schedule → jwlibrary:// deep link
    ├── doneState.js           # NEW shape helpers + legacy compat
    ├── habitProgress.js
    ├── jwLibraryLinks.js      # All jw.org / jwlibrary:// URL builders
    ├── native.js              # Capacitor wrappers: haptics, statusBar, keyboard, splash
    ├── notificationScheduler.js # Web Notification API + weekly reminders
    ├── pwa.js
    ├── relativeDate.js
    ├── settingsStore.js       # localStorage wrapper
    ├── streak.js              # currentStreak, bestStreakFromHistory, todayProgress
    └── sundayWatchtowerTracker.js # Weekly Sunday Watchtower attendance counter
```

## Deployment

Production deploys via the `deploy-ashbi.yml` workflow → `camster91/ashbi-deploy` reusable → pull-and-up on the host. The image is built by `build-and-push.yml` and pushed to `ghcr.io/camster91/jw-habits`.

The Dockerfile (`Dockerfile`) is multi-stage: `node:22-alpine` builder + `nginx:1.27-alpine` runtime. Both base images are digest-pinned.

A Caddy vhost on the host serves the container at `https://jwhabits.ashbi.ca` via reverse-proxy to the container's port 80.

## Testing

### Unit tests (Vitest)

```bash
npm test                # 273 tests across 17 files
npm run test:coverage   # with coverage report (v8)
```

Tests cover the `src/utils/*` pure-function helpers — `streak`, `doneState`, `habitProgress`, `bibleReadingTracker`, `sundayWatchtowerTracker`, `jwLibraryLinks`, etc. Component tests for `Home`, `Share`, `SettingsAccordion` are a known gap (issue #136).

### Smoke suite (Playwright)

```bash
npm run smoke:spawn    # auto-spawns vite preview, then runs tests
```

7 tests covering the most critical paths: per-day reset, done-state persistence, note-only rows don't count as done, legacy boolean shape still works, etc. Issue #134 tracks end-to-end verification of the gitleaks gate; PR #130 added this suite.

### Persona suite (against live prod)

```bash
npm run verify:persona
```

17 T-numbered tests against `https://jwhabits.ashbi.ca`. Originally written 2026-06-12 as the manual QA script.

## Mobile development

```bash
npm run mobile:ios       # build + cap sync + open Xcode
npm run mobile:android   # build + cap sync + open Android Studio
```

Then build & run from the IDE. iOS simulator is fastest for quick iteration.

The `@capacitor/*` plugins in use: `@capacitor/core`, `@capacitor/ios`, `@capacitor/android`, `@capacitor/cli`, `@capacitor/app`, `@capacitor/haptics`, `@capacitor/keyboard`, `@capacitor/local-notifications`, `@capacitor/splash-screen`, `@capacitor/status-bar`. **Not** in use: `@capacitor/push-notifications` (removed in PR #130 — was declared but never registered).

## Architecture notes

- **No backend, no auth, no sync.** This is deliberate — the app is a personal memory aid, not a service.
- **Per-day reset.** The localStorage `jw-daily-habits-state.date` is checked on every load; if it doesn't match today, `done` is wiped. `history` is pruned to last 7 days.
- **Notifications fire via the web Notification API** (`serviceWorker.showNotification`), not Capacitor push. This works in the installed PWA on Android; on iOS the limitation is that the page must be open for `setTimeout`-based reminders to fire.
- **PWA shortcuts.** The web manifest declares shortcuts (read, settings, etc.) — they all route to `/` which renders the Home page with the appropriate section auto-expanded where applicable.
- **No analytics, no telemetry, no crash reporting.** Privacy-preserving by default.

## For agents / future contributors

Start by reading [`CLAUDE.md`](./CLAUDE.md) — it documents the canonical source tree, state model, stack, and known caveats. It is the source of truth for the codebase; this README is the user-facing summary.

Recent audits: `REVIEW-2026-07-22.md` (first), `REVIEW-2026-07-22-EVENING.md` (post-fix), `REVIEW-2026-07-23-POST-MERGE.md` (post-merge).

## What this app does NOT do (and shouldn't)

- No auth, no login, no account, no sync between devices
- No server-side state, no backend, no API calls beyond jw.org links the user clicks
- No analytics, no telemetry, no crash reporting
- No DRM, no IAPs, no ads
- No sign-in to jw.org — links open jw.org as a visitor

## License

Unreleased. Personal project — not licensed for redistribution.