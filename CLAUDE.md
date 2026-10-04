# CLAUDE.md — Habit Tracker

**Last audited against source: 2026-10-04.**
If you change anything in this doc, bump the date. If you change anything in `src/`, re-check this doc.

## What this is

A Capacitor (React + Vite) mobile/PWA **habit tracker**. The home page is a list of habit
rows; each row opens a link the user saved themselves, and remembers whether it was done
today. All state is on-device.

**One user-facing page.** Settings is an inline accordion on Home, not a route.

- **App ID:** `ca.ashbi.habittracker`
- **Version:** 4.2.0
- **Node:** >= 18.0.0

### The app ships no destination links

This is the central design constraint. There is no bundled catalogue, no built-in content,
and **no third-party URL anywhere in the shipped code**. Row destinations come from the
user's own `links.primary` / `links.secondary` settings, validated at render time by
`resolveUserLink`. An unset slot means the row opens nothing.

Do not reintroduce hard-coded external URLs. If a feature seems to need one, it needs a
user-editable slot instead.

## Stack (verified against `package.json` 2026-09-21)

| Layer | Technology | Version |
|---|---|---|
| Frontend | React 19 + Vite 8 | `react: 19.2.8` (exact, with `react-dom`), `vite: ^8.1.5` |
| Routing | React Router DOM 7 | 1 page (`/`) + `/share` + `*` catch-all → home |
| State | localStorage only | no Zustand, no Context, no Redux |
| Styling | Tailwind CSS 4 + DaisyUI 5 | `@tailwindcss/vite` plugin |
| Icons | lucide-react | `1.16.0` |
| i18n | i18next + react-i18next + i18next-browser-languagedetector | en / es / fr |
| Mobile | Capacitor 8 (iOS + Android) | `@capacitor/* ^8.x` |
| PWA | vite-plugin-pwa 1.3 + Workbox (injectManifest, `src/sw.js`) | |
| Testing | Vitest 4 + Testing Library + Playwright | 199 tests / 15 files, 7 smoke, 6 journeys |
| Linting | ESLint 9 + Prettier 3 | |

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve `dist/` on :4173 |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run format:check` | Prettier check (`format` to write) |
| `npm run smoke:spawn` | Playwright smoke suite, spawns preview |
| `npm run journeys` | End-to-end UI journeys (needs preview running) |

## Source tree

```
src/
├── main.jsx                        # Entry: error logging, back button, SW updates, theme, i18n
├── App.jsx                         # Router + PWA chrome
├── sw.js                           # Workbox service worker
├── pages/
│   ├── Home.jsx                    # The only user-facing page
│   └── Share.jsx                   # PWA share_target landing
├── components/
│   ├── ErrorBoundary.jsx
│   ├── InstallPrompt.jsx
│   ├── OfflineIndicator.jsx
│   ├── SettingsAccordion.jsx       # Meeting days, reminders, and the link slots
│   └── UpdatePrompt.jsx
├── hooks/
│   ├── useHabitState.js            # Per-day state, first-done flag, best streak
│   └── usePWA.js
└── utils/
    ├── bibleBooks.ts               # 66-book name → number map
    ├── bibleReadingTracker.js      # Bible-reading daily tracker
    ├── dailyBibleReading.js        # 366-entry reading schedule (labels only)
    ├── doneState.js                # {done, note} shape helpers + legacy compat
    ├── habitProgress.js            # Calendar-based progress labels
    ├── native.js                   # Capacitor wrappers
    ├── notificationScheduler.js    # Web Notification API reminder
    ├── pwa.js
    ├── relativeDate.js
    ├── safeUrls.js                 # URL allowlisting
    ├── settingsStore.js            # Versioned settings store
    ├── streak.js                   # Streak + progress maths
    ├── userLinks.js                # resolveUserLink / userLinksFrom
    └── weekContext.js              # Week label + neutral Today-row label
```

## The rows

| Row | Key | Destination | Notes |
|---|---|---|---|
| Today | `today` | primary | Label from `getTodayRow`, driven by meeting-day settings |
| Daily reading | `text` | primary | Day-of-month progress label |
| Bible reading | `bible` | primary | Reading label from the bundled schedule |
| Meeting prep | `meeting` | primary | Three generic sub-section labels |
| Family worship | `family` | primary | Three timing suggestions |
| This week | `thisWeek` | primary | Monday–Sunday range |
| Events | `conventions` | secondary | Optional |

`visibleKeys` in `Home.jsx` is the source of truth for what `todayProgress` counts.

## State model

All state is on-device. **The `jw-` prefixes are frozen persistence keys, not branding** —
they ship in real installs, so renaming them silently discards user history.

| Key | Shape | Purpose |
|---|---|---|
| `jw-daily-habits-state` | `{ date, done, history }` | Per-day habit state |
| `jw-daily-habits-state.done[k]` | `{ done, note }` or legacy `boolean` | Per-row check + note (≤200 chars) |
| `jw-daily-habits-state.history` | `string[]` ISO dates | Dates with any check; pruned to 7 days |
| `jw-habits-first-done` | `'1'` | First-launch hint dismissed |
| `jw-habits-best-streak` | numeric string | All-time best streak |
| `jw-user-settings` | `{ midweekDay, weekendDay, reminderTime, quietHours, links }` | Settings |
| `jw-bible-reading-days` | `string[]` ISO dates | Bible-reading tracker |
| `jw-error-logs` | `ErrorLog[]` (last 20) | Dev error capture |

Readers must go through `doneState.js` (`getDone`, `setDone`, `getNote`) for backward
compatibility with the legacy boolean shape.

## Known issues

- **Deploy was down from 2026-07-24.** `deploy-ashbi.yml` called a reusable workflow in the
  private, archived `camster91/ashbi-deploy` repo, so every run failed at startup. It is now
  self-contained: it runs after a successful `Build and Push Image` on `main` and deploys the
  immutable `ghcr.io/camster91/jw-habits:main-<sha7>` image over SSH. Can also be run by hand
  (`workflow_dispatch`, optional `sha`).
- **The live site serves a self-signed TLS certificate** (seen 2026-10-04). That is the edge
  proxy on the VPS, not the app; the deploy only warns about it.
- **Hosted CI runs again** (re-enabled 2026-10-02 after being disabled since 2026-09-22).
  `ci.yml` runs install, `npm audit --audit-level=high`, lint, tests, build, format check
  and gitleaks. Playwright smoke + journeys (`smoke.yml`) and the image build also run on PRs.
- **npm 10 crashes** (`edgesOut`) re-resolving the lockfile. Use
  `npx npm@11 install --package-lock-only`.

## Rules for changes

- **No new external URLs in shipped code.** User-editable slots only.
- **Do not rename `jw-` storage keys** or the `jw-storage-full` / `jw-offline-open` events.
- **Keep the smoke + journey suites green.** Both exit non-zero on failure; do not let a
  suite print FAIL and still return 0.
- **`deploy-ashbi.yml` keeps its `jw-habits` identifiers** — they name a real container and
  a ghcr.io image. Renaming them breaks the deploy path.
