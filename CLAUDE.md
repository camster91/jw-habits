# CLAUDE.md — JW Habits

**Last audited against source: 2026-07-22** (full review in `REVIEW-2026-07-22.md`).
If you change anything in this doc, bump the date. If you change anything in `src/`, re-check this doc.

## What this is

A Capacitor (React + Vite) mobile/PWA app for Jehovah's Witnesses. A **habit tracker with quick links to jw.org surfaces** — the app opens jw.org pages in a new tab and remembers which ones you already did today. The actual study/prayer/reading happens on jw.org itself.

**One user-facing page.** The home is an iOS-style list of habit rows. Tap a row → open jw.org. Tap the checkbox → mark the habit done for today. Per-day state resets at midnight (localStorage-keyed). All state is on-device; no backend, no auth, no server.

- **App ID:** `com.ashbi.jwnews` (legacy name from the JW News era; alias `jwnews` is Google Play-locked)
- **Version:** 4.2.0 (iOS build 421)
- **Live URL:** `https://jwhabits.ashbi.ca/`
- **Node:** >= 18.0.0

## Stack (verified against `package.json` 2026-07-22)

| Layer | Technology | Version |
|---|---|---|
| Frontend | React 19 + Vite 8 | `react: ^19.2.0`, `vite: ^8.1.5` |
| Routing | React Router DOM 7 | 1 page (`/`) + `/share` + `*` catch-all → home |
| State | localStorage only (per-day key + per-feature keys) | no Zustand, no React Context, no Redux |
| Styling | Tailwind CSS 4 + DaisyUI 5 | `@tailwindcss/vite` plugin |
| Icons | lucide-react | `1.16.0` (latest is 1.25.0; dep is verified legit, just pinned old) |
| i18n | i18next + react-i18next + i18next-browser-languagedetector | en/es/fr |
| Dates | date-fns | `^4.4.0` |
| Mobile | Capacitor 8 (iOS + Android) | `@capacitor/* ^8.x` |
| PWA | vite-plugin-pwa 1.3 + Workbox (injectManifest, custom `src/sw.js`) | |
| Testing | Vitest 4 + Testing Library + Playwright | 287 tests, 17 files |
| Linting | ESLint 9 + Prettier 3 | |

**Removed:** `@capacitor/push-notifications` (declared + configured, never registered — soft App Store policy violation; notifications fire via web Notification API + `serviceWorker.showNotification` instead). `zustand` (declared but never imported).

## Source tree (verified 2026-07-22)

```
src/
├── main.jsx              # Entry: error logging, back button, SW updates, theme at startup, i18n init
├── App.jsx               # Router (Home + /share + catch-all) + PWA chrome
├── sw.js                 # Workbox service worker (precache + SPA navigation fallback)
├── index.css             # Tailwind 4 + iOS tokens + dark-mode overrides
├── pages/
│   ├── Home.jsx          # The only user-facing page (~1061 lines — TODO split)
│   └── Share.jsx         # PWA share_target landing (OS-level entry point)
├── components/
│   ├── ErrorBoundary.jsx
│   ├── InstallPrompt.jsx
│   ├── OfflineIndicator.jsx
│   ├── SettingsAccordion.jsx   # ⚠ CLAUDE.md previously said "deleted"; it is LIVE.
│   └── UpdatePrompt.jsx
├── hooks/
│   └── usePWA.js
├── locales/
│   ├── en.json           # 50+ active keys
│   ├── es.json
│   └── fr.json
├── test/
│   └── setup.js          # Vitest setup: i18n init, localStorage/Notification/SW mocks
└── utils/
    ├── bibleBooks.ts          # 66-book name → number map
    ├── bibleReadingTracker.js # Bible-reading daily tracker (separate from streak)
    ├── dailyBibleReading.js   # 366-entry schedule → jwlibrary:// deep link
    ├── doneState.js           # NEW shape: { key: { done: boolean, note: string } } + legacy compat
    ├── habitProgress.js
    ├── jwLibraryLinks.js      # All jw.org / jwlibrary:// URL builders
    ├── native.js              # Capacitor wrappers: haptics, statusBar, keyboard, splash
    ├── notificationScheduler.js # Web Notification API + weekly reminders
    ├── pwa.js
    ├── relativeDate.js
    ├── settingsStore.js       # localStorage wrapper (NOT Zustand; "settingsStore" name predates that)
    ├── storageErrorHandler.js # LRU eviction for localStorage quota (used only by deleted code path; consider removing)
    ├── streak.js              # currentStreak, bestStreakFromHistory, todayProgress
    └── sundayWatchtowerTracker.js # Weekly Sunday Watchtower attendance counter
```

## Routes

| Path | Page | Notes |
|---|---|---|
| `/` | Home | The only user-facing page |
| `/share` | Share | OS-level entry point; receives URLs shared from other apps |
| `*` (catch-all) | Home | `/ideas`, `/about`, `/settings`, anything else all render the home |

**No settings page route, no about page route, no ideas page route.** Settings is rendered as a `<SettingsAccordion>` collapsed section inside Home.

## Home page shape (top to bottom)

1. **Greeting** — time-of-day (`greeting.morning|afternoon|evening|night`)
2. **Date subtitle** — `Tuesday, July 22`
3. **Week strip** — Mon..Sun, today highlighted (7 cells, `aria-label="This week"`)
4. **Weekly dots strip** — 7 small dots; filled = a habit was checked that day
5. **Streak + today-progress line** — `🔥 N day streak · best X · today Y/Z` (hidden until first interaction)
6. **First-launch hint** — `home.firstRunHint`; hidden after first checkbox tap
7. **Today row** — date-aware. Sun: "Today — Public Meeting + Watchtower Study". Mon/Wed/Thu/Fri: "Today — Midweek Meeting Prep". Tue: "Tonight — Midweek Meeting". Sat: "Today — Field Service".
8. **Daily text** — `jwlibrary:///showDailyText?...` (opens in JW Library app)
9. **Daily Bible reading** — `jwlibrary:///finder?wtlocale=E&bible=BBCCCVVV-BCCCVVV`
10. **Year text** — opens current year's scripture on jw.org
11. **Meeting prep** — generic `jw.org/en/library/jw-meeting-workbook/` landing
12. **Family worship** — `jw.org/en/bible-teachings/family/`
13. **This week** — date-aware MWB schedule
14. **Sunday Watchtower Study** — date-aware; Saturday 8 AM → Sunday end-of-day; links to current ISO-week's WOL index or (when seeded) `jwlibrary:///finder?...&docid=...` deep link
15. **Conventions** — find a regional convention on jw.org
16. **Memorial row** — only visible March/April (30 days before to day-of)
17. **Settings accordion** — collapsed by default; meeting day picker, daily reminder time, quiet hours, test notification
18. **Footer disclaimer** — "Unofficial third-party tool. Not affiliated with jw.org."

**Row visibility is conditional** based on date and settings — `todayProgress()` only counts rows the user actually sees.

## State model (localStorage only)

| Key | Shape | Purpose |
|---|---|---|
| `jw-daily-habits-state` | `{ date, done, history }` | Per-day habit state. `date` is ISO YYYY-MM-DD; if it doesn't match today on load, `done` is wiped. `done` keys: `today`, `text`, `bible`, `meeting`, `family`, `thisWeek`, `memorial`, `yearText`, `sundayWatchtower`, `conventions`, plus any per-row `note` |
| `jw-daily-habits-state.done[k]` | `{ done: boolean, note: string }` or legacy `boolean` | Per-row check state + optional note (≤200 chars) |
| `jw-daily-habits-state.history` | `string[]` of ISO YYYY-MM-DD | Dates where any habit was checked; pruned to last 7 days on every load |
| `jw-habits-first-done` | `'1'` | First-launch hint dismissed |
| `jw-habits-best-streak` | ISO numeric string | All-time best streak (monotonic) |
| `jw-user-settings` | `{ meetingDays, midweekDay, weekendDay, reminderTime, quietHours, ... }` | SettingsAccordion state |
| `jw-progress-settings` | `{ state: { theme: 'light'\|'dark' } }` | Legacy theme persistence (read at startup) |
| `jw-sunday-watchtower-weeks` | `string[]` of ISO YYYY-MM-DD | Sundays with attendance checked |
| `jw-bible-reading-days` | `string[]` of ISO YYYY-MM-DD | Bible-reading tracker |
| `jw-error-logs` | `ErrorLog[]` (last 20) | Global error capture (dev only) |
| `i18nextLng` | `string` | i18next cached locale |

**Single source of truth for shape changes: `src/utils/doneState.js`** (`getDone`/`setDone`/`isDone`/`getNote` helpers). All readers should go through these helpers for backward compat with the legacy boolean shape.

## What the app does NOT do (and shouldn't)

- No auth, no login, no account, no sync between devices
- No server-side state, no backend, no API calls beyond jw.org links the user clicks
- No analytics, no telemetry, no crash reporting
- No Bible text, no prayer content, no JW Library content cached (all link-out)
- No streak/level/XP/gamification on its own merits — the `streak` is just a UX nicety derived from history
- No "reset today" button — `date` mismatch on load wipes `done`
- No toast, no modal, no drawer, no hamburger, no settings menu (chrome)

## File hygiene rules

- **`src/`** — app code. TypeScript allowed in isolated modules but most code is `.jsx`. `bibleBooks.ts` is the only `.ts` file.
- **`scripts/`** — host ops + marketing assets. Executable, run manually or via deploy hooks.
- **`ops/`** — `traefik-guard.py` cron script that defends the jwhabits Traefik dynamic-file block.
- **Repo root cjs files** — `_verify-2026-06-12.cjs` (Playwright persona suite), `feature-graphic.cjs` (Play Store 1024×500 graphic generator), `screenshot-store-assets.cjs` (App Store/Play Store screenshot generator). These should ideally live in `scripts/` but are tracked at root.

## Conventions

- **i18n:** All user-visible strings go through `t()`. Locale files must match `en.json` shape — `es`/`fr` fall back to `en` for missing keys. Don't hardcode English in JSX.
- **State writes:** Always through `doneState.js` helpers, not direct `localStorage.setItem`. The shape migration is non-trivial.
- **Links:** Use the URL builders in `jwLibraryLinks.js`. Don't hardcode `https://www.jw.org/...` strings in JSX.
- **Capacitor:** Don't import `@capacitor/*` plugins outside of `utils/native.js`. Web-only paths need to keep working for the PWA.
- **Tests:** Unit tests for utils; component tests use Testing Library. No snapshot tests (they rotted once already).
- **Style:** Prettier 3, ESLint 9 flat config. Run `npm run format` before committing; CI runs `npm run format:check`.

## Known tech debt (not blockers)

- `src/pages/Home.jsx` is 1061 lines — split candidate (`useHabitState.js` hook + `WeekStrip.jsx` + `HabitRow.jsx`)
- `src/utils/jwLibraryLinks.js` is 871 lines — split candidate (`memorial.js`, `isoWeek.js`, `parseReading.js`)
- `src/utils/storageErrorHandler.js` is dead code from a deleted feature — consider removing
- No component tests for `Home.jsx` / `Share.jsx` / `SettingsAccordion.jsx` (only utils have unit tests)
- vite-plugin-pwa v1.3 SW build emits `inlineDynamicImports is deprecated` warning — fixed in vite-plugin-pwa >1.3; defer to dependabot
- Dockerfile base images (`node:22-alpine`, `nginx:1.27-alpine`) are not pinned by digest — pin when next bumped

## Recent material changes (last 10 PRs)

- #129 feat(sunday-watchtower): "Open in JW Library" sub-action (`83ceaf9`)
- #127 ci(ios): TestFlight workflow + bump to 4.2.0 (build 421) (`c1c1442`)
- #126 feat(jw-library): docid-based publication deep-link helpers (`e8e7991`)
- #124 feat(notifications): Saturday/Sunday Watchtower weekly reminders (`a5ea29d`)
- #123 feat: Sunday Watchtower Study as a 6th habit row (`5357d9b`)
- #122 chore(deps): migrate to vite 8 + tailwindcss 4 + plugin-react 6 (`b0b46aa`)
- #121 (and earlier) test(jw-habits): fixture patches for new done-shape + Conventions row

## Review history

- **2026-07-22** — Full audit by Hermes (4 parallel subagents). 6 P0, ~13 P1, ~15 P2, ~7 P3 findings. Local follow-up PR fixed P0-1 through P0-6, P1-2 (prettier), P1-3 (zustand uninstall), P1-5 (Dockerfile pin + USER + HEALTHCHECK), P1-9 (npm overrides + sharp bump → 0 vulnerabilities). Findings doc: `REVIEW-2026-07-22.md`.
