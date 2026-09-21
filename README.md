# Habit Tracker

**A private, offline-first habit tracker that runs on your own device.**

A mobile-first progressive web app (also packaged for iOS and Android via Capacitor)
that tracks a short list of daily habits. Tap a row to open the link you saved for it;
tap the checkbox to mark it done for today. Everything stays on your device — there is
no backend, no account, and no network call of its own.

**Package:** `ca.ashbi.habittracker`
**Version:** 4.2.0
**Platforms:** iOS · Android · Web (PWA)

## What this is

A Capacitor (React + Vite) mobile/PWA app. The home page is an iOS-style list of habit
rows. Each row opens **a link you saved yourself** in Settings, and remembers whether you
did it today.

The app ships **no** destination links of its own. There is no built-in content, no
bundled catalogue, and no third-party service baked in — you paste the links you want, or
leave them empty and use the rows purely as a checklist.

**One user-facing page.** Per-day state resets at midnight (localStorage-keyed). All state
is on-device; no backend, no auth, no server.

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
| Testing | Vitest 4 + Testing Library + Playwright | 199 tests / 15 files, plus 7 smoke + 6 journey checks |
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
| `npm run journeys` | End-to-end UI journeys (needs `npm run preview` running) |

## Routes

| Path | Page | Notes |
|---|---|---|
| `/` | Home | The only user-facing page |
| `/share` | Share | OS-level entry point; receives URLs shared from other apps |
| `*` (catch-all) | Home | `/ideas`, `/about`, `/settings`, anything else all render the home |

There is no settings route, no about route, no ideas route. Settings is rendered as a
`<SettingsAccordion>` collapsed section inside Home.

## Home page shape

1. **Greeting** — time-of-day (`greeting.morning|afternoon|evening|night`)
2. **Date subtitle** — e.g. `Tuesday, July 22`
3. **Week strip** — Mon..Sun, today highlighted
4. **Weekly dots strip** — 7 dots; filled = a habit was checked that day
5. **Streak + today-progress line** — `🔥 N day streak · best X · today Y/Z`
6. **First-launch hint** — `Tap a row to open its link. Tap the checkbox when done.`
7. **Habit rows** — see below
8. **Settings accordion** — collapsed by default
9. **Footer** — `A private habit tracker. Your data stays on this device.`

### The rows

| Row | Key | Destination | Notes |
|---|---|---|---|
| Today | `today` | primary link | Label only; changes with your meeting-day settings |
| Daily reading | `text` | primary link | Shows a day-of-month progress label |
| Bible reading | `bible` | primary link | Shows today's entry from the bundled 366-entry reading schedule |
| Meeting prep | `meeting` | primary link | Three generic sub-section labels |
| Family worship | `family` | primary link | Three timing suggestions |
| This week | `thisWeek` | primary link | Shows the current Monday–Sunday date range |
| Events | `conventions` | secondary link | Optional |

Every row's destination comes from the user's own saved link slots, configured in
Settings. An unset slot means the row opens nothing.

## State (localStorage only)

All state is on-device. Clearing browser/site data wipes your streaks.

| Key | Shape | Purpose |
|---|---|---|
| `jw-daily-habits-state` | `{ date, done, history }` | Per-day habit state |
| `jw-daily-habits-state.done[k]` | `{ done: boolean, note: string }` or legacy `boolean` | Per-row check + optional note (≤200 chars) |
| `jw-daily-habits-state.history` | `string[]` of ISO YYYY-MM-DD | Dates with any habit checked; pruned to last 7 days on load |
| `jw-habits-first-done` | `'1'` | First-launch hint dismissed |
| `jw-habits-best-streak` | ISO numeric string | All-time best streak (monotonic) |
| `jw-user-settings` | `{ midweekDay, weekendDay, reminderTime, quietHours, links }` | SettingsAccordion state |
| `jw-bible-reading-days` | `string[]` of ISO YYYY-MM-DD | Bible-reading tracker |
| `jw-error-logs` | `ErrorLog[]` (last 20) | Global error capture (dev only) |

> **The `jw-` prefixes are frozen.** They are persistence keys that ship in real installs,
> not branding. Renaming them would silently discard every existing user's history.

**Shape helpers** (`src/utils/doneState.js`): `getDone`, `setDone`, `getNote`. All readers
should go through these helpers for backward compatibility with the legacy boolean shape.

## Source tree

```
src/
├── main.jsx              # Entry: error logging, back button, SW updates, theme, i18n
├── App.jsx               # Router (Home + /share + catch-all) + PWA chrome
├── sw.js                 # Workbox service worker (precache + SPA fallback)
├── index.css             # Tailwind 4 + iOS tokens + dark-mode overrides
├── pages/
│   ├── Home.jsx          # The only user-facing page
│   └── Share.jsx         # PWA share_target landing
├── components/
│   ├── ErrorBoundary.jsx
│   ├── InstallPrompt.jsx
│   ├── OfflineIndicator.jsx
│   ├── SettingsAccordion.jsx
│   └── UpdatePrompt.jsx
├── hooks/
│   ├── useHabitState.js       # Per-day state, first-done flag, best streak
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
    ├── dailyBibleReading.js   # 366-entry reading schedule (labels only, no links)
    ├── doneState.js           # Shape helpers + legacy compat
    ├── habitProgress.js       # Calendar-based progress labels
    ├── native.js              # Capacitor wrappers: haptics, statusBar, keyboard, splash
    ├── notificationScheduler.js # Web Notification API reminder
    ├── pwa.js
    ├── relativeDate.js
    ├── safeUrls.js            # URL allowlisting for share-target + navigation
    ├── settingsStore.js       # Versioned settings store
    ├── streak.js              # currentStreak, bestStreakFromHistory, todayProgress
    ├── userLinks.js           # The user's own destination link slots
    └── weekContext.js         # Week label + neutral Today-row label
```

## Deployment

Production deploys via the `deploy-ashbi.yml` workflow → `camster91/ashbi-deploy` reusable
→ pull-and-up on the host. The image is built by `build-and-push.yml` and pushed to
`ghcr.io/camster91/jw-habits`.

The Dockerfile is multi-stage: `node:22-alpine` builder + `nginx:1.27-alpine` runtime.
Both base images are digest-pinned.

> **Status:** the deploy pipeline has not succeeded since 2026-07-24 and the host returns
> 502. See "Known issues" below.

## Testing

### Unit tests (Vitest)

```bash
npm test                # 199 tests across 15 files
npm run test:coverage   # with coverage report (v8)
```

Tests cover the `src/utils/*` pure-function helpers and the key hooks/components
(`Home`, `useHabitState`, `settingsStore`).

### Smoke suite (Playwright)

```bash
npm run smoke:spawn    # auto-spawns vite preview, then runs tests
```

### End-to-end journeys (Playwright)

```bash
npm run build && npm run preview &
npm run journeys
```

Drives the real UI: open Settings, save a link, confirm the rows pick it up, enter an
invalid link and check the notice appears, tap a checkbox, reload, and confirm the state
survived. Exits non-zero on any failure.

## Mobile development

```bash
npm run mobile:ios       # build + cap sync + open Xcode
npm run mobile:android   # build + cap sync + open Android Studio
```

The `@capacitor/*` plugins in use: `core`, `ios`, `android`, `cli`, `app`, `haptics`,
`keyboard`, `local-notifications`, `splash-screen`, `status-bar`. **Not** in use:
`@capacitor/push-notifications` (was declared but never registered).

## Architecture notes

- **No backend, no auth, no sync.** Deliberate — the app is a personal memory aid.
- **Per-day reset.** `jw-daily-habits-state.date` is checked on every load; if it doesn't
  match today, `done` is wiped. `history` is pruned to the last 7 days.
- **Shares are allowlist-gated.** A link received by the OS share sheet can only be opened
  if its host matches one of the user's own saved link slots.
- **Notifications fire via the web Notification API**, not Capacitor push. On iOS the page
  must be open for `setTimeout`-based reminders to fire.
- **No analytics, no telemetry, no crash reporting.** Privacy-preserving by default.

## Known issues

- **Deploy is down.** `deploy-ashbi.yml` has failed on every run since 2026-07-24 and the
  host serves 502. The app itself builds and runs locally.
- **Hosted CI does not run.** Jobs queue but never allocate a runner.

## What this app does NOT do

- No auth, no login, no account, no sync between devices
- No server-side state, no backend, no API calls
- No analytics, no telemetry, no crash reporting
- No DRM, no IAPs, no ads

## License

MIT — see [LICENSE](./LICENSE).
