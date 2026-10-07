# Faithful Days — App Implementation Plan (spec Phases 0 + 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the habit-tracker app as *Faithful Days*: six JW-oriented routines, forgiving streaks, a customizable onboarding, a daily wrap-up, native reminders and widgets, and a What's New badge. Everything stays on the device.

**Architecture:**
- Pure domain functions in `src/domain/` calculate everything (what's due, streaks, grace, the Bible plan, the wrap-up, the notification schedule) from a single versioned store (`jw-habits-v2`).
- The store is persisted through `safeStorage`: Capacitor Preferences on native, `localStorage` on web.
- React screens read the store from one context.
- Native code is limited to a widget per platform plus a small `WidgetBridge` Capacitor plugin. The app writes a snapshot for the widget, and drains a queue of check-ins made from the widget.

**Tech Stack:** Capacitor 8, React 19, Vite 8, Tailwind 4 + DaisyUI 5, i18next, Vitest 4 + Testing Library, Playwright. Native: SwiftUI WidgetKit + App Intents (iOS 17+), Kotlin App Widget (Android).

**Spec:** `docs/superpowers/specs/2026-10-06-faithful-days-design.md` (approved and amended 2026-10-06). Read it before Task 1; this plan cites it as "spec §x".

**Out of this plan (separate plans later):** spec Phase 1 (the CI release pipeline), Phase 3 (store launch), Phase 4 (web cutover). This plan does **not** delete the PWA code. It only gates it off on native (Task 10), because the web app keeps serving users until Phase 4.

## Global Constraints

- **App name:** `Faithful Days`. Bundle/application id stays `ca.ashbi.habittracker`. Version `5.0.0`, Android `versionCode 500`, iOS build `500`.
- **Routine ids, fixed:** `dailyText`, `bibleReading`, `meetingPrep`, `familyWorship`, `personalStudy`, `ministry`. Labels are display-only, at most 30 characters.
- **The store key is `jw-habits-v2`.** Never rename any `jw-` key (CLAUDE.md).
- **The day boundary is 03:00 local time.** All dates are app days in the form `YYYY-MM-DD`, computed by `appDay()` (Task 1). Never use `toISOString()` for days.
- **Weeks run Monday to Sunday.** A month is a calendar month. A service year runs September to August.
- **No jw.org content is bundled**: no verse text, no daily text, no artwork, nothing scraped (spec §2.2). Links are URLs only.
- **No analytics, crash SDKs, ads or IAP.** The only network request is What's New (Task 9), made through `CapacitorHttp`. The feed sends no CORS header.
- **Notifications:** at most 2 per app day (one morning, one evening). Never name a missed routine. No follow-ups (spec §2.7).
- **Copy rules:** never "broke", "failed", "missed" or "lost" in UI copy. Fixed strings, verbatim:
  - "Life happens — kept your streak"
  - "Rest well — tomorrow's a fresh start."
  - "Still time"
  - "Your day in review is ready"
  - "Tomorrow's meeting — prep is ready when you are"
  - "Done for today"
  - "Skip — use defaults"
- **Disclaimer, verbatim:** "Faithful Days is an independent app. It is not affiliated with, endorsed by, or sponsored by Watch Tower Bible and Tract Society or jw.org, and contains no content from jw.org."
- **i18n:** new strings go in `src/locales/en.json` under the `fd.` namespace prefix. es/fr fall back to English (the existing `fallbackLng`).
- **Default links**, by locale `en` / `es` / `fr` (all verified 2026-10-06):
  - daily text: `https://wol.jw.org/en/wol/dt/r1/lp-e`, `https://wol.jw.org/es/wol/dt/r4/lp-s`, `https://wol.jw.org/fr/wol/dt/r30/lp-f`;
  - meetings: `https://wol.jw.org/{en|es|fr}/wol/meetings/{r1/lp-e|r4/lp-s|r30/lp-f}`;
  - chapter: `https://www.jw.org/finder?wtlocale={E|S|F}&prefer=lang&bible={BB}{CCC}001&pub=nwtsty`.
- **What's New feeds:** `https://www.jw.org/en/whats-new/rss/WhatsNewWebArticles/feed.xml`, `https://www.jw.org/es/lo-nuevo/rss/WhatsNewWebArticles/feed.xml`, `https://www.jw.org/fr/nouveautes/rss/WhatsNewWebArticles/feed.xml`.
- **iOS App Group:** `group.ca.ashbi.habittracker` (already in `App.entitlements`).

## Decisions this plan makes where the spec is silent

1. **Schedule history.** Settings that change when routines are due (enabled flags, meeting days, family worship day, weekly targets) are stored as dated entries: `schedule: [{from, ...}]`. Past occurrences are judged by the schedule in force on that day, so changing meeting days never turns past days into misses.
2. **Grace is calculated from the log, not stored.** The spec lists `graceUsed` in the store; calculating it is deterministic and follows the spec's "calculated, never stored" rule. The store has no `graceUsed` field.
3. **Cadences:**
   - `dailyText`: daily.
   - `bibleReading`: daily when `bibleDaysPerWeek === 7`, otherwise a weekly target.
   - `personalStudy`: a weekly target.
   - `meetingPrep`: per meeting. Due from the day before a meeting through the meeting day.
   - `familyWorship`: weekly. Due from its day through Sunday until done.
   - `ministry`: monthly.
4. **The ministry row** shows on Today all month until it's toggled for that month. In pioneer mode it stays visible all month, with the hours entry.
5. **The widget** reads a snapshot written by the app and writes widget check-ins to a queue. The app drains the queue when it starts and when it resumes. The widget never runs domain logic.

## Review Focus

1. **DST and travel around the 03:00 boundary.** On the night clocks change, and after a timezone change, today must be stable and no day may be skipped or doubled. Covered by a test in Task 1.
2. **Changing settings mid-history.** Changing meeting days, or switching a routine off and back on, must not create misses in the past. Covered by a test in Task 3.
3. **A device clock set backwards, or log entries dated in the future.** Entries after today are ignored for streaks and the wrap-up, and nothing crashes. Covered by a test in Task 3.
4. **Importing a malformed, older or newer-version file.** It is rejected with a message, and the existing data is untouched; nothing is half-replaced. Covered by a test in Task 4.
5. **Notification permission denied, or Android exact alarms unavailable.** Scheduling must not throw, the rest of the app still works, and inexact `allowWhileIdle` alarms are used. Covered by a test in Task 7.

---

### Task 1: App days and schedules

**Files:**
- Create: `src/domain/day.js`, `src/domain/schedule.js`
- Test: `src/domain/day.test.js`, `src/domain/schedule.test.js`

**Interfaces:**
- Produces:
  - `appDay(now: Date): string`: the local date of `now − 3h`, as `YYYY-MM-DD`.
  - `addDays(day: string, n: number): string`, `weekday(day): 0..6` (0 is Sunday), `weekStart(day): string` (the Monday), `monthKey(day): 'YYYY-MM'`, `serviceYear(day): number` (the year in which that September falls).
  - `scheduleOn(store, day): ScheduleEntry`, where `ScheduleEntry = {from, enabled: Record<RoutineId, boolean>, meetingDays: number[], familyWorshipDay: number, bibleDaysPerWeek: 1..7, studyPerWeek: 1..7}`.
  - `withScheduleChange(store, day, patch): Store`: appends an entry, or replaces today's entry if one already exists for that day.

- [ ] **Step 1:** Write the failing tests:
  - `appDay(new Date(2026,9,6,2,59))` returns `'2026-10-05'`, and `appDay(new Date(2026,9,6,3,0))` returns `'2026-10-06'`.
  - Fed every hour across 2026-03-08 and 2026-11-01 under `TZ=America/Toronto`, `appDay` produces a sequence with no skipped and no repeated date (Review Focus 1). Set `process.env.TZ` in the test file before importing.
  - `weekStart('2026-10-11')` (a Sunday) returns `'2026-10-05'`.
  - `serviceYear('2026-08-31')` returns 2025, and `serviceYear('2026-09-01')` returns 2026.
  - `scheduleOn` chooses the latest entry with `from <= day`.
  - `withScheduleChange` on the same day replaces that day's entry rather than appending.
- [ ] **Step 2:** Run `npx vitest run src/domain/day.test.js src/domain/schedule.test.js`. Expected: FAIL, module not found.
- [ ] **Step 3:** Implement both modules. Use local `Date` getters only, never UTC.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(domain): app days with 03:00 boundary and dated schedules`.

### Task 2: Bible books and reading plans

**Files:**
- Create: `src/domain/bible.js`
- Test: `src/domain/bible.test.js`

**Interfaces:**
- Consumes: `addDays` (Task 1).
- Produces:
  - `BOOKS: {n: 1..66, name: string, chapters: number}[]`. Use the English names in `src/utils/bibleBooks.ts` order.
  - `chapterIndex(book, chapter): 0..1188` and its inverse `chapterAt(i): {book, chapter}`.
  - `nextChapters(store, count): {book, chapter}[]`: continues from the furthest chapter read past the starting point, wrapping from Revelation 22 to Genesis 1.
  - `portionSize(store, day): number`. For `'year'` this is `floor((k+1)*1189/365) − floor(k*1189/365)`, where `k` is the number of days since `reading.startedOn`, mod 365. For `'ownPace'` it is 1.
  - `booksCompleted(store): number[]`: book numbers with every chapter read in the log, plus the books before the starting point when `reading.countEarlierAsRead` is set.
  - `finderUrl(locale, book, chapter): string`.

- [ ] **Step 1:** Write the failing tests:
  - `BOOKS.length === 66` and the chapter counts sum to 1189.
  - Psalms has 150 chapters, and Obadiah, Philemon, 2 John, 3 John and Jude each have 1.
  - Across k = 0..364 the year plan's portions sum to 1189, every portion is 3 or 4, and every chapter is covered exactly once.
  - With a starting point of Psalms 1 and `countEarlierAsRead: true`, `booksCompleted` contains books 1–18 and not 19.
  - Setting `countEarlierAsRead` back to false removes them, and the log is unchanged.
  - `finderUrl('en', 19, 1)` returns `https://www.jw.org/finder?wtlocale=E&prefer=lang&bible=19001001&pub=nwtsty`.
- [ ] **Step 2:** Run `npx vitest run src/domain/bible.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement. Book data is a literal array of names and chapter counts, which are public facts. No verse text.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(domain): Bible books, year/own-pace plans, finder links`.

### Task 3: Due today, streaks, grace and totals

**Files:**
- Create: `src/domain/routines.js`, `src/domain/progress.js`
- Test: `src/domain/routines.test.js`, `src/domain/progress.test.js`

**Interfaces:**
- Consumes: Task 1 and Task 2.
- Produces:
  - `ROUTINE_IDS`, `DEFAULT_LABELS` (en: "Daily text", "Bible reading", "Meeting prep", "Family worship", "Personal study", "Ministry"), and `CADENCE: Record<RoutineId, 'daily'|'weeklyTarget'|'meeting'|'weekly'|'monthly'>` (bibleReading resolves through the schedule).
  - `isDone(store, id, day): boolean`.
  - `dueToday(store, day): RoutineId[]`, using decisions 3 and 4.
  - `occurrences(store, id, fromDay, toDay): {key, status: 'done'|'grace'|'open'|'missed'}[]`.
  - `streak(store, id, today): {current, recentDone, recentTotal, recentUnit: 'days'|'weeks'|'meetings'|'months'}`.
  - `totals(store, today): {readingDaysThisYear, chaptersThisYear, booksCompleted: number, perRoutineDaysThisYear: Record<RoutineId, number>}`.

**Grace algorithm** (the signature doesn't determine it):
- Walk the occurrences in date order. Each missed occurrence becomes `'grace'` while that period's budget lasts, otherwise `'missed'`.
- Budgets:
  - `daily` and `weeklyTarget`: 2 per calendar month of the occurrence;
  - `meeting` and `weekly`: 1 per calendar month;
  - `monthly`: 1 per service year.
- The current, still-open occurrence is `'open'`, never `'missed'`.
- `current` counts consecutive `'done'` and `'grace'` occurrences, going back from the most recent closed one. An `'open'` occurrence is skipped, not counted as a break.
- `recentTotal` covers the last 30 days for `daily`, 8 for `weeklyTarget`, `meeting` and `weekly`, and 12 for `monthly`.

- [ ] **Step 1:** Write the failing tests:
  - On a meeting day (Tuesday, with meetingDays `[2,0]`), `dueToday` includes `meetingPrep`. On Monday it does too. On Wednesday it doesn't.
  - Once Monday has a check-in, `meetingPrep` isn't due on Tuesday.
  - Grace: 2 missed days of `dailyText` in October both become `'grace'`, and a third becomes `'missed'`. In November the budget resets.
  - Ministry: one missed month in a service year becomes `'grace'`, and a second becomes `'missed'`.
  - **Review Focus 2:** meeting days change from `[2,0]` to `[3,6]` on 2026-10-01. The September Tuesdays that were checked still count as done, and no September Wednesday appears as an occurrence.
  - **Review Focus 2:** a routine switched off for a week and back on has no occurrences in that week, and its streak continues.
  - **Review Focus 3:** a log entry dated tomorrow is ignored by `streak` and `totals`.
  - A weekly target of 3 with 2 study check-ins this week gives `dueToday` including `personalStudy`. With 3 it doesn't.
  - `totals.booksCompleted` includes the baseline books, and `readingDaysThisYear` doesn't.
- [ ] **Step 2:** Run `npx vitest run src/domain/routines.test.js src/domain/progress.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(domain): due-today, occurrence streaks with scaled grace, totals`.

### Task 4: The v2 store: schema, defaults, validation, export and import

**Files:**
- Create: `src/domain/store.js`
- Test: `src/domain/store.test.js`

**Interfaces:**
- Produces:
  - `STORE_VERSION = 2`.
  - `defaultStore(today: string, locale: string): Store`, with the spec §2.6 skip defaults:
    - all six routines enabled;
    - `meetingDays: []`, `familyWorshipDay: 5`, `bibleDaysPerWeek: 7`, `studyPerWeek: 3`;
    - not a pioneer, `hoursGoal: 50`;
    - reading `{plan: 'year', start: {book: 1, chapter: 1}, startedOn: today, countEarlierAsRead: false}`;
    - `anchors: {dailyText: '07:00'}`, `wrapUpTime: '20:00'`, `wrapUpNotification: false`, `quietHours: null`, `tone: 'warm'`;
    - `reminders: {enabled: true, off: []}`, where `off` lists routine ids whose reminders are switched off (spec §2.7);
    - `accent: 0`, `theme: 'system'`;
    - `labels: {}`, `studyTopic: ''`, `links: {}`;
    - `whatsNew: {enabled: true, lastCheck: null, seen: [], newCount: 0}`;
    - `onboardingDone: false`, `log: []`, `schedule: [ … ]`.
  - `validateStore(x): {ok: true, store} | {ok: false, reason: 'notObject'|'newerVersion'|'olderVersion'|'badShape'}`.
  - `addCheckIn(store, {routine, day, value})` and `removeCheckIn(store, routine, day)`. These are pure and return a new store. At most one entry per routine and day; adding again replaces it.
  - `exportJson(store): string` and `importJson(text): ReturnType<validateStore>`.
  - `labelFor(store, id, t): string`: the custom label if set, otherwise `t('fd.routine.'+id)`.

- [ ] **Step 1:** Write the failing tests:
  - An export/import round trip is deep-equal.
  - **Review Focus 4:** `importJson('{')` returns `notObject`, a store with `version: 3` returns `newerVersion`, a log entry with an unknown routine id returns `badShape`, and none of these mutate their input.
  - A label longer than 30 characters fails validation with `badShape`.
  - `addCheckIn` twice for the same routine and day leaves 1 entry.
  - Renaming a label leaves `log` deep-equal to before.
- [ ] **Step 2:** Run `npx vitest run src/domain/store.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement. Validation is hand-written; don't add a schema library.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(domain): v2 store schema, validation, export/import`.

### Task 5: Migrating v1 data

**Files:**
- Create: `src/domain/migrateV1.js`
- Test: `src/domain/migrateV1.test.js` (fixtures inline)

**Interfaces:**
- Consumes: `defaultStore`, `addCheckIn` (Task 4).
- Produces: `migrateV1(read: (key) => string|null, today, locale): Store|null`. It returns `null` when there is no v1 key at all.

**Mapping:**
- `jw-daily-habits-state.done` on its `date`: `text` maps to `dailyText`, `bible` to `bibleReading`, `meeting` to `meetingPrep` and `family` to `familyWorship`. Either the `{done:true}` or the legacy `true` shape counts as done.
- Each `jw-bible-reading-days` date becomes a `bibleReading` entry with `value: true`.
- From `jw-user-settings`: `midweekDay` and `weekendDay` become `meetingDays`, `reminderTime` becomes `anchors.dailyText`, and `quietHours` carries over.
- `onboardingDone: true`, so migrated users don't see onboarding again. `jw-habits-best-streak` is dropped, because streaks are recalculated.
- v1 keys are only read, never deleted.

- [ ] **Step 1:** Write the failing tests, covering both done shapes, the meeting-day mapping, the bible days, `null` when there are no keys, and that v1 keys are still present afterwards.
- [ ] **Step 2:** Run `npx vitest run src/domain/migrateV1.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(domain): migrate v1 localStorage into the v2 store`.

### Task 6: Durable persistence and the store context

**Files:**
- Modify: `src/utils/safeStorage.js` to add async durable functions.
- Create: `src/data/StoreProvider.jsx`, `src/data/useStore.js`
- Modify: `src/main.jsx`, `src/components/ErrorBoundary.jsx`, `src/utils/notificationScheduler.js`, `src/utils/bibleReadingTracker.js`, `src/utils/settingsStore.js`, `src/hooks/useHabitState.js`. Replace their direct `localStorage.*` calls with `safeGetItem`/`safeSetItem`/`safeRemoveItem`. Behaviour stays the same; these modules are deleted in Task 15.
- Test: `src/utils/safeStorage.test.js` (extend), `src/data/StoreProvider.test.jsx`

**Interfaces:**
- Consumes: Tasks 4 and 5, and `isNative` from `src/utils/native.js`.
- Produces:
  - `durableGet(key): Promise<string|null>`, `durableSet(key, value): Promise<void>`, `durableRemove(key): Promise<void>`. On native these use `@capacitor/preferences`; on web, the existing safe localStorage functions. Durable writes are serialized, so the last write wins.
  - `<StoreProvider>`. On mount it loads `jw-habits-v2`. If that's missing it runs `migrateV1(safeGetItem, …)`, and if that returns null, `defaultStore(…)`. Until loaded it renders `null` (the splash screen still covers it on native). Every update saves immediately.
  - `useStore(): {store, update(fn: (Store) => Store): void, today: string}`. `today` recomputes on app resume (`appLifecycle.onStateChange` with `isActive` true, in native.js) and at 03:00.
  - `onForeground(callback)`, exported from `StoreProvider.jsx`. It registers callbacks that run after load and on every resume. Tasks 7, 9 and 14 use it.
- Rule: after this task, `grep -rn "localStorage\." src --include=*.js --include=*.jsx | grep -v test | grep -v safeStorage.js` returns nothing.

- [ ] **Step 1:** Write the failing tests:
  - Writing through `update` and then remounting the provider gives the same store. Mock `@capacitor/preferences` with an in-memory Map and force `isNative` true via `vi.mock('../utils/native.js')`.
  - With v1 keys present and no v2 key, the provider loads the migrated store.
  - Two rapid `update` calls persist both changes.
- [ ] **Step 2:** Run `npx vitest run src/utils/safeStorage.test.js src/data/StoreProvider.test.jsx`. Expected: FAIL.
- [ ] **Step 3:** Implement, and reroute the direct `localStorage` calls.
- [ ] **Step 4:** Run `npm test`. Expected: all suites PASS, including the existing ones. Also run the rule's grep. Expected: no output.
- [ ] **Step 5:** Commit: `feat(data): durable v2 store via Preferences, single storage chokepoint`.

### Task 7: Planning and scheduling notifications

**Files:**
- Create: `src/domain/notifications.js`, `src/native/reminders.js`
- Modify: `src/data/StoreProvider.jsx`, so that `onForeground` runs `syncReminders` (spec §2.7: reschedule each time the app opens).
- Test: `src/domain/notifications.test.js`, `src/native/reminders.test.js`

**Interfaces:**
- Consumes: `dueToday`, `isDone`, `labelFor`, `scheduleOn`, `addDays`.
- Produces:
  - `planNotifications(store, now: Date, t, days = 7): {id: number, at: Date, kind: 'morning'|'evening', body: string}[]`. Ids are `dayOffset*10 + (kind==='morning' ? 1 : 2)`.
  - `syncReminders(store, t): Promise<{scheduled: number}>`. It cancels everything pending, then schedules the plan through `LocalNotifications.schedule` with `allowWhileIdle: true`.

**The plan, per spec §2.7:**
- **Morning:** at the earliest anchor time, only if at least one enabled routine is due that day. The body lists the due routines' labels, e.g. "07:00 · Daily text and Bible reading are ready". When the anchor is a phrase, it is used in place of the time, e.g. "After breakfast · …".
- **Evening, at `wrapUpTime`:**
  - if `wrapUpNotification` is on, the body is "Your day in review is ready";
  - else, on the evening before a meeting day with meetingPrep enabled, the body is "Tomorrow's meeting — prep is ready when you are";
  - when both apply, the body holds both lines separated by a newline.
- Drop anything inside `quietHours`. Never more than 2 notifications per day.
- When `reminders.enabled` is false, the plan is empty. Routines listed in `reminders.off` are left out of the morning list, and an evening meeting line is never produced when `meetingPrep` is in `off`.

- [ ] **Step 1:** Write the failing tests:
  - On a non-meeting eve with the wrap-up notification off, the plan has only a morning notification.
  - On a meeting eve with the wrap-up notification on, there is one evening entry containing both lines.
  - No body contains "missed", "broke", "failed" or "lost".
  - With quiet hours 22:00–07:00 and the anchor at 06:30, there is no morning entry.
  - With every routine off, the plan is empty.
  - With `reminders.enabled: false`, the plan is empty. With `dailyText` in `reminders.off` and only the daily text due, there is no morning entry.
  - **Review Focus 5:** `syncReminders` with `checkPermissions` resolving `{display:'denied'}` resolves `{scheduled: 0}` without throwing. When `schedule` rejects, it resolves `{scheduled: 0}` and logs through `console.warn`.
- [ ] **Step 2:** Run `npx vitest run src/domain/notifications.test.js src/native/reminders.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement. `syncReminders` is a no-op on web (it returns `{scheduled: 0}`).
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(reminders): planned local notifications, max two a day`.

### Task 8: Wrap-up model and encouragement

**Files:**
- Create: `src/domain/wrapup.js`, `src/domain/encouragement.js`
- Test: `src/domain/wrapup.test.js`, `src/domain/encouragement.test.js`

**Interfaces:**
- Consumes: Tasks 1, 2 and 3.
- Produces:
  - `isWrapUpTime(store, now: Date): boolean`: true from `wrapUpTime` until the 03:00 rollover.
  - `wrapUp(store, now): {done: RoutineId[], moved: {id, text}[], stillOpen: RoutineId[], graceUsedToday: boolean, state: 'allDone'|'some'|'none', closingLine: string|null}`. `stillOpen` is empty from 22:00 on. When `state === 'none'`, `done`, `moved` and `stillOpen` are all empty and `closingLine` is "Rest well — tomorrow's a fresh start.". After 22:00 the closing line is that string too.
  - `WARM_LINES: string[]`, 30 original lines. Examples: "Nicely done.", "A good start to the day.".
  - `REFERENCES: {book, chapter, verse}[]`, about 60 references. References only, no verse text.
  - `pickEncouragement(tone, seed): {text: string|null, ref: {book, chapter, verse}|null}`. `quiet` gives both null, `warm` gives a line, `scripture` gives a line plus a reference.

- [ ] **Step 1:** Write the failing tests:
  - At 21:00 with 2 of 3 routines done, `state` is `'some'` and `stillOpen` has 1. At 22:30, `stillOpen` is `[]` and the closing line is set.
  - With nothing done, `state` is `'none'` and the lists are empty.
  - `moved` for bible reading includes "13 of 66 books" when 13 books are complete.
  - `pickEncouragement('quiet')` returns null text.
  - Every `REFERENCES` entry points at a valid `chapterIndex`.
  - No `WARM_LINES` entry contains "missed", "broke", "failed" or "lost".
- [ ] **Step 2:** Run `npx vitest run src/domain/wrapup.test.js src/domain/encouragement.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement. Write the lines yourself, keeping them short, warm and non-sectarian.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(domain): daily wrap-up model and encouragement lines`.

### Task 9: What's New

**Files:**
- Create: `src/domain/whatsNew.js`, `src/native/whatsNewClient.js`
- Modify: `src/data/StoreProvider.jsx`, so that `onForeground` runs `checkWhatsNew` and, on a non-null result, `update(s => ({...s, whatsNew: result}))`.
- Test: `src/domain/whatsNew.test.js`, `src/native/whatsNewClient.test.js`

**Interfaces:**
- Produces:
  - `feedUrl(locale): string`, using the Global Constraints URLs. Any other locale falls back to en.
  - `parseFeed(xml: string): {guid: string, pubDate: string}[]`. Use `DOMParser`, and read **only** `guid` and `pubDate`.
  - `applyFeed(whatsNew, items, now): whatsNew`, which sets `newCount` and `lastCheck`. On the first ever check, every item is marked seen and `newCount` is 0.
  - `markAllSeen(whatsNew, items)`. `seen` is capped at 100, most recent first.
  - `checkWhatsNew(store, now, locale): Promise<WhatsNewState|null>`. It returns null when the feature is disabled, when on web, or when fewer than 24 h have passed since `lastCheck`. It fetches through `CapacitorHttp.get` with a 10 s timeout. Any error returns null and is not shown.
- The Today badge (Task 11) opens jw.org's What's New page: the feed URL without `rss/WhatsNewWebArticles/feed.xml`.

- [ ] **Step 1:** Write the failing tests:
  - A fixture copied from the live feed shape: 3 items, each with a title, description, `img` and guid.
  - `parseFeed` returns objects whose keys are exactly `['guid','pubDate']`.
  - `JSON.stringify` of the stored state never contains the fixture's titles.
  - Malformed XML and an empty channel both return `[]`.
  - `applyFeed` with 2 unseen items gives `newCount: 2`.
  - A second check within 24 h makes no HTTP call.
  - A rejected HTTP request resolves null.
- [ ] **Step 2:** Run `npx vitest run src/domain/whatsNew.test.js src/native/whatsNewClient.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(whatsnew): date-only feed check via native HTTP`.

### Task 10: App shell, theme, branding and gating the PWA

**Files:**
- Modify: `src/App.jsx`
  - Routes: `/` → Today, `/progress` → Progress, and the onboarding gate when `!store.onboardingDone`. Settings is a sheet over the current screen.
  - Render `PWAProvider`, `InstallPrompt` and `UpdatePrompt` only when `isWeb`.
  - Keep the `/share` route only when `isWeb`.
- Modify: `src/main.jsx`. Register the service worker only when `isWeb`. Wrap the app in `StoreProvider`.
- Create: `src/theme/theme.js`, which exports `ACCENTS` (6 hex presets; the first is `#4A6FA4`, the current brand colour) and `applyTheme(store)`. `applyTheme` sets `data-theme` (`light`/`dark`/system via `prefers-color-scheme`) and the `--fd-accent` variable on `<html>`.
- Create: `src/screens/Progress.jsx` and `src/screens/Today.jsx` as placeholders (filled in by Tasks 11–12).
- Modify: branding.
  - `capacitor.config.json` `appName`, `ios/App/App/Info.plist` `CFBundleDisplayName`, `android/app/src/main/res/values/strings.xml` `app_name` and `title_activity_main` all become "Faithful Days".
  - Version 5.0.0 / 500 in `package.json`, `android/app/build.gradle` (`versionCode 500`, `versionName "5.0.0"`) and the iOS project's `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION`.
- Create: `assets/icon.svg`, an original icon: a simple sunrise-over-open-path mark in the accent colour, with no square-blue look and no lettering. Run `npx @capacitor/assets generate --ios --android` to produce the platform icons.
- Test: `src/App.test.jsx`

- [ ] **Step 1:** Write the failing tests:
  - With `onboardingDone: false`, the app renders the onboarding (test id `onboarding`).
  - With `onboardingDone: true`, it renders Today (test id `today`).
  - With `isWeb` mocked false, the install prompt is not in the DOM.
  - `applyTheme` with `accent: 2, theme: 'dark'` sets `data-theme="dark"` and `--fd-accent` to `ACCENTS[2]`.
- [ ] **Step 2:** Run `npx vitest run src/App.test.jsx`. Expected: FAIL.
- [ ] **Step 3:** Implement. `Onboarding` can be a stub with `data-testid="onboarding"` until Task 13.
- [ ] **Step 4:** Run `npm test && npm run build && npx cap sync`. Expected: PASS, a clean build, and a successful sync.
- [ ] **Step 5:** Commit: `feat(app): Faithful Days shell, theming, branding; PWA only on web`.

### Task 11: The Today screen

**Files:**
- Create: `src/components/RoutineRow.jsx`, `src/components/HoldToCheck.jsx`, `src/components/MinistryRow.jsx`, `src/components/WrapUpCard.jsx`, `src/components/WhatsNewBadge.jsx`
- Modify: `src/screens/Today.jsx`
- Test: `src/components/HoldToCheck.test.jsx`, `src/screens/Today.test.jsx`

**Interfaces:**
- Consumes: `useStore`, `dueToday`, `isDone`, `streak`, `nextChapters`, `portionSize`, `wrapUp`, `isWrapUpTime`, `pickEncouragement`, `checkWhatsNew`, `markAllSeen`, `labelFor`, `haptics` (native.js) and `syncReminders`.
- Produces:
  - `<HoldToCheck done onComplete onUndo holdMs={600} />`. Holding for 600 ms completes, with `haptics.success()` and the fill animation. Releasing early cancels. Tapping when done calls `onUndo` immediately. It is keyboard accessible: Space/Enter held for 600 ms completes. It has `aria-pressed`.
  - Every check-in calls `update(s => addCheckIn(...))` and then `syncReminders`.

**Behaviour, per spec §2.3–2.5 and §2.9–2.10:**
- The list shows only `dueToday` routines.
- Each row has the routine's label and link button, plus:
  - Bible reading: today's chapters ("Psalms 3–5") and a stepper for chapters read. Partial readings are allowed. If the stepper covers 2 or more portions while yesterday was due and has no entry, an entry is also added for yesterday (catch-up).
  - Personal study: "2 of 3 this week", followed by `studyTopic` when it's set ("2 of 3 this week · Daniel").
  - Meeting prep: "for Tuesday's meeting".
- Ministry uses `MinistryRow`: a toggle and a Bible-study stepper, plus hours in pioneer mode.
- The encouragement line shows for 3 seconds after a check-in.
- When `meetingDays` is empty, show a "Set your meeting days" card that opens Settings.
- When `whatsNew.newCount > 0`, show the "N new on jw.org" badge. Tapping it opens the page and marks everything seen.
- After `isWrapUpTime`, `WrapUpCard` replaces the list header and the list collapses. "Show routines" expands it, and "Done for today" collapses the card into a one-line summary until the next app day.
- On a Monday, show the "New week" line; on the first of the month, "New month".

- [ ] **Step 1:** Write the failing tests:
  - A 300 ms hold then release does not complete. A 600 ms hold calls `onComplete` and `haptics.success`. Tapping a done row calls `onUndo`.
  - At 09:00 on a Tuesday with meeting days `[2,0]`, Today shows Daily text, Bible reading and Meeting prep, and not Family worship (Friday).
  - Checking in Daily text shows a warm line. With tone `quiet`, no line appears.
  - At 21:00 the wrap-up card is shown. At 22:30 there is no "Still time" text. With nothing done, only "Rest well — tomorrow's a fresh start." appears.
  - The badge shows "2 new on jw.org" when `newCount` is 2.
  - Rendered copy never contains "missed", "broke", "failed" or "lost".
- [ ] **Step 2:** Run `npx vitest run src/components/HoldToCheck.test.jsx src/screens/Today.test.jsx`. Expected: FAIL.
- [ ] **Step 3:** Implement. Use DaisyUI and Tailwind classes with `--fd-accent`, and `lucide-react` icons.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(today): hold-to-check routines, ministry row, wrap-up card, what's new badge`.

### Task 12: Progress screen and Bible map

**Files:**
- Create: `src/components/BibleMap.jsx`
- Modify: `src/screens/Progress.jsx`
- Test: `src/screens/Progress.test.jsx`

**Interfaces:**
- Consumes: `streak`, `totals`, `booksCompleted`, `BOOKS`.
- Produces:
  - A card per enabled routine, showing:
    - `recentDone of recentTotal recentUnit` (e.g. "8 of the last 8 meetings");
    - the current streak;
    - days this year.
  - A reading card with "N days of reading this year", "N chapters" and "N of 66 books".
  - `<BibleMap>`: 66 cells in canonical order, with completed books filled. Each cell has an `aria-label` of "Genesis, read" or "Genesis, not yet". Baseline books are filled the same way.

- [ ] **Step 1:** Write the failing tests:
  - With 13 completed books, the map has 13 cells labelled ", read" and the text "13 of 66 books".
  - A disabled routine has no card.
  - The meeting card reads "8 of the last 8 meetings" for a fixture with 8 done meetings.
- [ ] **Step 2:** Run `npx vitest run src/screens/Progress.test.jsx`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(progress): streak/total cards and Bible-book map`.

### Task 13: Onboarding and Settings

**Files:**
- Create: `src/screens/onboarding/Onboarding.jsx` (the step controller) and one file per step: `StepWelcome.jsx`, `StepRoutines.jsx`, `StepWeek.jsx`, `StepReading.jsx`, `StepRhythm.jsx`, `StepLook.jsx`
- Create: `src/screens/SettingsSheet.jsx`, which reuses the step bodies as sections, plus Links, Export/Import, What's New on/off, Quiet hours, and About (the disclaimer, privacy and support links to `https://jwhabits.ashbi.ca/privacy` and `/support`).
- Test: `src/screens/onboarding/Onboarding.test.jsx`, `src/screens/SettingsSheet.test.jsx`

**Interfaces:**
- Consumes:
  - `useStore`;
  - `withScheduleChange`, for every change that affects what's due;
  - `defaultStore`, `exportJson`, `importJson`, `applyTheme`, `syncReminders`;
  - `LocalNotifications.requestPermissions`, called on the Rhythm step only, after its explainer text.
  - Export uses `@capacitor/share` with a `Filesystem` cache file on native, and a download link on web. Add `@capacitor/share` and `@capacitor/filesystem` at `^8`.
- Produces:
  - Each step's controls, which write into the draft store.
  - "Skip — use defaults" on steps 2–6, which keeps that step's defaults and moves on.
  - Finishing sets `onboardingDone: true`, applies the theme, syncs reminders and lands on Today.

**Content of each step:** see spec §2.6. In addition:
- Rename fields are limited to 30 characters, with "Reset to default".
- The Look step renders a live mini Today preview using the draft accent and theme.

- [ ] **Step 1:** Write the failing tests:
  - Pressing "Skip — use defaults" on every step ends on Today with a store equal to `defaultStore` plus `onboardingDone: true`.
  - Renaming Meeting prep to "Prepare comments" shows that label on Today, and the log is unchanged.
  - Choosing Psalms 1 with "Count earlier books as read" gives 18 completed books on Progress.
  - Choosing accent 3 updates the preview's `--fd-accent`.
  - In Settings, changing meeting days appends a schedule entry and leaves past occurrences intact (Task 3 behaviour, exercised through the UI).
  - Importing a file whose `version` is 3 shows an error, and the store is unchanged.
  - About contains the disclaimer verbatim.
- [ ] **Step 2:** Run `npx vitest run src/screens/onboarding/Onboarding.test.jsx src/screens/SettingsSheet.test.jsx`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(onboarding): six customizable steps with skip; settings sheet`.

### Task 14: Native widgets and WidgetBridge

**Files:**
- Create: `src/native/widgetBridge.js`, which registers the plugin `WidgetBridge` with `registerPlugin` and exports `publishSnapshot(store, today, t): Promise<void>` and `drainWidgetCheckIns(): Promise<{routine, day}[]>`.
- Create: `ios/App/App/WidgetBridgePlugin.swift`. Methods `setSnapshot({json})` and `drainQueue() -> {items}` use `UserDefaults(suiteName: "group.ca.ashbi.habittracker")` with the keys `fd.snapshot` and `fd.queue`, and call `WidgetCenter.shared.reloadAllTimelines()`.
- Create: `ios/App/FaithfulDaysWidget/`, a WidgetKit extension target in the same App Group:
  - `FaithfulDaysWidget.swift`, with small and medium families;
  - `CheckInIntent.swift`, an App Intent that marks the routine done in the snapshot, appends `{routine, day}` to `fd.queue`, and reloads.
- Create: `android/app/src/main/java/ca/ashbi/habittracker/WidgetBridgePlugin.kt`, with the same two methods on `SharedPreferences("fd_widget")`. It triggers `AppWidgetManager` updates.
- Create: `android/app/src/main/java/ca/ashbi/habittracker/widget/TodayWidgetProvider.kt` and `CheckInReceiver.kt` (a broadcast with extras `routine` and `day`), plus `res/layout/widget_today.xml` and `res/xml/widget_today_info.xml`. Register them in `AndroidManifest.xml`.
- Modify: `MainActivity.java` (`registerPlugin(WidgetBridgePlugin.class)`), and `StoreProvider`. Through `onForeground`, the provider calls `drainWidgetCheckIns`, then `addCheckIn` for each item. It calls `publishSnapshot` after every update.
- Create: `docs/release-checklist.md`, the manual device checklist from spec §6.
- Test: `src/native/widgetBridge.test.js`

**The snapshot** (JSON written by the app; the widget only reads it):
```json
{"day":"2026-10-06","doneCount":2,"dueCount":4,
 "items":[{"routine":"dailyText","label":"Daily text","done":true}],
 "accent":"#4A6FA4"}
```
- **Small widget:** a ring showing "doneCount of dueCount".
- **Medium widget:** up to 4 items, each a check-in button.
- If `day` in the snapshot isn't the widget's current app day (calculated natively with the same 03:00 rule), it shows "Open Faithful Days to start today". It never shows stale ticks.

- [ ] **Step 1:** Write the failing tests:
  - `publishSnapshot` sends JSON with exactly the keys above, and `items` lists only the due routines.
  - `drainWidgetCheckIns` returning 2 items results in 2 log entries in the provider.
  - On web, both functions are no-ops.
- [ ] **Step 2:** Run `npx vitest run src/native/widgetBridge.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement the JS side, then both native sides.
- [ ] **Step 4:** Run `npm test`. Expected: PASS. Then run `npx cap sync && cd android && ./gradlew assembleDebug`. Expected: BUILD SUCCESSFUL. The iOS target must build in Xcode or in CI (`xcodebuild -scheme App -sdk iphonesimulator build`), since there's no Mac locally.
- [ ] **Step 5:** Run the checklist's widget items on an Android device or emulator. Record the results in the PR.
- [ ] **Step 6:** Commit: `feat(widget): iOS WidgetKit + Android widget via WidgetBridge snapshot/queue`.

### Task 15: Retire the v1 UI, update the docs, rewrite the journeys

**Files:**
- Delete:
  - `src/pages/Home.jsx`, `src/pages/Home.test.jsx`, `src/components/SettingsAccordion.jsx`;
  - `src/hooks/useHabitState.js` (+ test);
  - `src/utils/{doneState,habitProgress,streak,weekContext,dailyBibleReading,bibleReadingTracker,userLinks}.js` and their tests.
- Keep `settingsStore.js` and its v1 key constants only if `migrateV1` imports them; otherwise delete it too.
- Modify: `src/utils/notificationScheduler.js`. Delete it if nothing imports it after Task 7; the web-only path isn't needed.
- Modify: `scripts/verify/smoke.cjs` and `scripts/verify/journeys.cjs`. Rewrite them for: onboarding (full path and skip path), hold-to-check and undo, switching a routine off, renaming a routine, the ministry toggle, and the wrap-up card with the clock mocked to 21:00 via `page.clock`.
- Modify: `CLAUDE.md`. Rewrite the "What this is", "The rows", "State model" and "Source tree" sections for v2. Change the rule to "No third-party *content* in shipped code; user-editable links to jw.org/JW Library and the What's New feed check are allowed" (spec §4). Bump the audit date.
- Modify: `README.md`, giving the name and a one-paragraph description.

- [ ] **Step 1:** Delete the files, then run `npm run lint && npm test`. Expected: PASS, with no imports of deleted modules.
- [ ] **Step 2:** Run `npm run smoke:spawn`. Expected: all smoke checks pass and the exit code is 0.
- [ ] **Step 3:** Run `npm run build && npm run preview & npm run journeys`. Expected: all journeys pass and the exit code is 0.
- [ ] **Step 4:** Run `npm run format:check && npm audit --audit-level=high`. Expected: clean.
- [ ] **Step 5:** Commit: `refactor: retire v1 habit UI; docs and journeys for Faithful Days`.
