# Mobile-only Faithful Days Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Faithful Days 5.3.0 as a phone-only app with a "What's new" daily habit, a big-dates calendar and a backup reminder.

**Architecture:** Remove the hosting/PWA layer first, then move the main store to version 4 (seventh routine, `events`, `backup`, two reminder switches) through the existing pure upgrade path, then build each feature on the pure `domain/` layer with thin React components. Notifications stay one pure planner (`planNotifications`) that gains extra morning lines.

**Tech Stack:** React 19, Vite 8, Capacitor 8, Tailwind 4 + DaisyUI 5, i18next, Vitest 5 + Testing Library, Playwright verify scripts.

**Spec:** `docs/superpowers/specs/2026-10-28-mobile-only-design.md`

## Global Constraints

- No jw.org text, artwork, logos or trademarks in shipped code or notifications. Links only.
- Do not rename `jw-` storage keys or the `jw-storage-full` / `jw-offline-open` events. New key allowed: `jw-habits-v3-backup`.
- All state reads/writes go through `utils/safeStorage.js` and the pure `domain/` functions.
- "Today" is `appDay(now)` (03:00 rollover); never `toISOString().slice(0, 10)`.
- At most two notifications a day; never inside quiet hours; no discouraging wording.
- Feed check: native only, at most once per 24 h, reads only `guid` and `pubDate`, `whatsNew.enabled` defaults to `true`.
- Dependency lockfile changes use `npx npm@11 install --package-lock-only`.
- Smoke and journey suites must exit non-zero on failure.
- Tool hazard (CLAUDE.md): prefer backslash-free regexes; verify on disk with `grep -n`.
- Version becomes `5.3.0` in `package.json`, Android `versionName`, iOS `MARKETING_VERSION`.
- Each task ends green on: `npm run lint`, `npm run format:check`, `npm test`.

## Review Focus

- Upgrading on a day that already has a schedule entry starting today: the v4 entry must replace it, not duplicate `from` (test in Task 4).
- An imported backup with a malformed event (end before start, unsafe link, unknown kind, over 200 events) must be rejected, not half-loaded (test in Task 4).
- Feed switched off, or the `whatsNew` routine switched off: no count is shown and no feed request is made (tests in Task 5).
- A morning with no routine due but an event 7 days out must still produce a morning notification; quiet hours covering the morning time must still suppress it (tests in Task 7).
- `backup.lastExportAt` in the future (clock moved back) counts as no recent backup, so the nudge still shows (tests in Tasks 7 and 8).

---

### Task 1: Remove hosting, deploy and monitoring

**Files:**
- Delete: `.github/workflows/deploy-ashbi.yml`, `.github/workflows/build-and-push.yml`, `.github/workflows/production-monitor.yml`, `Dockerfile`, `nginx.conf`, `ops/`, `scripts/deploy/`, `scripts/deploy.sh`, `scripts/host-state.sh`, `scripts/ops/`, `docs/operations-monitoring.md`, `docs/production-recovery.md`
- Modify: `scripts/verify/workflow-policy.cjs`, `.github/workflows/ci.yml`, any doc linking the deleted docs (`grep -rln "operations-monitoring\|production-recovery\|deploy-ashbi\|build-and-push" --exclude-dir=node_modules .`)

**Interfaces:** none.

- [ ] **Step 1:** Delete the files listed above with `git rm -r`.
- [ ] **Step 2:** Remove every reference to the deleted workflows and scripts from `workflow-policy.cjs` and `ci.yml` (jobs, `needs:`, path filters, policy allow-lists). Keep CodeQL, CI, Smoke, Native compile and iOS TestFlight.
- [ ] **Step 3:** Run `node scripts/verify/workflow-policy.cjs` — expected: exits 0.
- [ ] **Step 4:** Run `grep -rIn "deploy-ashbi\|build-and-push\|production-monitor\|traefik" --exclude-dir=node_modules --exclude-dir=.git . | grep -v "docs/superpowers"` — expected: no output.
- [ ] **Step 5:** Run lint, format check, tests — expected: pass.
- [ ] **Step 6:** Commit `chore: remove website hosting, deploy and production monitoring`.

### Task 2: Remove the PWA and the share target

**Files:**
- Delete: `src/sw.js`, `src/components/PWAProvider.jsx`, `src/components/pwaContext.js`, `src/components/InstallPrompt.jsx`, `src/components/UpdatePrompt.jsx`, `src/components/OfflineIndicator.jsx`, `src/hooks/usePWA.js`, `src/hooks/usePWAContext.js`, `src/utils/pwa.js`, `src/pages/Share.jsx`, their `*.test.jsx`/`*.test.js`, `scripts/verify/offline-update.cjs`, PWA-only icons in `public/` (`pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`) after confirming with `grep -rn` that nothing else uses them
- Modify: `vite.config.js` (drop `VitePWA`), `package.json` (drop `vite-plugin-pwa`, `offline:verify`), `package-lock.json`, `src/main.jsx` (drop SW registration/update wiring), `src/App.jsx` (drop `/share` route and PWA chrome), `src/components/UpdateRequired.jsx` (keep raw export, drop web update prompt), `scripts/verify/budgets.cjs` (keep JS/CSS gzip limits, drop precache), `.github/workflows/smoke.yml` (drop offline step), `scripts/verify/smoke.cjs` if it checks the worker
- Test: `src/App.test.jsx`, `src/components/UpdateRequired.test.jsx` (or wherever it is tested)

**Interfaces:** none.

- [ ] **Step 1: Write the failing test** in `src/App.test.jsx`: `it('falls back to Today on /share')` — render the app at `/share` with a finished-onboarding store; assert `screen.getByTestId('row-dailyText')` is present.
- [ ] **Step 2:** Run `npx vitest run src/App.test.jsx` — expected: FAIL (Share renders).
- [ ] **Step 3:** Make the deletions and modifications above. `npx npm@11 install --package-lock-only` after editing `package.json`, then `npm ci`.
- [ ] **Step 3b:** Remove `isNative` branches that only existed for the PWA (install/update/offline chrome). Keep web fallbacks the test harness uses (web storage in `safeStorage`, the backup download in `utils/backup.js`).
- [ ] **Step 4:** Update `UpdateRequired` tests so they assert the raw-export button and no longer assert an update prompt.
- [ ] **Step 5:** Run `npm test` — expected: PASS. Run `npm run build && test ! -e dist/sw.js && node scripts/verify/budgets.cjs` — expected: exits 0.
- [ ] **Step 6:** Run `npm run smoke:spawn` — expected: exits 0.
- [ ] **Step 7:** Commit `chore: drop the PWA service worker and web share target`.

### Task 3: Privacy and support pages on GitHub Pages

**Files:**
- Move: `public/privacy/index.html` → `site/privacy/index.html`, `public/support/index.html` → `site/support/index.html`
- Create: `site/index.html`, `.github/workflows/pages.yml`
- Modify: `src/components/settings/AboutSection.jsx:8-9`, `src/components/ErrorBoundary.jsx:172`, `PRIVACY.md`, `APP_STORE_METADATA.md`, `scripts/verify/workflow-policy.cjs` (allow the new workflow)
- Test: `src/screens/SettingsSheet.test.jsx`, `src/components/ErrorBoundary.test.jsx`, `src/utils/safeUrls.test.js`

**Interfaces:**
- Produces: `PRIVACY_URL = 'https://camster91.github.io/jw-habits/privacy/'`, `SUPPORT_URL = 'https://camster91.github.io/jw-habits/support/'`.

- [ ] **Step 1: Write the failing tests:** update the existing URL assertions in the three test files to the new URLs.
- [ ] **Step 2:** Run those tests — expected: FAIL on the old URLs.
- [ ] **Step 3:** Change the URLs in code and docs. Move the pages. Rewrite the privacy page per spec §2 (title "Privacy Policy", developer name, every listed point, effective date 2026-10-28). The support page lists GitHub Issues (`https://github.com/camster91/jw-habits/issues`) and an email placeholder line marked for the owner, `<!-- OWNER: support email -->`, which is the spec's open question.
- [ ] **Step 4:** Write `pages.yml`: on push to `main` with `paths: ['site/**']` and `workflow_dispatch`; permissions `pages: write`, `id-token: write`, `contents: read`; steps `actions/checkout`, `actions/configure-pages`, `actions/upload-pages-artifact` with `path: site`, `actions/deploy-pages`. Pin actions by SHA, as the other workflows do.
- [ ] **Step 5:** Run the tests and `node scripts/verify/workflow-policy.cjs` — expected: PASS.
- [ ] **Step 6:** Commit `feat: host privacy and support pages on GitHub Pages`.

### Task 4: Store version 4

**Files:**
- Modify: `src/domain/routines.js` (`ROUTINE_IDS`, `DEFAULT_LABELS`, `CADENCE`), `src/domain/schedule.js:6` (`RoutineId` typedef), `src/domain/store.js` (`STORE_VERSION`, `defaultStore`, validators), `src/domain/upgrade.js`, `src/data/StoreProvider.jsx` (`keepV2Backup` → per-version backup key), `src/locales/en.json` (`fd.routine.whatsNew`)
- Test: `src/domain/upgrade.test.js`, `src/domain/store.test.js`, `src/data/StoreProvider.test.jsx`

**Interfaces:**
- Produces:
  - `ROUTINE_IDS = ['dailyText', 'whatsNew', 'bibleReading', 'meetingPrep', 'familyWorship', 'personalStudy', 'ministry']`; `CADENCE.whatsNew = 'daily'`; label "What's new".
  - `STORE_VERSION = 4`.
  - `defaultStore` adds `events: []`, `backup: { lastExportAt: null }`, and `reminders: { enabled: true, off: [], events: true, backup: true }`.
  - `EVENT_KINDS = ['memorial', 'convention', 'assembly', 'coVisit', 'other']`, `MAX_EVENTS = 200` exported from `store.js`.
  - Event shape `{ id, kind, title, start, end, link }` as in spec §4; `title` is `null` or a valid title (required when `kind === 'other'`); `end` is `null` or `>= start`; `link` is `null` or `isSafeHttpUrl`.
  - `upgradeStore(x, today)` returns v4 for v2 and v3 input (v2 → v3 → v4).
  - `V3_BACKUP_KEY = 'jw-habits-v3-backup'` exported from `StoreProvider.jsx`.

- [ ] **Step 1: Write the failing tests** in `upgrade.test.js`:
  - `v3 to v4 marks whatsNew off in every past schedule entry` — v3 fixture with two entries; every original entry has `enabled.whatsNew === false`.
  - `v3 to v4 adds an entry from today with whatsNew on` — last entry `from === today`, `enabled.whatsNew === true`, other fields equal to the entry previously in force.
  - `v3 to v4 replaces an entry that already starts today` — fixture whose last entry has `from === today`; result has no duplicate `from`, and that entry has `whatsNew: true`.
  - `v3 to v4 sets the new defaults and keeps whatsNew settings` — `events` `[]`, `backup.lastExportAt` `null`, `reminders.events` and `reminders.backup` `true`, `whatsNew` deep-equal to input.
  - `v2 upgrades through to v4` — `version === 4` and `validateStore(...).ok`.
  - `v4 input is returned unchanged` — same reference.
- [ ] **Step 2: Write the failing tests** in `store.test.js`:
  - `defaultStore is valid at version 4`.
  - Rejects: an event whose `end < start`; `kind: 'other'` with `title: null`; an unknown kind; a `javascript:` link; 201 events; a duplicate event id; `backup.lastExportAt` that is not `null` or a parseable ISO string; a reminders object missing `events`.
  - `importJson of a v3 file upgrades to v4`.
- [ ] **Step 3: Write the failing test** in `StoreProvider.test.jsx`: `keeps the raw v3 value under jw-habits-v3-backup before saving v4`. Also assert that an existing v3 backup is not overwritten, and that a failed backup write runs read-only (mirror the existing v2 tests).
- [ ] **Step 4:** Run the three files — expected: FAIL.
- [ ] **Step 5: Implement.**
  - Add `v3ToV4(v3, today)` in `upgrade.js` using `withScheduleChange` from `schedule.js` for the new entry. Chain it in `upgradeStore`.
  - In `StoreProvider.jsx`, replace `keepV2Backup(raw)` with `keepBackup(raw, key)`, choosing `BACKUP_KEY` for a parsed `version === 2` and `V3_BACKUP_KEY` for `version === 3`.
  - Add `validEvents`, `validBackup` and the extended `validReminders` to `validShape`.
  - Update the `importJson` doc comment.
- [ ] **Step 6:** Run `npm test` — expected: PASS. Fix any test that hard-codes six routines (`grep -rn "six\|length).toBe(6" src`) to read `ROUTINE_IDS.length`.
- [ ] **Step 7:** Commit `feat: store v4 with the whatsNew routine, events and backup state`.

### Task 5: "What's new" habit row and feed count

**Files:**
- Modify: `src/domain/links.js` (`routineLink`), `src/components/RoutineRow.jsx` (`onLink` prop), `src/screens/Today.jsx` (row detail + reset, remove badge), `src/native/whatsNewClient.js` (skip when routine off), `src/screens/SettingsSheet.jsx` + `src/locales/en.json` (hint copy, `fd.today.whatsNew.count`)
- Delete: `src/components/WhatsNewBadge.jsx` and its test
- Test: `src/domain/links.test.js`, `src/screens/Today.test.jsx`, `src/native/whatsNewClient.test.js`, `scripts/verify/journeys.cjs`, `scripts/verify/smoke.cjs`

**Interfaces:**
- Consumes: `ROUTINE_IDS` with `whatsNew` (Task 4); `whatsNewPageUrl(locale)` from `domain/whatsNew.js`.
- Produces: `RoutineRow` prop `onLink?: () => void`, called after `openLink(link)`; locale key `fd.today.whatsNew.count` = `"{{count}} new"`.

- [ ] **Step 1: Write the failing tests:**
  - `links.test.js`: `routineLink(store, 'whatsNew', 'en')` returns `whatsNewPageUrl('en')`; a safe custom `links.whatsNew` wins.
  - `Today.test.jsx`:
    - With `whatsNew.newCount: 3`, `row-whatsNew` shows "3 new".
    - With `newCount: 0` there is no "new" text.
    - With `whatsNew.enabled: false` and `newCount: 3`, the text is hidden.
    - Clicking the row's link calls `openLink` with the What's New URL and sets `newCount` to 0.
    - Holding the row logs a `whatsNew` check-in and leaves `newCount` unchanged.
    - No element has the old badge test id.
  - `whatsNewClient.test.js`: no `CapacitorHttp.get` call when the schedule in force today has `enabled.whatsNew === false`.
- [ ] **Step 2:** Run them — expected: FAIL.
- [ ] **Step 3: Implement.**
  - Add the `whatsNew` branch to `routineLink`.
  - Add `onLink` to `RoutineRow`.
  - In `Today.jsx`, pass `detail` = count text when `store.whatsNew.enabled && store.whatsNew.newCount > 0`, and `onLink` = zero the count (reuse the body of `openWhatsNew` without its `openLink`). Remove the badge.
  - In `registerWhatsNewCheck`, return early when `!scheduleOn(store, today).enabled.whatsNew`.
  - Settings hint text: "Once a day, checks jw.org's public What's New feed for new item dates. Sends no personal data."
- [ ] **Step 4:** Update `journeys.cjs` and `smoke.cjs` for the seventh row and the removed badge.
- [ ] **Step 5:** Run `npm test`, `npm run build`, `npm run smoke:spawn`, and `npm run preview & npm run journeys` — expected: all exit 0.
- [ ] **Step 6:** Commit `feat: add the What's new daily habit with the feed count on its row`.

### Task 6: Big-dates calendar

**Files:**
- Create: `src/domain/events.js`, `src/components/plans/DatesCard.jsx`, `src/components/plans/EventSheet.jsx`, `src/components/ComingUp.jsx`
- Modify: `src/screens/Plans.jsx` (render `DatesCard`), `src/screens/Today.jsx` (render `ComingUp` above the routine list), `src/locales/en.json` (`fd.events.*`)
- Test: `src/domain/events.test.js`, `src/components/plans/DatesCard.test.jsx`, `src/screens/Today.test.jsx`, `scripts/verify/journeys.cjs`

**Interfaces:**
- Consumes: `EVENT_KINDS`, `MAX_EVENTS`, event shape (Task 4); `newId()` from `domain/ids.js`; the `Sheet` component in `components/plans/`; `openLink`.
- Produces:
  - `addEvent(store, input) -> store` (assigns `id`; ignores input `id`).
  - `updateEvent(store, id, patch) -> store`.
  - `removeEvent(store, id) -> store`.
  - `sortedEvents(store) -> event[]` (by `start`, then `id`).
  - `upcoming(store, day, withinDays) -> event[]`: events with `start >= day` and `start <= addDays(day, withinDays)`, sorted.
  - `eventLabel(event, t) -> string`: a non-blank `title`, else `t('fd.events.kind.' + kind)`.
  - Locale keys: `fd.events.kind.{memorial: "Memorial", convention: "Regional convention", assembly: "Circuit assembly", coVisit: "Circuit overseer visit", other: "Other"}`, `fd.events.title: "Dates"`, `fd.events.add: "Add date"`, `fd.events.past: "Past"`, `fd.events.comingUp: "{{label}} · {{date}}"`, `fd.events.today: "{{label}} · today"`.

- [ ] **Step 1: Write the failing tests** in `events.test.js`:
  - `addEvent` gives a new id and keeps the input id out.
  - `upcoming` includes `start === day` and `start === day + 14`, and excludes `day + 15` and yesterday.
  - An event with `start` yesterday and `end` tomorrow is not "upcoming" (its start has passed).
  - `eventLabel` uses `title` when set and the kind name when `title` is null or whitespace.
  - Every writer's output passes `validateStore`.
- [ ] **Step 2: Write the failing tests** in `DatesCard.test.jsx`:
  - Adding a "Circuit assembly" on 2026-11-14 lists it under upcoming.
  - Choosing "Other" with a blank name keeps the Save button disabled.
  - An end date before the start shows an error and does not save.
  - An unsafe link is flagged and not saved.
  - Delete removes the event.
  - Past events appear under "Past".
- [ ] **Step 3: Write the failing tests** in `Today.test.jsx`:
  - With today 2026-11-01 and an assembly on 2026-11-14, Today shows "Circuit assembly · Sat 14 Nov".
  - On 2026-11-14 it shows "Circuit assembly · today".
  - With nothing within 14 days, there is no line.
- [ ] **Step 4:** Run — expected: FAIL.
- [ ] **Step 5: Implement** the domain functions, then `EventSheet` (form fields per spec §4, validated with the same rules as `validateStore`), `DatesCard` (upcoming list, "Past" list, "Add date", and a link button per event that has a `link`, opened with `openLink`), and `ComingUp`. Tapping it navigates to `/plans` and scrolls `DatesCard` into view. Format dates with the app's existing date formatter, the one used for meeting days.
- [ ] **Step 6:** Add journey `J-dates`: add a circuit assembly 5 days ahead of the pinned clock, return to Today, and assert the "Coming up" line.
- [ ] **Step 7:** Run `npm test`, `npm run build`, and the smoke and journeys suites — expected: exit 0.
- [ ] **Step 8:** Commit `feat: add a big-dates calendar with a Coming up line on Today`.

### Task 7: Date and backup reminder lines

**Files:**
- Modify: `src/domain/notifications.js` (`morningEntry`), `src/components/settings/RemindersSection.jsx` (two switches), `src/locales/en.json` (`fd.notify.eventSoon`, `fd.notify.eventTomorrow`, `fd.notify.backup`, `fd.settings.reminders.events`, `fd.settings.reminders.backup`)
- Test: `src/domain/notifications.test.js`, `src/screens/SettingsSheet.test.jsx`

**Interfaces:**
- Consumes: `eventLabel`, `sortedEvents` (Task 6); `store.backup.lastExportAt`, `store.reminders.events` and `store.reminders.backup` (Task 4).
- Produces:
  - `backupDue(store, day, now) -> boolean`, exported from `notifications.js`. It is true when `day` ends in `-01`, `store.reminders.backup` is on, and `lastExportAt` is null, unparseable, in the future, or 30 or more days before `now`.
  - Copy: `fd.notify.eventSoon` = `"{{label}} in 7 days"`, `fd.notify.eventTomorrow` = `"{{label}} tomorrow"`, `fd.notify.backup` = `"Time for a backup"`.

- [ ] **Step 1: Write the failing tests** in `notifications.test.js`:
  - An event starting `day + 7` adds "Circuit assembly in 7 days" to that day's morning body.
  - An event starting `day + 1` adds "Circuit assembly tomorrow".
  - Day +3 adds nothing.
  - With no routine due and an event 7 days out, a morning entry still exists. Its time is `store.anchors.dailyText.time`, or `07:00` if that is unset.
  - That entry is dropped when quiet hours cover its time.
  - `reminders.events: false` removes the event lines.
  - `backupDue` is true on the 1st with `lastExportAt` null, with `lastExportAt` 31 days ago, and with `lastExportAt` one day in the future. It is false with `lastExportAt` 5 days ago, false on the 2nd, and false with `reminders.backup: false`.
  - No day ever has more than 2 entries.
- [ ] **Step 2:** Run — expected: FAIL.
- [ ] **Step 3: Implement.** `morningEntry` collects routine text (existing), then event lines, then the backup line, joined with `\n`. It returns null only when all three are empty. Add the two switches to `RemindersSection`, writing `reminders.events` and `reminders.backup`.
- [ ] **Step 4:** Run `npm test` — expected: PASS.
- [ ] **Step 5:** Commit `feat: add date and monthly backup lines to the morning reminder`.

### Task 8: Record backups and show the last one

**Files:**
- Modify: `src/components/settings/BackupSection.jsx` (`exportNow` writes `backup.lastExportAt`; show last-backup text and nudge), `src/locales/en.json` (`fd.settings.backup.last`, `fd.settings.backup.never`, `fd.settings.backup.nudge`)
- Test: `src/components/settings/BackupWorkspace.test.jsx` or a new `BackupSection.test.jsx`

**Interfaces:**
- Consumes: `store.backup` (Task 4).
- Produces copy:
  - `fd.settings.backup.last` = `"Last backup: {{date}}"`
  - `fd.settings.backup.never` = `"No backup yet"`
  - `fd.settings.backup.nudge` = `"It has been a while — export a backup to keep your history safe."`

- [ ] **Step 1: Write the failing tests:**
  - A successful export sets `backup.lastExportAt` to the mocked `now`, as an ISO string.
  - A failed export, or a share-sheet cancel (`isShareCancel`), leaves it unchanged.
  - With `lastExportAt` null, the section shows "No backup yet" and the nudge.
  - With an export 3 days ago, it shows "Last backup:" and no nudge.
  - With an export 31 days ago, or one in the future, it shows the nudge.
- [ ] **Step 2:** Run — expected: FAIL.
- [ ] **Step 3: Implement** in `BackupSection`. Write `lastExportAt` through `update` only after `saveBackup` resolves.
- [ ] **Step 4:** Run `npm test` — expected: PASS.
- [ ] **Step 5:** Commit `feat: show the last backup date and nudge after 30 days`.

### Task 9: iOS privacy manifests

**Files:**
- Create: `ios/App/App/PrivacyInfo.xcprivacy`, `ios/App/FaithfulDaysWidget/PrivacyInfo.xcprivacy`
- Modify: `ios/App/App.xcodeproj/project.pbxproj` (add both files to their targets' resources)

**Interfaces:** none.

- [ ] **Step 1:** Write both manifests:
  - `NSPrivacyTracking` false, empty `NSPrivacyTrackingDomains`, empty `NSPrivacyCollectedDataTypes`.
  - `NSPrivacyAccessedAPITypes` with `NSPrivacyAccessedAPICategoryUserDefaults`, reasons `CA92.1` and `1C8F.1`.
  - Run `grep -rn "UserDefaults" ios/App/FaithfulDaysWidget` first. If the widget does not use UserDefaults, its manifest lists no API types.
- [ ] **Step 2:** Add the PBXFileReference, PBXBuildFile and Resources build-phase entries by hand, following the pattern of the existing widget files. Run `plutil -lint` locally if it is available, otherwise `python3 -c "import plistlib,sys;plistlib.load(open(sys.argv[1],'rb'))" <file>` on each manifest — expected: OK.
- [ ] **Step 3:** Push the branch and confirm the "iOS simulator compile" job in `native-ci.yml` passes. This is the only verification for `project.pbxproj`.
- [ ] **Step 4:** Commit `chore(ios): add privacy manifests for the app and widget`.

### Task 10: Docs, store pack, terms checklist and version

**Files:**
- Create: `docs/terms-checklist.md`
- Modify: `CLAUDE.md`, `README.md`, `docs/platform-matrix.md`, `docs/quality-gates.md`, `docs/store-release-pack.md`, `docs/roadmap.md`, `package.json` (`5.3.0`), `android/app/build.gradle` (`versionName "5.3.0"`, bump `versionCode`), `ios/App/App.xcodeproj/project.pbxproj` (`MARKETING_VERSION = 5.3.0`), `package-lock.json` (version field, via `npx npm@11 install --package-lock-only`)

**Interfaces:** none.

- [ ] **Step 1:** Update `CLAUDE.md`:
  - **Overview:** phone-only, seven routines, the store v4 state table (with `jw-habits-v3-backup`), the Dates card, backup state.
  - **Workflows and commands:** remove PWA, deploy, `/share` and `offline:verify`; add `pages.yml`.
  - **Known issues:** replace the deploy/TLS items with one line saying the website was retired on 2026-10-28.
  - Bump the audit date to 2026-10-28.
- [ ] **Step 2:** Write `docs/terms-checklist.md`. Quote each jw.org clause from spec "Research basis", say how the app meets it, and add a "Before release" list: no JW marks in name, icon or keywords; feed is dates-only; the DeveloperSupport@jw.org decision.
- [ ] **Step 3:** In `store-release-pack.md`:
  - Add App Review notes listing widgets, local reminders, offline use and the share sheet.
  - Set "Data Not Collected" on Apple and "no data collected or shared" on Play.
  - Add the new privacy and support URLs, and the name and keyword rule.
- [ ] **Step 4:** Run `grep -rIn "jwhabits.ashbi.ca\|PWA\|service worker" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs/superpowers . ` — expected: only historical files (`REVIEW-2026-07-*.md`, `ROADMAP-2026-07-23.md`) or none.
- [ ] **Step 5:** Run lint, format check, `npm test`, `npm audit --audit-level=high`, `npm run build`, `node scripts/verify/budgets.cjs` and `npm run smoke:spawn` — expected: all exit 0.
- [ ] **Step 6:** Commit `docs: phone-only 5.3.0 docs, store pack and jw.org terms checklist`.
