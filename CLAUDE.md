# CLAUDE.md — Faithful Days

**Last audited against source: 2026-10-07.**
If you change anything in this doc, bump the date. If you change anything in `src/`, re-check this doc.

## What this is

A Capacitor (React + Vite) mobile/PWA routine tracker for six spiritual routines: the daily
text, Bible reading, meeting prep, family worship, personal study and the ministry. Today shows
what is due and a long press checks it off; Progress shows how the weeks are going; onboarding
sets it up in six skippable steps. Reminders, a "What's New" count from jw.org's public feed, and
home-screen widgets (iOS WidgetKit, Android) sit on top. All state is on-device.

- **App ID:** `ca.ashbi.habittracker`
- **Version:** 5.0.0
- **Node:** >= 18.0.0
- **Screens:** onboarding (until `onboardingDone`), then Today (`/`), Plans (`/plans`, each plan's
  trail at `/plans/:planId`) and Progress (`/progress`) behind a tab bar; Settings is a modal
  sheet opened from the tab bar, not a route. `/share` (PWA share target) exists in the web
  build only.

### No third-party content in shipped code

This is the central design constraint. The app bundles no jw.org text, no verses, no catalogue.
Bible book names and chapter counts are public facts (`domain/bible.js`); encouragement lines
carry scripture *references* as data, never verse text. Link buttons open jw.org / JW Library
URLs built from those facts, or a link the user typed (`links` in the store, validated by
`isSafeHttpUrl`). The one network call is the What's New feed check (dates and counts only, at
most daily, can be switched off in Settings).

Do not add bundled third-party content. If a feature seems to need some, it needs a
user-editable slot instead.

## Stack (verified against `package.json` 2026-10-06)

| Layer | Technology | Version |
|---|---|---|
| Frontend | React 19 + Vite 8 | `react: 19.2.8` (exact, with `react-dom`), `vite: ^8.1.5` |
| Routing | React Router DOM 7 | `/`, `/plans`, `/plans/family`, `/plans/:planId`, `/progress`, web-only `/share`; `*` falls back to Today |
| State | `StoreProvider` (React context) over one JSON store in storage | no Redux/Zustand |
| Styling | Tailwind CSS 4 + DaisyUI 5 | `@tailwindcss/vite` plugin |
| Icons | lucide-react | `1.16.0` |
| i18n | i18next + react-i18next + i18next-browser-languagedetector | en / es / fr (v2 strings are English only for now; es/fr fall back to en) |
| Mobile | Capacitor 8 (iOS + Android) | `@capacitor/* ^8.x`, local notifications |
| PWA | vite-plugin-pwa 1.3 + Workbox (injectManifest, `src/sw.js`) | web build only |
| Testing | Vitest 4 + Testing Library + Playwright | 532 tests / 33 files, 7 smoke, 7 journeys + a clean-run check |
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
| `npm run smoke:spawn` | Playwright smoke suite, spawns preview (POSIX env syntax: run from Git Bash/CI; on Windows start `npm run preview` and run `node scripts/verify/smoke.cjs`) |
| `npm run journeys` | End-to-end UI journeys (needs preview running) |

Both Playwright suites pin the browser clock with `page.clock` (e.g. `Date(2026, 9, 6, 21, 0)`
for the wrap-up), so never rely on the real date in them. Shared helpers: `scripts/verify/lib.cjs`.

## Source tree

```
src/
├── main.jsx                    # Entry: i18n, error logging, register*() wiring, back button, SW updates
├── App.jsx                     # Router: onboarding gate, Today/Progress, Settings sheet, PWA chrome
├── sw.js                       # Workbox service worker (web build)
├── data/
│   ├── StoreProvider.jsx       # Loads/validates/saves the store; onForeground, onStoreChange, 03:00 rollover
│   └── useStore.js             # { store, update, today }
├── domain/                     # Pure logic, no React or storage (all unit-tested)
│   ├── day.js                  # appDay: the 03:00 app day, date maths
│   ├── store.js                # defaultStore, validateStore, newId, addCheckIn/removeCheckIn, export/import, labelFor
│   ├── upgrade.js              # upgradeStore: v2 -> v3 (studyTopic becomes the active study plan)
│   ├── schedule.js             # Dated schedule history: scheduleOn, withScheduleChange
│   ├── routines.js             # The six routines, cadences, dueToday, isDone
│   ├── today.js                # Today helpers: chapters, ministry entry, meeting day, study progress
│   ├── bible.js                # Books, chapter counts, reading plans, finder URLs (no verse text)
│   ├── progress.js, wrapup.js, encouragement.js, notifications.js, links.js, whatsNew.js
│   └── migrateV1.js            # One-time import of the v1 jw- keys (read-only on them)
├── screens/
│   ├── Today.jsx, Plans.jsx, PlanTrail.jsx, FamilyWeeks.jsx, Progress.jsx, SettingsSheet.jsx
│   └── onboarding/             # Six steps; StepRoutines/Week/Reading/Rhythm/Look are reused by Settings
├── components/                 # HoldToCheck, RoutineRow, MinistryRow, Stepper, WrapUpCard, TabBar,
│                               # MeetingDaysCard, WhatsNewBadge, BibleMap, settings/* (Reminders, Links,
│                               # Backup, About), plans/* (Sheet, StepSheet, NewPlanSheet, PlanIcon), and the PWA
│                               # chrome (PWAProvider, InstallPrompt, UpdatePrompt, OfflineIndicator)
├── native/                     # reminders.js, whatsNewClient.js, widgetBridge.js (each exports register*())
├── pages/Share.jsx             # PWA share_target landing (web only)
├── hooks/                      # usePWA, usePWAContext
├── theme/theme.js              # Accent, light/dark, and --fd-accent-text (accent text at 4.5:1)
├── theme/planColours.js        # The 8 plan colours (white text at 4.5:1) and their text shades (.fd-plan-text)
├── locales/                    # en.json (all fd.* strings), es.json / fr.json (v1 leftovers, see Known issues)
└── utils/                      # safeStorage (the storage chokepoint), native.js, safeUrls.js, userLinks.js,
                                # settingsStore.js (Share only), backup.js, pwa.js, backStack.js (Android back)
ios/App/FaithfulDaysWidget/     # WidgetKit sources (target not in the Xcode project yet)
docs/ios-widget-setup.md        # One-time Xcode steps for the widget extension
docs/release-checklist.md       # Manual on-device checklist to run before every store release
scripts/verify/                 # smoke.cjs, journeys.cjs, lib.cjs (Playwright)
```

## The six routines

| Routine | Id | Cadence | Notes |
|---|---|---|---|
| Daily text | `dailyText` | daily | Link to the day's text (locale default or user link) |
| Bible reading | `bibleReading` | daily (or N days/week) | Chapters-read stepper; link to the day's first chapter |
| Meeting prep | `meetingPrep` | meeting | Due the day before each meeting day; prompts for meeting days if none set |
| Family worship | `familyWorship` | weekly | On the chosen weekday |
| Personal study | `personalStudy` | weekly target | N per week; shows the active study plan (`activePlan.personalStudy`) |
| Ministry | `ministry` | monthly | Shared-this-month toggle, studies count, hours goal for pioneers |

`ROUTINE_IDS` and `dueToday` in `domain/routines.js` are the source of truth for what Today lists.
Users can switch any routine off or rename it (`labels`); the id never changes.

## State model

All state is on-device. **The `jw-` prefixes are frozen persistence keys, not branding** —
they ship in real installs, so renaming them silently discards user history.

| Key | Shape | Purpose |
|---|---|---|
| `jw-habits-v2` | one JSON store (`version: 3`; the key keeps its v2 name) | Everything: `schedule[]`, `log[]`, `reading`, `anchors`, `labels`, `links`, `whatsNew`, `onboardingDone`, and from v3 `plans`, `activePlan`, `familyAgendas`, `badges`, `showGameLayer`, `showShare`, … |
| `jw-habits-v2-backup` | raw string | The original v2 value, written once before the first load upgrades it to v3 (`domain/upgrade.js`) |
| `jw-habits-v2-corrupt-<ms>` | raw string | An unreadable `jw-habits-v2` kept aside before starting fresh |
| `jw-daily-habits-state`, `jw-bible-reading-days`, `jw-user-settings` | v1 shapes | Read once by `migrateV1`; never written or deleted (rollback) |
| `jw-error-logs` | `ErrorLog[]` (last 20) | Dev error capture |
| `fd-wrapup-dismissed`, `fd-celebrated` | session storage, an app day | Wrap-up dismissed / haptic already fired |

- **The 03:00 app day.** `appDay(now)` in `domain/day.js` is the local date, or the previous one
  before 03:00 local time, so late-night use counts for the day that is still going. Never use
  `new Date().toISOString().slice(0, 10)` for "today"; `StoreProvider` exposes `today` and
  re-renders at the rollover. `currentDay(clockDay, lastSeenDay)` keeps today from moving back
  a day (westward travel) but ignores a `lastSeenDay` more than a day ahead (a clock once set
  forward), which the provider then resets.
- **Dated schedule history.** `store.schedule` is an array of entries sorted by `from`; the one in
  force on a day is the latest starting on or before it. Change it only through
  `withScheduleChange(store, today, patch)`, which adds an entry from today and leaves earlier
  days as they were. Read it with `scheduleOn(store, day)`.
- **`safeStorage` is the single storage chokepoint.** All reads and writes go through
  `utils/safeStorage.js` (`durableGet/durableSet` for the v2 store, which uses Capacitor
  Preferences natively and localStorage on the web, plus quota handling and the
  `jw-storage-full` event). Do not call `localStorage` directly in `src/`.
- **Wiring in `src/main.jsx`.** `registerReminderSync()`, `registerWhatsNewCheck()` and
  `registerWidgetBridge()` each subscribe to the store from outside React using
  `onForeground(cb)` (app opened / came to the foreground; gets `{ store, update, today }`) and
  `onStoreChange(cb)` (store changed), both exported from `data/StoreProvider.jsx`. New
  background behaviour should be another `register*()` of that shape, called from `main.jsx`.

Reading and writing the store goes through the `domain/` functions; keep them pure.

## Known issues

- **Deploy was down from 2026-07-24.** `deploy-ashbi.yml` called a reusable workflow in the
  private, archived `camster91/ashbi-deploy` repo, so every run failed at startup. It is now
  self-contained: it runs after a successful `Build and Push Image` on `main` and deploys the
  immutable `ghcr.io/camster91/jw-habits:main-<sha7>` image over SSH. Can also be run by hand
  (`workflow_dispatch`, optional `sha`).
- **The live site served a self-signed TLS certificate** (seen 2026-10-04, fixed 2026-10-05).
  Cause: `tls.yml` pinned a hand-copied cert file for `jwhabits.ashbi.ca`, which overrides the
  router's `letsencrypt` resolver, and that file became a self-signed placeholder on 2026-07-20.
  `ops/traefik-guard.py` now removes the pinned entry. It stayed broken a day longer because the
  VPS checkout (`/root/jw-habits`, run by cron every minute) was never pulled, so the old guard
  kept re-pinning the cert. After merging a guard change, `git pull` on the VPS and check that
  the `guard @ <sha>` in `/var/log/jwhabits-traefik-guard.log` matches.
- **`ops/traefik-guard.py` edits files shared by every site on the VPS.** It writes them
  atomically and refuses output that is not valid YAML. Run `python3 -m unittest
  ops/test_traefik_guard.py` before changing it.
- **Hosted CI runs again** (re-enabled 2026-10-02 after being disabled since 2026-09-22).
  `ci.yml` runs install, `npm audit --audit-level=high`, lint, tests, build, format check
  and gitleaks. Playwright smoke + journeys (`smoke.yml`) and the image build also run on PRs.
- **npm 10 crashes** (`edgesOut`) re-resolving the lockfile. Use
  `npx npm@11 install --package-lock-only`.
- **The widget is unverified.** The Android and iOS widget sources were written without a JDK,
  Android SDK or Xcode. The iOS extension target is not in `project.pbxproj`; follow
  `docs/ios-widget-setup.md`, then run `docs/release-checklist.md` before any store release.
- **Nothing listens for `jw-storage-full` any more.** The v1 Home page showed a banner when
  storage was full; Today does not. `safeStorage` still dispatches the event.
- **es/fr hold only v1 strings.** `es.json` / `fr.json` contain no `fd.*` keys, so v2 shows in
  English everywhere until they are translated. Their v1 keys are unused.

## Rules for changes

- **No third-party *content* in shipped code; user-editable links to jw.org/JW Library and the What's New feed check are allowed.**
- **Do not rename `jw-` storage keys** or the `jw-storage-full` / `jw-offline-open` events.
- **Keep the smoke + journey suites green.** Both exit non-zero on failure; do not let a
  suite print FAIL and still return 0.
- **Tool hazard: Edit/Write/Bash payloads can collapse one backslash.** A regex or escape you
  write as text may land on disk with one backslash fewer (a lone backslash-n becomes a real
  newline, and a "fix" can come out byte-identical to what it replaced). Prefer backslash-free
  regexes (character classes, `String.fromCharCode(92)`), and verify on disk afterwards
  (`grep -n`, byte counts), not by trusting the tool's success message.
- **`deploy-ashbi.yml` keeps its `jw-habits` identifiers** — they name a real container and
  a ghcr.io image. Renaming them breaks the deploy path.
