# Release checklist (manual, on devices)

Run before every store release, on **one Android device or emulator (API 24+; ideally one recent, API 34+)
and one iPhone or simulator on iOS 17+**, from a fresh install of the release
build unless a step says otherwise. Spec §6 ("Manual device checklist").
Record the result of each line (pass / fail + note, device, OS version) in the
release PR.

## 0. Pending native verifications (do these first, once)

These were written on a machine without a JDK, Android SDK or Mac, so they
have **never been compiled**. Until both pass, the widget is unverified.

- [ ] **Android build:** `npm run build && npx cap sync android && cd android && ./gradlew assembleDebug`
      ends in `BUILD SUCCESSFUL` (checks `WidgetBridgePlugin.java`,
      `widget/TodayWidgetProvider.java`, `widget/CheckInReceiver.java`,
      `widget/WidgetStore.java`, the widget layout/drawables and the manifest receivers).
- [ ] **iOS Xcode setup:** follow `docs/ios-widget-setup.md` (create the
      `FaithfulDaysWidget` extension target, App Group on both targets), then
      `xcodebuild -project ios/App/App.xcodeproj -scheme App -sdk iphonesimulator build`
      succeeds. Commit the resulting `project.pbxproj`.

## 1. Reminders and the evening notification

- [ ] Onboarding asks for notification permission once; granting it schedules reminders.
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
- [ ] A second foreground within 24 h makes no request.

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
