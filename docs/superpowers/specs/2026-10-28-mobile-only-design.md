# Mobile-only Faithful Days: design

**Date:** 2026-10-28
**Status:** draft, awaiting owner review
**Target version:** 5.3.0

## Goal

Faithful Days becomes a phone app only (iOS and Android). It stays a habit tracker
and planner that helps Jehovah's Witnesses keep good spiritual habits and stay
up to date, while staying within jw.org's Terms of Use and the app store rules.

This round has six parts:

1. Remove the website: hosting, deploy, the PWA and the web-only screens.
2. Host the privacy and support pages on GitHub Pages.
3. Add a "What's new" daily habit, with the jw.org feed count on by default.
4. Add a big-dates calendar.
5. Add a backup reminder.
6. Store readiness: iOS privacy manifest, review notes, docs.

## What the owner decided

- Phone only. The website at jwhabits.ashbi.ca is no longer a product.
- "What's new" is a daily habit that links to jw.org's What's New page.
- The jw.org feed count stays, **on by default**, with an off switch in Settings.
- New features this round: the big-dates calendar and the backup reminder.
  The monthly ministry report reminder is a later follow-up.

## Research basis (checked 2026-10-28)

- **jw.org Terms of Use** forbid shipping jw.org text, artwork or trademarks
  inside an app, and forbid distributing tools "specifically made to collect,
  copy, download, extract, harvest, or scrape data" from the site. The exception
  names free apps that download "EPUB, PDF, MP3, and MP4 files". Sharing links
  and "directing others to this website" are allowed.
- **The feed** (`/en/whats-new/rss/WhatsNewWebArticles/feed.xml`) is official
  and live, describes itself as "See what has been recently added to jw.org",
  and is not blocked by robots.txt. It is not linked from the What's New page.
  The exception does not name feeds, so reading it is a low but non-zero risk.
  Mitigations: read only `guid` and `pubDate`, at most once a day, an off
  switch, and drop it if asked. The only official contact for developer
  questions is DeveloperSupport@jw.org.
- **Enforcement** so far has targeted sites that republish content, and Play
  listings with "JW" in the name. Nothing found against link-out or feed-date
  apps.
- **Store rules:** Apple 4.2 (not a web wrapper), 5.2 / 4.1 (no third-party
  marks in name or icon), 5.1.1 (privacy policy link in the store and in the
  app), 1.5 (support URL with a contact). Google Play impersonation and
  metadata rules, Data safety form required even with no data, Android target
  API 36 (already met).
- **User needs:** losing data is the top complaint in reviews; big yearly and
  seasonal dates (Memorial, conventions, assemblies, circuit overseer visit)
  are moments people plan around.

## 1. Remove the website

The phone app is still the Vite build running inside Capacitor's WebView, so
Vite, React and the Playwright suites (smoke, journeys, accessibility) stay.
They run against `vite preview` in CI as a test harness only.

**Delete:**

- Workflows: `deploy-ashbi.yml`, `build-and-push.yml`, `production-monitor.yml`.
- Hosting: `Dockerfile`, `nginx.conf`, `ops/`, `scripts/deploy/`,
  `scripts/deploy.sh`, `scripts/host-state.sh`, `scripts/ops/`.
- PWA: `vite-plugin-pwa` (dependency and config), `src/sw.js`,
  `PWAProvider`, `pwaContext`, `InstallPrompt`, `UpdatePrompt`,
  `OfflineIndicator`, `hooks/usePWA*`, `utils/pwa.js`, the PWA icons in
  `public/` that only the manifest uses, and the service-worker registration
  in `main.jsx`.
- The `/share` route and `pages/Share.jsx` (PWA share target).
- `scripts/verify/offline-update.cjs`, its `offline:verify` script and its step
  in `smoke.yml`.
- Docs that only describe the server: `docs/operations-monitoring.md`,
  `docs/production-recovery.md`.

**Change:**

- `UpdateRequired` keeps the byte-exact raw export and drops the web update
  prompt.
- `scripts/verify/budgets.cjs` keeps the JS and CSS gzip limits and drops the
  precache measurement.
- `scripts/verify/workflow-policy.cjs` and `ci.yml` drop references to the
  removed workflows.
- Any `isNative` branch that exists only for the PWA/web build is simplified
  where it is safe. Web fallbacks that the test harness depends on (for
  example web storage and the backup download) stay.

**Manual steps for the owner (outside the repo):**

- On the VPS: stop the `jw-habits` container, remove the cron entry that runs
  `ops/traefik-guard.py`, and remove the `jwhabits` router from Traefik.
- Point `jwhabits.ashbi.ca` elsewhere or retire it.
- Delete the deploy secrets in the repo settings once the workflows are gone.

## 2. Privacy and support pages on GitHub Pages

- Move `public/privacy/` and `public/support/` to a new `site/` folder, with a
  small `site/index.html` that links to both.
- Add `.github/workflows/pages.yml` that publishes `site/` with
  `actions/deploy-pages` on pushes to `main` that change `site/`.
- New URLs: `https://camster91.github.io/jw-habits/privacy/` and
  `.../support/`. `AboutSection.jsx`, `ErrorBoundary.jsx`, `PRIVACY.md`,
  `APP_STORE_METADATA.md` and the store release pack point to them.
- The privacy page is titled "Privacy Policy", names the developer, and covers:
  nothing collected or shared, no analytics or ads, data stays on the device,
  backups are files the user exports, notifications are scheduled locally, the
  daily jw.org feed request (what it reads, that it sends no personal data, how
  to switch it off), deletion by uninstalling, a children's statement and an
  effective date.
- The support page offers GitHub Issues and an email address chosen by the
  owner.
- **Owner step:** enable Pages in the repository settings with "GitHub
  Actions" as the source.

## 3. "What's new" daily habit

**Routine.** A seventh routine, id `whatsNew`, default label "What's new",
cadence `daily`. It is listed after `dailyText` in `ROUTINE_IDS`, so it appears
in onboarding, Settings, Today, Progress, reminders and widgets like any other
daily routine. Users can rename it or switch it off. No new badges.

**Link.** `routineLink` returns `whatsNewPageUrl(locale)` (jw.org's What's New
page) unless the user set their own link for it.

**Count.** The existing once-a-day feed check (`native/whatsNewClient.js`)
stays as it is: native only, at most once in 24 hours, reads only `guid` and
`pubDate`, keeps up to 100 seen ids, first check seeds the seen list with zero
new. Changes:

- `defaultStore().whatsNew.enabled` stays `true` (on by default).
- `WhatsNewBadge` is removed from the Today header. The count shows on the
  `whatsNew` row instead, for example "What's new · 3 new", and is hidden when
  zero or when the feed check is off.
- Opening the row's link sets `newCount` to 0, as the badge did.
- Holding the row checks off the habit; it does not change the count.
- The Settings switch keeps its place and its meaning; its help text says what
  the check reads and that it sends no personal data.
- With the routine switched off, the feed check does not run.

## 4. Big-dates calendar

**Data.** `store.events`: a list of up to 200 entries:

```
{ id, kind, title, start, end, link }
kind:  'memorial' | 'convention' | 'assembly' | 'coVisit' | 'other'
title: string | null   // required for 'other', optional rename for the rest
start: 'YYYY-MM-DD'
end:   'YYYY-MM-DD' | null   // on or after start
link:  safe http(s) URL | null
```

No dates are built in; the user types their own congregation's dates.

**Domain.** A pure `domain/events.js`: add, update, remove, sort by start, and
`upcoming(store, day, withinDays)`. Past events stay until the user deletes
them, shown under "Past" in the list.

**UI.**

- Plans tab: a "Dates" card that lists upcoming events, with "Add date". The
  sheet asks for type, name (for Other), start, optional end, optional link.
- Today: one "Coming up" line for the next event starting within 14 days,
  for example "Circuit assembly · Sat 14 Nov". Tapping it opens the Dates card.
- Each event has its own optional link, opened with `openLink`.

**Reminders.** Event lines join the existing morning notification, 7 days and
1 day before `start` ("Circuit assembly in 7 days", "Circuit assembly
tomorrow"). If no routine is due that morning, the event line alone makes the
morning entry. The two-a-day cap and quiet hours still hold. New Settings
switch "Date reminders" (`reminders.events`, default on).

## 5. Backup reminder

**Data.** `store.backup = { lastExportAt: ISO string | null }`, set when an
export is handed over without error (the native share sheet returns, or the
web test harness starts the download).

**Settings.** The Backup section shows "Last backup: Oct 12", or "No backup
yet". It shows a short nudge when the last backup is older than 30 days or
missing.

**Reminder.** New Settings switch "Monthly backup reminder"
(`reminders.backup`, default on). On the 1st of each month, if there has been
no backup in the last 30 days, the morning notification gains a "Time for a
backup" line. This needs no extra state and respects the cap and quiet hours.

## 6. Store readiness

- Add `ios/App/App/PrivacyInfo.xcprivacy` to the App target: no tracking, no
  collected data, and required-reason entries for UserDefaults (`CA92.1`; app
  group access for the widget, `1C8F.1`). Add the widget extension's own
  manifest if it reads UserDefaults. Wire both into `project.pbxproj`; the iOS
  simulator compile in `native-ci.yml` checks it.
- `docs/store-release-pack.md`: review notes that list the native features
  (widgets, local reminders, offline use, share sheet) for Apple 4.2; "Data
  Not Collected" on Apple and "no data collected or shared" in Play's Data
  safety form; the new privacy and support URLs; the name rule (no "JW" or
  jw.org marks in the name, subtitle, icon, keywords or screenshots).
- Update `CLAUDE.md` (screens, stack, commands, state model, known issues,
  audit date), `README.md`, `docs/platform-matrix.md` and
  `docs/quality-gates.md` for phone-only. Add `docs/terms-checklist.md`: the
  jw.org clauses above and how the app meets each, for review before release.

## Store schema: version 4

Adding a routine changes `schedule[].enabled`, whose keys must match
`ROUTINE_IDS` exactly, so the main store moves to `version: 4` through the
existing upgrade path (`domain/upgrade.js`, `validateStore`, `StoreProvider`).

**v3 → v4 upgrade (pure):**

- Every existing schedule entry gets `enabled.whatsNew = false`, so past days
  are not judged against a habit that did not exist.
- A new schedule entry from the upgrade day sets `enabled.whatsNew = true`
  (through `withScheduleChange`). Users can switch it off.
- `events: []`, `backup: { lastExportAt: null }`, `reminders.events: true`,
  `reminders.backup: true`.
- `whatsNew` (the feed settings) is kept as is, so existing users keep their
  choice.

**Safety:**

- Before the first v4 save, the raw v3 value is copied once to a new key
  `jw-habits-v3-backup`, mirroring the existing v2 backup. The key stays at
  `jw-habits-v2` (frozen name); nothing is renamed.
- v3 backup files import by running the same upgrade. A v4 backup opened by an
  older app hits the existing `UpdateRequired` screen, which is the intended
  behaviour.
- Phone-only removes the old risk of a stale browser tab writing a v3 store
  over a v4 one; the app and its widgets are the only writers.
- The workspace store (`faithful-days-workspace-v1`) is unchanged.

## Out of scope

- Monthly ministry report reminder (next round).
- Any jw.org content in the app or in notifications.
- Memorial or convention dates built into the app.
- Accounts, sync, social or comparison features.
- Renaming the repository or the internal `jw-` keys.

## Testing

- Unit: v3 → v4 upgrade (schedule history, defaults, idempotence, invalid
  input), `validateStore` for v4, `events.js`, `routineLink` for `whatsNew`,
  the notification plan (event lines at 7 and 1 days, backup line on the 1st,
  cap and quiet hours), feed count display and reset.
- Component: the `whatsNew` row with and without a count, the Dates card and
  sheet, the Today "Coming up" line, the Backup section's last-backup text and
  nudge, the two new Settings switches.
- Journeys and smoke: update for the seventh routine and the removed badge,
  plus one journey that adds a date and sees it on Today. All suites must still
  exit non-zero on failure.
- CI: lint, coverage thresholds, build, size and workflow policies, Android
  and iOS compiles all green. `npm audit --audit-level=high` clean.

## Open questions for the owner

- Which email address goes on the support page.
- Whether to email DeveloperSupport@jw.org about the feed check before store
  release.
