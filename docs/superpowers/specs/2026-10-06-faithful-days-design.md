# Faithful Days — native redesign

**Status:** approved 2026-10-06; amended 2026-10-06 (daily wrap-up, customizable onboarding, §2.2 features that are not helpful); amendment awaiting review.
**Research:** `reports/JW habit tracker competitive study.md` (competitive study, 2026-10-06), kept outside the repo.

## 1. Intent

**What the owner asked for**

- Ship as an **iOS and Android app only**. The App Store and Google Play are the product, and the web app goes away.
- Make it **simple and fun**, based on how the leading habit trackers work.
- Orient it to **Jehovah's Witnesses' routines**: daily text, Bible reading, meeting preparation, ministry, family worship and personal study.
- Call it **Faithful Days**.
- Add **What's New**: show when jw.org has published new material.
- Add a **daily wrap-up** at the end of the day.
- Make onboarding **customizable**: look and feel, reading starting point, routine labels, and wrap-up/reminder style.
- **Spell out which features are not helpful** (§2.2), so later changes don't reintroduce them.

**Assumptions (agreed)**

- Same repo and bundle id (`ca.ashbi.habittracker`). Neither app is in a store yet, so the id is free to keep.
- Everything stays on the device: no accounts, no server, no analytics.
- Existing web users start fresh. There is no web-to-app data bridge.
- Share-target and other PWA-only features are dropped, not ported.

**Success criteria**

1. Pushing a `v*` tag builds and uploads iOS to TestFlight and Android to Play closed testing.
2. Both apps pass review and are live. Reminders fire on real devices, and the widget checks in.
3. `src/` contains no PWA code, the Docker image and deploy are gone, and jwhabits.ashbi.ca serves only a static landing page.
4. A pilot with 3–5 practising households finds no blocker in meeting-day prompts, the monthly ministry toggle or grace frequency.

## 2. Product design

### 2.1 Principles (from the research)

Fun comes from forgiveness and feel, not points.

**Do:**
- one-tap check-in;
- the smallest act counts;
- automatic grace and free catch-up;
- totals at least as prominent as streaks;
- a light tactile celebration;
- fresh starts at the start of each week and month;
- planning tied to an existing routine.

**Don't:**
- points, currency or loot;
- hard resets with "you broke it" copy;
- loss-framed nags;
- paid grace;
- leaderboards;
- ads or subscriptions;
- bundled jw.org content.

### 2.2 Features that are not helpful, and what the app does instead

Every item below is common in successful apps. Each one either conflicts with the research or would damage trust with this audience. A change that brings any of them back needs a new design decision, not just a PR.

| Not helpful | Where it's common | Why it hurts | What Faithful Days does instead |
|---|---|---|---|
| **Points, coins, XP, loot or levels for doing a routine** | Habitica, Finch, many Bible apps | A 128-study meta-analysis found that expected, tangible rewards *reduce* people's own motivation. The motive is the whole point of a spiritual routine, and a points economy tells the user the reading is "worth 10 coins". | Informational feedback only: totals, the Bible-book map, and gentle milestones such as "You've read every book of Moses". |
| **Hard streak reset to zero** with "You broke your streak" | Streaks, most trackers | It's the most common reason people quit, often within two weeks. Engagement drops after a broken streak most when people blame themselves (Silverman & Barasch 2023). | Occurrence-based streaks, automatic grace and catch-up. Totals never go down. |
| **Loss-framed or escalating nags** ("Your streak is about to die!", repeated pings) | Duolingo | Leaning on reminders stops the habit becoming automatic (Stawarz 2015). Fear-based copy turns worship into anxious obligation. | One invitation a day at the user's anchor time. The wrap-up is opt-in and never names what was missed. |
| **Paying for grace** (bought streak freezes, paid repair) | Duolingo gems | Charging to be forgiven contradicts the app's tone and looks predatory. Repair only works if it's free. | Grace is automatic and free, and scaled to how often each routine is due. |
| **Leaderboards, rankings, comparing family members** | Productive, social trackers | Comparison makes worship a competition and shames whoever is behind. Family studies succeed with *team* framing, not ranking. | No social layer in v1. Any future family view must be cooperative only. |
| **Punishing companions** (a pet that gets sick, party damage) | Habitica | One person's bad day becomes guilt for others. Finch users credit the *absence* of punishment for sticking with it. | Nothing in the app ever suffers or decays. The calm, tactile style (approved) has no companion. |
| **An hour timer as the centrepiece of ministry** | Most ministry apps | Since November 2023 most publishers report only whether they took part, plus a Bible-study count. Putting hours first brings back a pressure the organization deliberately removed. | A monthly "shared in the ministry" toggle plus a study count. Hours appear only in pioneer mode. |
| **Ads, subscriptions, weekly plans, paywalls on the number of habits** | Copycat "JW" apps, Habitify | This audience reads monetization as the mark of a deceptive, unofficial app, and paywalls cut people off from their own routine. | Free, with no ads, in-app purchases or analytics. |
| **Bundled jw.org content** (daily text, NWT verses, artwork, scraped pages) | Unofficial "library" apps | Forbidden by the jw.org Terms of Use and Apple 5.2.2. It risks a takedown and confuses users about who made the app. | Links out to JW Library or jw.org. Scripture appears only as a reference (e.g. *Psalm 1:2*) that opens JW Library. What's New reads only feed dates. |
| **"JW" branding, a look-alike icon, implied endorsement** | Copycat apps | Violates Apple 4.1(c)/5.2.1 and Play's Impersonation policy, and Watch Tower actively asserts "JW". | A neutral name and icon, "for Jehovah's Witnesses" only in the description, and a disclaimer. |
| **Feature bloat** (custom habit builders, journals, social feeds, accounts) | Habitica, Productive | Bloat is a named reason people quit, and accounts would break the on-device promise. | The six fixed routines (approved). Customization is limited to labels, look, timing and plans. |
| **Push notifications with no anchor** (random "engagement" pings) | Growth-driven apps | They cause notification fatigue and train people to ignore reminders. | Every notification is tied to a time the user chose. |

### 2.3 Screens

- **Today** (home): only the routines due today, plus the What's New badge when there is something new. From the wrap-up time, Today shows the daily wrap-up card (§2.10).
- **Progress**: streaks, totals and the Bible-book map.
- **Settings** (sheet): everything onboarding sets, plus links, export/import, and About (with the disclaimer and privacy link).

### 2.4 The six routines

They are fixed. Each one can be switched off, and a routine that is off disappears from Today, Progress, reminders, the widget and the wrap-up. **Labels can be renamed** (up to 30 characters, with "Reset to default"), and the personal-study routine takes an optional topic. Renaming changes only what the user sees: the routine's schedule, streak and history are unchanged. Store keys use fixed ids (`dailyText`, `bibleReading`, `meetingPrep`, `familyWorship`, `personalStudy`, `ministry`), never the labels.

| Routine | Due | Check-in | Default link (a URL only, no content) |
|---|---|---|---|
| Daily text | Daily | Hold to check; it still counts late in the day | JW Library / jw.org daily text |
| Bible reading | Daily or X days/week | Hold to check. The row shows today's chapters. A partial reading counts, and a catch-up tomorrow fills in today. | jw.org finder link to the next chapter |
| Meeting prep | Due from the day before each of the 2 user-set meeting days through the meeting day itself | Hold to check, counted once per meeting | JW Library Meetings |
| Family worship | Weekly, on a user-set day | Hold to check | — |
| Personal study | X times/week, any days | Hold to check; shows "2 of 3 this week" | — |
| Ministry | Monthly | Toggle "Shared in the ministry this month" plus a Bible-study count. **Pioneer mode** adds hours and a monthly goal. | — |

Every link can be changed by the user. Links open externally, in JW Library if it's installed, otherwise in the browser. The app works fully without JW Library (Apple guideline 4.2.3(i)).

**Bible reading plans:**
- **"Whole Bible in a year":** generated by the app from per-book chapter counts (1,189 chapters). It is not copied from any jw.org schedule.
- **"My own pace":** sequential reading from a chosen starting point.

**Starting point** (both plans): the user picks a book and chapter they're already at (e.g. Psalms 1). With *"Count earlier books as read"* (off by default), every book before that point fills in on the Bible-book map and counts towards "N of 66 books". Those books are recorded as a single `baseline` entry, so the user can undo it later in Settings without touching their real check-ins. Day-based totals never include the baseline.

The existing 366-entry schedule (`dailyBibleReading.js`) is retired.

### 2.5 Check-in, streaks and grace

- **Gesture:** hold for about 0.6 s, then a haptic tap, a soft fill animation and a one-line encouragement. Tapping again undoes it, with no dialog.
- **Streaks count occurrences** of when the routine is due ("8 of the last 8 meetings"). A day when nothing is due is never a miss.
- **Grace** is applied automatically and never sold, at a rate that scales with how often the routine is due:
  - daily or X-per-week routines (daily text, Bible reading, personal study): 2 per calendar month;
  - weekly or per-meeting routines (family worship, meeting prep): 1 per calendar month;
  - ministry: 1 per service year (September–August).

  When grace is used, the copy reads "Life happens — kept your streak".
- **Catch-up:** for Bible reading, reading tomorrow's portion plus the missed one fills in the missed day.
- **Totals:** "N days of reading this year", plus a **Bible-book map** where a book fills in once all its chapters are read ("12 of 66 books").
- **Fresh starts:** each new week and new month opens with a "new week" or "new month" line, never a list of what was missed.

### 2.6 Onboarding

Six screens with no sign-up. Every screen after Welcome has **"Skip — use defaults"**, so someone in a hurry reaches Today in about 15 seconds. Doing every screen should take under 2 minutes. Everything set here can be changed later in Settings.

1. **Welcome:** what the app is, "everything stays on your phone", and the disclaimer.
2. **Your routines:** the six, all on by default. Each one has a switch and a pencil to rename it (§2.4). Personal study takes an optional topic.
3. **Your week:** the 2 meeting days, the family worship day, and "Are you a pioneer?" (which switches on hours mode, plus a monthly hours goal).
4. **Your reading:** a plan ("Whole Bible in a year" or "My own pace"), a starting point (book and chapter, defaulting to Genesis 1), and "Count earlier books as read" (§2.4).
5. **Your rhythm:**
   - anchor times ("When will you read the daily text?": *after breakfast / with family prayer / before bed / a set time*);
   - the wrap-up time (default 20:00), with an "Evening wrap-up notification" switch (off by default);
   - the **encouragement tone**: *quiet* (no line), *warm* (default), or *with a scripture reference*.

   This screen asks for notification permission and explains why. Declining it is fine.
6. **Your look:** an accent colour from 6 presets, and theme (*system* by default, *light* or *dark*). A live preview of the Today screen updates as the user picks.

It ends on Today, with the first check-in available.

**Defaults when skipped:**
- all six routines on, with default labels;
- meeting days unset, so meeting prep stays hidden until they're set, with a "Set your meeting days" card on Today;
- family worship on Friday;
- not a pioneer;
- "Whole Bible in a year" from Genesis 1, with no baseline;
- anchor time 07:00, wrap-up 20:00 with its notification off, warm tone;
- the first accent preset, system theme.

**Encouragement tone:**
- *Warm* lines are original copy, about 30 lines, e.g. "Nicely done.", "A good start to the day.".
- *With a scripture reference* adds a reference only (e.g. *Psalm 119:105*), from a bundled list of about 60 references. It's tappable and opens JW Library or the jw.org finder link. **No verse text is bundled** (§2.2).
- *Quiet* shows only the haptic and the animation.

### 2.7 Reminders

Native local notifications that work offline.

- **Morning invitation:** at most one per day, at the earliest anchor time, listing only what's due ("After breakfast · daily text and reading are ready").
- **At most one evening notification**, at the wrap-up time:
  - if the wrap-up notification is on: "Your day in review is ready" (§2.10);
  - otherwise, only on the evening before a meeting day: "Tomorrow's meeting — prep is ready when you are".
  - When both apply, the single evening notification carries both lines.
- So there are never more than **2 notifications a day**, and by default the evening one appears only on meeting eves.
- No follow-ups, and no streak-loss warnings. Quiet hours are respected.
- Can be switched off per routine or all at once.
- Rescheduled whenever settings change and each time the app opens.

### 2.8 Widget

Native, on both platforms.

- **Small:** today's done count shown as a ring ("3 of 4").
- **Medium:** the routines due today, each tappable to check in. iOS uses App Intents (iOS 17+); Android uses an App Widget with a broadcast.
- The widget reads and writes the same on-device store as the app.

**Not in v1:** lock-screen widgets, Apple Watch, Siri Shortcuts, a family view.

### 2.9 What's New

- When the app comes to the foreground, at most once every 24 h, the app GETs jw.org's official RSS feed for the user's language. For English that is `https://www.jw.org/en/whats-new/rss/WhatsNewWebArticles/feed.xml`; the language path follows the device locale, falling back to `en`.
- It parses **only `guid` and `pubDate`**. It compares them with the guids already seen and stores the set of seen guids, capped at 100.
- If there are new items, Today shows **"N new on jw.org"**. Tapping the badge opens jw.org's What's New page externally and marks all items seen.
- **No jw.org titles, descriptions or images are ever stored or shown.** This rule is what keeps the feature inside jw.org's terms and Apple 5.2.2. The feed's text fields are discarded during parsing.
- **Failure behaviour:** offline, a timeout or a feed that won't parse all mean no badge and no error. The app retries at the next opportunity once 24 h have passed.
- Can be switched off in Settings (on by default). There is no background polling and no notifications for What's New in v1.
- This is the app's **only network request**. It sends no identifiers, so "Data not collected" still holds.

### 2.10 Daily wrap-up

A short look back at the day. **It never lists failures.**

- **When:** from the user's wrap-up time (default 20:00) until 03:00. At 03:00 Today switches to the new day, so a check-in at 01:00 still counts for the previous day. The same day-boundary rule applies everywhere in the app.
- **Where:**
  - On Today, the routine list collapses under a **wrap-up card**. One tap expands the list again, so late check-ins are always possible.
  - If the user has turned on the evening wrap-up notification, its text is only "Your day in review is ready" (§2.7). It never names a routine.
- **What the card shows:**
  - **What you did:** each routine done today, with a check.
  - **What moved:** today's progress, e.g. "2 chapters · 13 of 66 books", "Meeting prep · 9 of the last 9 meetings", "Personal study · 3 of 3 this week".
  - **Still open, worded by time:** each routine still due today is shown with a "Still time" tap target until 22:00. After that, routines still open are not listed at all, and the card ends with "Rest well — tomorrow's a fresh start."
  - **If grace covered a day:** "Life happens — kept your streak."
  - **If everything is done:** a light celebration (haptic plus animation, following the tone setting).
  - **If nothing was done:** only "Rest well — tomorrow's a fresh start." No counts and no list.
- **Dismissing:** "Done for today" collapses the card into a one-line summary until the day rolls over.
- The wrap-up is always computed from the log, so it can't disagree with Today, Progress or the widget.

## 3. Architecture

- **Stack:** Capacitor 8 + React 19 + Vite, as today.
- **Native additions:**
  - an iOS WidgetKit extension (SwiftUI, App Intents) in an App Group shared with the app;
  - an Android App Widget (Kotlin) reading the app's SharedPreferences;
  - `@capacitor/local-notifications` and `@capacitor/haptics`, both already installed.
- **Web assets** are bundled locally. There is no remote `server.url`.
- **Store:** one versioned key, `jw-habits-v2`. The `jw-` prefix stays, per CLAUDE.md: it's a storage key users never see. It holds:
  - `settings`:
    - routines on/off, labels and the study topic;
    - meeting days and the family worship day;
    - the plan, its starting point and the baseline flag;
    - anchor times, wrap-up time and the wrap-up notification flag;
    - tone, accent, theme and pioneer mode (with its hours goal);
    - links and What's New on/off;
    - `onboardingDone`;
  - `log`: `{routine, date, value}` entries, where `value` is a boolean, chapters, or hours/studies for ministry. `date` is the app's day, which rolls over at 03:00 local time (§2.10);
  - `graceUsed` and `whatsNew.seen`.
- **Persistence:** Capacitor Preferences, configured with the iOS App Group so the widget can read it. `src/utils/safeStorage.js` stays the only module that reads or writes it. Every direct `localStorage` call in `useHabitState`, `main`, `ErrorBoundary`, `bibleReadingTracker`, `notificationScheduler` and `settingsStore` goes through it.
- **Calculated, never stored:** streaks, totals, the Bible map and what's due today. Pure functions in `src/domain/`, unit-tested.
- **Export/import:** JSON through the share sheet. Import checks the version and validates the shape before replacing anything.
- **Migration:** on first launch, the v1 keys (`jw-daily-habits-state`, `jw-bible-reading-days`, `jw-habits-best-streak`, `jw-user-settings`) are converted into the v2 log and settings. The v1 keys stay for one release as a backup, and the migration is guarded by a version marker so it runs only once.
- **PWA code:** gated off in the native build from Phase 0, and deleted in Phase 3.

## 4. Branding and compliance

- **Name:** Faithful Days, 13 characters. Reserve it in App Store Connect and Play Console first; the App Store search on 2026-10-06 showed no exact match.
- **Icon:** original artwork. Nothing resembling jw.org's blue square or logo.
- **Where "JW" may appear:** never in the name, icon, subtitle, developer name or Play short description. "for Jehovah's Witnesses" appears only in the long description.
- **Disclaimer** in onboarding, Settings → About and both store listings: "Faithful Days is an independent app. It is not affiliated with, endorsed by, or sponsored by Watch Tower Bible and Tract Society or jw.org, and contains no content from jw.org."
- **Price:** free. No ads, in-app purchases or analytics/crash SDKs. Both privacy forms declare "Data not collected".
- **Privacy policy and support pages** are hosted on the jwhabits.ashbi.ca landing page (Phase 3). They must exist before the first store submission, so they're published early as static pages.
- **CLAUDE.md rule change:** "no third-party URL in shipped code" becomes **"no third-party *content* in shipped code; user-editable links to jw.org/JW Library and the What's New feed check are allowed"**.

## 5. Delivery phases

| Phase | Scope | Exit criterion |
|---|---|---|
| 0. Native foundations | v2 store and migration through Preferences; native reminders; PWA gated off on native; versions aligned | Unit tests green; reminders fire on an Android device and the iOS simulator |
| 1. Release pipeline | Tag-driven CI: iOS → TestFlight (App Store Connect API key); Android → signed `.aab` → Play closed testing (service account). Fresh upload keystore. | A tag lands a build in both |
| 2. Redesign | Screens, routines, check-in, grace, Progress and Bible map, onboarding, widget, What's New, branding | Journeys green; manual device checklist passes; household pilot done |
| 3. Store launch | Listings, screenshots, privacy forms, privacy/support pages live; Play 14-day closed test with 12+ testers; iOS review | Both listings live |
| 4. Web cutover | Landing page with store badges, `/privacy` and `/support`; script that unregisters the old service worker; delete PWA code, `build-and-push.yml`, `deploy-ashbi.yml` and the Dockerfile; point the VPS route at the static page | Domain serves only the landing page |

The closed test (12 testers × 14 days) is the critical path, so recruit the testers during Phase 2.

## 6. Testing

- **Vitest:**
  - schedules and what's due today;
  - occurrence streaks;
  - grace, including the monthly reset;
  - catch-up;
  - Bible plan generation (1,189 chapters, no gaps);
  - migration from v1 fixtures;
  - export/import round-trip;
  - What's New parsing (new, seen, malformed and empty feeds, and proof that text fields are discarded);
  - the 03:00 day boundary;
  - wrap-up content in each state: all done, some done before and after 22:00, nothing done, grace used;
  - choosing the evening notification (wrap-up on/off × meeting eve);
  - the reading baseline (counts towards books, never towards days, and can be undone);
  - label renames not touching any stored history.
- **Playwright journeys** on the web build in CI: onboarding (full and "skip" paths), check-in and undo, toggling a routine off, renaming a routine, the ministry toggle, the wrap-up card after the wrap-up time.
- **Manual device checklist** for each release: reminders and the evening notification (including after reboot), widget check-in on both platforms, haptics, offline launch, the What's New badge, accent and theme in light and dark.

## 7. Open risks

- **Apple 4.2:** mitigated by the widget, reminders, haptics and offline use, which are highlighted in the review notes. It could still be rejected; the response would be lock-screen widgets and Shortcuts.
- **The feed could change or disappear:** What's New then fails silently, and nothing else depends on it.
- **The jw.org terms are silent on RSS:** reading dates only and showing no content is the most conservative use. If Watch Tower objects, the feature can be removed without affecting the rest of the app.
- **Weekly streak framing hasn't been tested:** the pilot checks it.
