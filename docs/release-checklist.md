# Release checklist (manual, on devices)

Run before every store release on a physical Android device (API 24+; include a
recent API 34+ device) and physical iPhone/iPad on a supported OS, including iOS
17+ for interactive widgets. Record pass/fail, device, OS, signed build and notes
in the release issue. Simulators/emulators complement these checks.

## Evidence for each run

Use [the device result template](device-release-results-template.md). Record source SHA,
artifact SHA-256, version/build, distribution track, physical model/OS/WebView,
permission state and timezone. A result is PASS, FAIL, UNTESTED or BLOCKED;
a blank checkbox is never a pass. Keep evidence free of private notes, names,
credentials and participant information. Record failures with a reproducible
fabricated example and link them to #251 and the responsible existing issue.

The checked compilation items below are historical main evidence (#226/#267/#269),
not compilation of the latest local candidate. Run exact-candidate native CI again
after an authorized push. Signed installation, upload processing and device acceptance
are distinct results. Follow [the household pilot protocol](household-pilot.md)
for #252; device QA is not human validation or Play production-access eligibility.

## 0. Compilation and signing baseline

- [x] Android debug app/widget compilation passes in the Native compile workflow.
- [x] iOS simulator app/widget compilation passes; the extension target is embedded.
- [ ] Produce a signed Android AAB with the replacement approved signing key.
- [ ] Produce a signed iOS build using the owner team and App Group.
- [ ] After separate upload authorization, verify processing on TestFlight/Play closed testing; record the actual accepted build.
- [ ] Install those signed builds on the physical devices above.

Follow [widget setup](ios-widget-setup.md) for team/App Group configuration; do
not create a duplicate widget target. Current compile evidence is #226/#267/#269.
See [platform matrix](platform-matrix.md) and [store release pack](store-release-pack.md).

## 1. Reminders and the evening notification

- [ ] Full onboarding offers permission after its reminder explanation; only the explicit
      permission action opens the OS prompt. Start with defaults does not prompt.
- [ ] Decline permission: the app remains usable and shows no false scheduling success.
      Later enable reminders in Settings; verify permission state after returning from OS settings.
- [ ] Grant permission, then verify actual delivery, not just a pending schedule or toggle.
- [ ] The morning invitation arrives at the earliest anchor time and lists only what's due.
- [ ] Evening: with the wrap-up notification **off**, a notification appears only on the
      evening before a meeting day ("Tomorrow's meeting — prep is ready when you are").
- [ ] Evening: with the wrap-up notification **on**, "Your day in review is ready" appears at
      the wrap-up time and names no routine; on a meeting eve the one notification carries both lines.
- [ ] Never more than 2 notifications in a day; none inside quiet hours.
- [ ] Turning a routine's reminder off (and all reminders off) stops it.
- [ ] **After reboot:** restart the device without opening the app; the next morning
      invitation (and evening one, if due) still arrives.
- [ ] Changing a time in Settings reschedules (the next notification uses the new time).
- [ ] Background and terminate the app; verify scheduled delivery and cancellation without duplicates.
- [ ] Verify timezone/DST changes on an isolated test device; record local time, app day and
      actual delivery. Restore its original clock/timezone afterward.

## 2. Widget check-in

### Android

- [ ] Add the Faithful Days widget at its default size (2×2): it shows the ring and "N of M".
- [ ] Before the app has ever been opened (fresh install), the widget shows
      "Open Faithful Days to start today".
- [ ] Open the app, then return home: the widget shows today's counts.
- [ ] Widen the widget to 4×2: up to 4 routines appear (never Ministry), done ones ticked.
- [ ] Tap an open routine: it ticks at once and the count goes up.
- [ ] Open the app: that routine shows as done on Today (Bible reading done without chapters),
      and the widget still agrees.
- [ ] Check a routine in the app; the widget updates within a second or two.
- [ ] Change the accent in Settings; the widget's count text uses it.
- [ ] After 03:00 (or set the clock forward past 03:00), the widget shows
      "Open Faithful Days to start today" and no ticks; opening the app restores it.
- [ ] Tap a row on a widget showing yesterday's items (e.g. clock moved past 03:00 before the
      widget redrew): no check-in is recorded for today.
- [ ] Light and dark system theme: the widget is readable in both.

### iOS (17+)

- [ ] Add the small widget: ring with "N of M"; add the medium widget: up to 4 routines.
- [ ] Before the app has been opened: "Open Faithful Days to start today".
- [ ] Tap an open routine in the medium widget: it ticks without opening the app.
- [ ] Open the app: the routine is done on Today; the widget still agrees.
- [ ] Check a routine in the app and go home: the widget reflects it.
- [ ] After 03:00 the widget shows "Open Faithful Days to start today" and no ticks.
- [ ] Light and dark: readable in both; the ring uses the chosen accent.

## 3. Haptics

- [ ] Checking in a routine gives haptic feedback; finishing everything gives the celebration
      haptic (following the tone setting). Nothing on a device with haptics turned off.

## 4. Offline launch

- [ ] Airplane mode, force-quit, relaunch: the app opens to Today with all data, no error.
- [ ] Check-ins made offline are still there after a relaunch.

## 5. What's New badge

- [ ] Online, first foreground of the day: the badge "N new on jw.org" appears when there are
      new items (or none, if there are none).
- [ ] Tapping the badge opens jw.org's What's New page externally and clears the badge.
- [ ] Offline or with the feature off in Settings: no badge and no error.
- [ ] After a successful non-empty feed check, a second foreground within 24 h makes no request.
      Failed/empty checks may retry on a later foreground; verify the feature-off switch stops requests.

## 6. Accent and theme

- [ ] Each accent colour applies across Today, Progress and Settings.
- [ ] Theme Light, Dark and System (switch the OS theme while the app is open): text, cards,
      sheets and the status bar stay readable in each.

## v5.1 plans and sharing

- [ ] Create a study project, check in its next step, undo, then re-check on the same day.
- [ ] Plan next week's family agenda; check in and undo without clearing manually completed steps.
- [ ] Earn a badge and confirm its toast, collection entry, date and garden bloom.
- [ ] Hide points and levels: XP and level labels disappear; garden and badges remain.
- [ ] Quiet tone and reduced motion suppress level confetti as configured.
- [ ] Hide share buttons and confirm every card surface honours the switch.
- [ ] Download each of the four PNG card types on web. Confirm no private notes or links appear.
- [ ] On iOS and Android, open the share sheet with a PNG, cancel, then share again.
- [ ] Open a finder link with JW Library installed, then without it (browser fallback).
- [ ] Check 390px mobile, 768px tablet and 1440px desktop for clipping, focus and readable contrast.

Rollback: the preserved v2 backup supports returning to the previous data schema;
a v3 store must not be fed to a v2-only build without an explicit recovery procedure.

## v5.2 Notes, preparation, search and data trust

Use fabricated content in a dedicated QA installation. Keep ordinary usage and
failure-injection results separate. Never corrupt, uninstall or reset a household's
valuable installation to test recovery.

- [ ] **N1 — Notes:** create a titled note, tags and an HTTPS link. Save, force-quit,
      relaunch offline; verify exact text and tags. Edit without changing creation day/context.
- [ ] **N2 — Search:** find by body and tag; find a study/family plan, step note,
      meeting and assignment. Open each result; a missing linked context explains its
      absence without deleting the note. Deleting a meeting/assignment retains its note.
- [ ] **N3 — Drafts:** dirty Close offers the discard choice; keeping the draft retains
      all fields. Cancel OS draft export without a false success. Failed-save QA retains
      the draft and does not show Saved. Copy/export the draft before reload.
- [ ] **P1 — Meetings:** create this week's and next week's actual dated meetings,
      both explicit types. Prepare/undo sections, reject a duplicate type/date,
      force-quit/relaunch and confirm persistence. No Today activity is fabricated.
- [ ] **P2 — Assignments:** create a dated talk/student part and checklist. Edit the date
      and title without losing unchanged task completion. Close/reopen the edit;
      Save collapses the form; Edit opens and focuses it. Remove requires confirmation.
- [ ] **P3 — Family/ministry preparation:** plan a future family agenda and a personal
      presentation/return-visit preparation using an assignment checklist or study plan.
      Ask whether the available types and labels fit the task. Record any gap against
      #263; generic checklists do not prove dedicated ministry planning is accepted.
- [ ] **P4 — Reading ahead:** select a year-plan schedule, record chapters beyond
      today's portion and verify the pace comparison. Recorded chapters remain on the
      day actually read across 03:00. Own-pace mode invents no target/ahead count.
- [ ] **B1 — Backup:** use Settings' Backup shortcut, export combined JSON and restore
      it to a separate QA installation. Compare routine history/plans and every workspace
      record. A plaintext file contains private content; keep it in owner-controlled storage.
- [ ] **B2 — Legacy/cancel:** import a routine-only backup with the explicit leave-workspace
      behavior. Cancel replacement before confirming; both stores remain unchanged.
- [ ] **B3 — Recovery:** in a disposable QA copy, exercise unsupported/corrupt workspace
      and read/write failures; Notes exports the original bytes and does not become an
      empty writable store. Failed two-store import retains the pre-import recovery copy
      and does not report success. Record exact bytes/checksums using fabricated data.
- [ ] **B4 — Concurrent writers:** on web with two QA tabs, provoke a stale workspace
      save; no silent overwrite, draft retained, export/reload route usable. Native must
      separately exercise queued writes and restart persistence; do not call a browser
      Web Locks pass native concurrency proof.
- [ ] **A1 — Access:** 320px/landscape, virtual keyboard, large text/200% zoom,
      VoiceOver/TalkBack and external keyboard. Reach form disclosures, date controls,
      checklists, contextual note editor, search, backup/recovery and confirmations;
      focus stays visible and returns sensibly after save/close. Test light/dark/reduced motion.

## Native capture — gated, not implemented or passed

#264 capture transport is scheduled only after the signed-device storage/widget
baseline. The current web `/share` is an ephemeral preview, not capture into Notes.
Until native transport is implemented and tested, mark these BLOCKED, not N/A.

- [ ] **C1:** Android and iOS source share → bounded pending item → app preview;
      cancellation saves nothing and leaves no routine activity.
- [ ] **C2:** edit and save the note offline; acknowledge/remove pending input only
      after durable success. A failed save retains the pending item and draft.
- [ ] **C3:** force-quit/relaunch before and after save; replay does not duplicate notes.
      Test repeated delivery, oversize/unsupported content and safe/unsafe links.
- [ ] **C4:** real iOS App Group/share extension and Android share transport on signed
      devices, including locked/background/offline behavior, safe previews and cleanup.

Record applicable failures, accepted product gaps and untested items explicitly.
#251/#263/#264 cannot close from this checklist's existence or web automation alone.
