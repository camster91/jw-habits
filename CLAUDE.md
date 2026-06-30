# CLAUDE.md — JW Habits

## What This Is

A Capacitor (React + Vite) mobile/PWA app for Jehovah's Witnesses. A **simple habit tracker** — one page, no settings menu, no hamburger, no drawer. The home is a single iOS list of habit rows, each with a link to a jw.org surface and a checkbox to mark it done. Tap the row → open the jw.org page in a new tab. Tap the checkbox → mark the habit done. The actual habit happens on jw.org itself — the app is just a fast way to get there and remember what's been done today.

**The app is link-out only.** It contains no Bible text, no prayer content, no progress summaries, no jw.org content. Its only job is: open jw.org surfaces + remember which ones the user already did today.

- **App ID:** `com.ashbi.jwnews`
- **Version:** 4.1.0
- **Node requirement:** >= 18.0.0
- **Live URL:** `https://jwhabits.ashbi.ca/`

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 7 |
| Routing | React Router DOM 7 (1 user-facing page + /share PWA share_target + `*` catch-all → home) |
| State | none in app code; just localStorage for the per-day habit state |
| Styling | Tailwind CSS 3 + DaisyUI 4 (light/dark themes, OS-controlled via `prefers-color-scheme`) |
| Icons | lucide-react |
| i18n | i18next + react-i18next + i18next-browser-languagedetector (en/es/fr) |
| Dates | date-fns |
| Mobile | Capacitor 8 (iOS + Android) |
| PWA | vite-plugin-pwa + Workbox (injectManifest, custom src/sw.js) |
| Testing | Vitest + Testing Library + Playwright |
| Linting | ESLint 9 + Prettier |

## Architecture Overview

```
src/
├── main.jsx              # Entry point (error logging, back button, SW updates, theme at startup, i18n init)
├── App.jsx               # Router (Home + /share + catch-all → Home) + PWA chrome
├── sw.js                 # Workbox service worker (precache + SPA navigation fallback)
├── index.css             # Tailwind base + iOS tokens + dark-mode overrides
├── pages/
│   ├── Home.jsx          # The only user-facing page
│   └── Share.jsx         # PWA share_target landing (OS-level entry point, not user-facing)
├── components/
│   ├── ErrorBoundary.jsx
│   ├── InstallPrompt.jsx # Bottom install banner (PWA)
│   ├── OfflineIndicator.jsx # Top "you're offline" indicator
│   └── UpdatePrompt.jsx  # "New version available" banner (PWA)
├── hooks/
│   └── usePWA.js         # Install prompt, online status, SW updates
├── locales/
│   ├── en.json           # 17 active keys (greeting.{morning,afternoon,evening,night}, habit.*, home.firstRunHint, appName)
│   ├── es.json           # Spanish translations (3 keys translated manually: habit.thisWeek, habit.memorial, home.firstRunHint)
│   └── fr.json           # French translations (same 3 keys)
├── test/
│   └── setup.js          # Vitest setup: i18n init, localStorage/Notification/SW mocks
└── utils/
    ├── native.js              # Capacitor: haptics, statusBar, keyboard, splash
    ├── pwa.js                 # PWA install / SW update utilities
    ├── storageErrorHandler.js # LRU eviction for localStorage quota
    ├── bibleBooks.ts          # Bible book name → number map (66 books)
    ├── relativeDate.js        # "today/yesterday" helpers
    ├── jwLibraryLinks.js      # URL helpers: getDailyTextLink, getThisWeekMeetingUrl, getMemorialRow, getTodayRow
    └── dailyBibleReading.js   # 366-entry reading schedule → jwlibrary:// deep link
```

No `src/stores/` dir. No `src/i18n.js`. No `src/assets/`. (Cleaned up 2026-06-30.)

## Routes

| Path | Page | Loading | Notes |
|------|------|---------|-------|
| `/` | Home | Eager | The only user-facing page |
| `/share` | Share | Eager | OS-level entry point; receives URLs shared from other apps |
| `*` (catch-all) | Home | Eager | Any path that doesn't match (e.g. /ideas, /about, /settings) renders the home |

No Settings, no About, no Ideas, no hamburger, no drawer. The top bar contains the "JW HABITS" title only.

## Home page shape (2026-06-30)

Top to bottom on a fresh visit:

1. **Greeting** — time-of-day ("Good morning/afternoon/evening/night")
2. **Date subtitle** — "Tuesday, June 30"
3. **Week strip** — Mon..Sun, today highlighted with primary-color background (7 cells, `aria-label="This week"`)
4. **Weekly dots strip** — 7 small dots aligned under each day, filled = a habit was checked that day, hollow = missed (`aria-label="This week checked"`). Pure local state from `jw-daily-habits-state.history`.
5. **First-launch hint** — "Tap a row to open jw.org. Tap the checkbox when done." Hidden forever after first checkbox tap (`jw-habits-first-done` localStorage key).
6. **Today row** — date-aware. Sun: "Today — Public Meeting + Watchtower Study". Mon/Wed/Thu/Fri: "Today — Midweek Meeting Prep". Tue: "Tonight — Midweek Meeting". Sat: "Today — Field Service". Indigo Sparkles icon.
7. **Daily text** — `jwlibrary:///showDailyText?wtlocale=E&date=YYYYMMDD` (deep link, works in JW Library app)
8. **Daily Bible reading** — `jwlibrary:///finder?wtlocale=E&bible=BBCCCVVV-BCCCVVV`, sub-text "Today: {{today's reading}}"
9. **Meeting prep** — generic `jw.org/en/library/jw-meeting-workbook/` landing
10. **Family worship** — `jw.org/en/bible-teachings/family/`
11. **This week** — date-aware MWB schedule (`jw.org/en/library/jw-meeting-workbook/{volume}-mwb/Life-and-Ministry-Meeting-Schedule-for-{Month-DD-DD-YYYY}/`)
12. **Memorial row** — only visible March/April (30 days before to day-of). Date-aware: shows "Thursday, April 2, 2026" or fallback "See jw.org for the date" for 2030+. Indigo Church icon.
13. **Footer disclaimer** — "Unofficial third-party tool. Not affiliated with jw.org."

So 5 weekly rows + 1 date-aware Today row + 1 conditional Memorial row (March/April only). The Today row flips to "Tonight" on Tuesdays (meeting day).

## State model

`localStorage['jw-daily-habits-state']`:

```json
{
  "date": "2026-06-30",
  "done": { "today": true, "text": false, "bible": true, ... },
  "history": ["2026-06-30", "2026-06-29", "2026-06-27"]
}
```

- `date` — ISO YYYY-MM-DD. Per-day reset: if saved `date` != today, the `done` map is wiped.
- `done` — keys: `today`, `text`, `bible`, `meeting`, `family`, `thisWeek`, `memorial` (memorial only present when row is visible)
- `history` — array of ISO date strings for the current week where any habit was checked. Pruned to last 7 days on every load by `pruneHistory()` in Home.jsx.

`localStorage['jw-habits-first-done']` — `'1'` once the user has tapped any checkbox. Hides the first-launch hint forever.

## What was stripped (and why)

Per Cam's "I don't need a ton of complexity" + "Strip all" directives, the app has been aggressively reduced over June 2026:

- **Settings page** (deleted 2026-06-17): theme toggle, help link, data reset. Browser already has these (OS theme + site-data settings). Keeping the UI re-introduced the menu/settings/drawer chrome Cam said to strip.
- **About page** (deleted): third-party disclaimer is now inline in the home footer.
- **Ideas page** (deleted): redundant list of jw.org links — the home already has them.
- **Side drawer + hamburger** (deleted): drawer had 3 items, all now removed.
- **Toast provider + useToast hook** (deleted): no toasts triggered by anyone.
- **useDrawer hook** (deleted): only the deleted SideDrawer used it.
- **settingsStore (Zustand)** (deleted): only field was `theme`, now resolved at startup from localStorage or `prefers-color-scheme`. No UI toggle exists.
- **Reset today button** (deleted): per-day state resets at midnight anyway. Browser site-data settings is the only mid-day reset path.
- **LoadingSpinner, Skeleton, SideDrawer, Toast, BottomNav** (deleted): dead from prior iterations.
- **5 dead Zustand stores** (deleted 2026-06-30): `gamificationStore`, `memoriesStore`, `newsStore`, `progressStore`, `readingStore` — from the deleted goals/streaks/news system.
- **`/api/news` server** (deleted 2026-06-30): Express RSS endpoint, replaced with "daily check feature" for app store compliance. Stub returned empty items. Killed dev-server.cjs + simple-api-server.js + vercel.json + the entire `concurrently` dev workflow.
- **260 orphan locale keys** (deleted 2026-06-30): keys for bibleReading, familyWorship, focus, goals, links, nav, onboarding, prayer, settings, stats, study, today. `en.json` 10KB → 748 bytes.

What survives is:
- One user-facing page (Home)
- Top bar with only the "JW HABITS" title
- 5 weekly habit rows + 1 date-aware Today row + 1 conditional Memorial row
- Per-row checkbox to mark "done"
- Footer disclaimer (3rd-party ToS requirement)
- First-launch hint (shows once, hides forever after first tap)
- PWA chrome (install banner, offline indicator, update prompt)
- `/share` route (PWA OS integration)
- Catch-all `*` route
- Week strip + weekly dots strip (visual feedback on tracking)

## Build & Development

- Service worker: auto-update via Workbox (vite-plugin-pwa, `injectManifest` strategy)
- Custom `src/sw.js` handles: precache from manifest, NetworkFirst for `/`, CacheFirst for images/fonts, SPA navigation fallback (NavigationRoute + precached `/index.html`)
- Offline caching: images (CacheFirst), fonts (CacheFirst)
- App shortcuts: Home (since bottom nav was removed)
- Install prompt with 7-day dismissal (`InstallPrompt.jsx`)
- Update prompt when new SW detected (`UpdatePrompt.jsx`)

## Mobile (Capacitor)

- Splash screen: 2s, `#4A6FA4` background, immersive
- Status bar: light style, `#4A6FA4` background (Android)
- Keyboard: body resize mode
- Haptics: full integration via `src/utils/native.js`
- Back button: double-tap to exit (Android, handled in main.jsx)

## Deployment

- VPS: Hostinger (root@187.77.26.99)
- Front door: Traefik on `:80` + `:443` (Caddy-era render.py was archived to `/opt/vps/backups/caddy-to-traefik-*/`)
- Container: `camster91/jw-habits:latest` running on `127.0.0.1:18080:80`, nginx serving dist/
- Dynamic config: `/opt/traefik/dynamic/{routers,tls}.yml` (per `/opt/vps/bin/README.md`)
- Cert: `/etc/traefik/certs/jwhabits.ashbi.ca.{crt,key}` (LE-issued via Traefik ACME)
- Defense: `/etc/cron.d/jwhabits-traefik-guard` runs `ops/traefik-guard.py` every minute to re-assert the Traefik dynamic files on sibling-deploy wipes

## Testing

- **Unit:** `npm test` — 149/149 tests pass (vitest + jsdom)
- **Persona:** `_verify-2026-06-12.cjs` — 16/16 tests pass against the live URL (Playwright)
  - T1: greeting + 6 habit rows in order (Today row title is "Today" or "Tonight" on Tuesdays)
  - T2-T5: checkbox toggle, un-toggle, persist across reload, per-day reset
  - T6-T13: no chrome (no hamburger/settings/drawer), only `/` + `/share` routes, footer disclaimer, theme follows OS, no Reset button, catch-all routes
  - T14-T15: done state persists, first-launch hint hides after first tap
  - T16: weekly dots strip reflects per-day history
- **Lint:** `npm run lint` — clean (ESLint 9 flat config)
- **Build:** `npm run build` — clean (precache ~418 KiB, 13 entries)

## Known gotchas (for future agents)

- **Tailwind v3 only.** Don't bump to v4 — dependabot PR #100 broke the build because v4 moved to `@tailwindcss/postcss`. Pinned to `3.4.19` exact. If a future agent upgrades Tailwind, expect to rewrite `postcss.config.js`.
- **Dependabot bumps need a CI gate.** Currently 5 dependabot PRs merged in June without a build check. One (Tailwind v4) silently broke the build. **Future bumps should be reviewed, not auto-merged.** Or add a CI workflow that runs `npm run build` on every PR.
- **VPS git repo corruption:** `git pull --rebase` can leave bad objects. Fix: `rm -rf /root/jw-habits && git clone` fresh.
- **Cert recovery:** if `/etc/traefik/certs/jwhabits.ashbi.ca.{crt,key}` is missing, extract from `/opt/traefik/acme.json` (`Certificates[].certificate/key` fields, base64 with literal newlines in key). Traefik serves from in-memory ACME store but will break on restart if disk cert is missing.
- **No `/api` server.** If you see `/api/news` referenced anywhere, that's stale. The Express server + RSS proxy was deleted 2026-06-30.
- **Hard rule on content:** No content from jw.org publications in the app — no verses, no Bible reading text, no meeting outlines, no song numbers, no paraphrase. App links out + tracks progress only. Metadata (date, day-of-week, week number, book name, chapter range) is OK because it's the *name* of the work, not the *content*.

## Next Steps (Launch)

- Get screenshots for Google Play listing (`screenshot-store-assets.cjs`)
- Register Google Play Developer account ($25)
- Write/host privacy policy at ashbi.ca/privacy/jw-habits
- Generate signed Android bundle via Android Studio
- Submit to Google Play Store

The live app at `https://jwhabits.ashbi.ca/` is a simple habit tracker: open it and you see a date, a week strip, 6 habit rows. Tap a row to open jw.org in a new tab. Tap a checkbox to mark it done. That's it.