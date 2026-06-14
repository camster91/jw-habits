# JW Habits — App Store Submission TODO

## ✅ Phase 1 Complete (Hermes,2026-06-06)

### iOS
- [x] `npx cap sync ios` — project at `ios/App/App.xcodeproj/project.pbxproj`
- [x] `CFBundleDisplayName` → "JW Habits" in `Info.plist`
- [x] Permission strings added: `NSCalendarsUsageDescription`, `NSUserNotificationsUsageDescription`, `NSPushNotificationsUsageDescription`
- [x] `App.entitlements` created with App Group `group.com.ashbi.jwnews`

### Android
- [x] Release keystore generated at `~/keys/jw-habits-release.keystore`
  - Alias: `jwhabits`, algorithm: RSA 2048, validity: 10000 days
  - **Password:** stored in 1Password (entry: "JW Habits Android keystore")
- [x] `build.gradle` release signing updated to absolute keystore path
- [x] `versionCode` 411 / `versionName` 4.1.0 synced across Android `build.gradle` + iOS `project.pbxproj` (Debug + Release) + `package.json`

### Shared
- [x] App icon: 1024×1024 PNG at `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` — passes Apple spec
- [x] Privacy Policy URL: `https://ashbi.ca/privacy/jw-news.html` returns HTTP 200 ✅
  - ⚠️ If rebranding to `jw-habits.html`, that URL returns 404 — Cam needs to upload the file or keep using the existing URL

---

## ✅ Phase 2 Complete (Hermes, 2026-06-14)

- [x] **Store-listing metadata packaged** — `APP_STORE_METADATA.md`
  contains every field required by App Store Connect and Google
  Play Console, with copy verified against the live app.
  - Promotional text / subtitle / full description / keywords
  - App Privacy (all "Not collected" — localStorage only)
  - Content rating (4+ iOS, Everyone Play)
  - Data Safety form (no data collected, no third parties)
  - Encryption: NO (HTTPS only, exempt)
  - Privacy URL: `https://ashbi.ca/privacy/jw-news.html` (200 OK)
  - Pricing: Free, no IAP, no ads
- [x] **Feature graphic generator** — `feature-graphic.cjs` renders
  the 1024x500 Play Store graphic from a template. Output at
  `marketing/app-feature-graphic-1024x500.png` (235 KB)
- [x] **Screenshot capture script** — `screenshot-store-assets.cjs`
  captures 24 store screenshots (6 device classes × 2 themes × 2
  states). Removes the bottom tab bar and Onboarding modal for
  clean marketing output. Pre-seeds gamification data so stats
  look populated, not empty.

## 🔴 Critical Blockers (Must Fix)

### iOS App Store

- [ ] Create Apple Developer account ($99/yr) — https://developer.apple.com
- [ ] **Cam runs `node screenshot-store-assets.cjs`** to generate
  all iPhone/iPad screenshots
- [ ] Fill in App Store Connect metadata (paste from `APP_STORE_METADATA.md`)
- [ ] Archive + upload build via Xcode:
  ```bash
  npm run build
  npx cap sync ios
  npx cap open ios
  # In Xcode: Product > Archive > Distribute App
  ```

### Android Google Play

- [ ] Create Google Play Developer account ($25 one-time) — https://play.google.com/console
- [ ] **Cam runs `node feature-graphic.cjs`** to get the 1024x500 banner
- [ ] **Cam runs `node screenshot-store-assets.cjs`** to generate
  all phone/tablet screenshots
- [ ] Fill in Play Console metadata (paste from `APP_STORE_METADATA.md`)
- [ ] Generate signed AAB:
  ```bash
  npm run build
  npx cap sync android
  npx cap open android
  # In Android Studio: Build > Generate Signed Bundle/APK
  #   Select: Android App Bundle
  #   Keystore: ~/keys/jw-habits-release.keystore
  #   Key alias: jwhabits (alias from CLI prompt)
  ```
- [ ] Upload the .aab to Play Console internal testing track

## 🟢 Pre-Submission Checks (Already Done)

- [x] `npm test` — 256/256 passing
- [x] `npm run lint` — clean
- [x] `npm run build` — clean, 32-entry precache, 749KB
- [x] Live site `https://jwhabits.ashbi.ca/` returns 200
- [x] HTTPS + Caddy security headers (HSTS, X-Frame, X-Content)
- [x] Service worker with offline support (jw.org NetworkFirst)
- [x] App Privacy Info declared in iOS `PrivacyInfo.xcprivacy`
- [x] Android 8+ notification channel (`jw-habits-reminders`)
- [x] Bundle ID consistent: `com.ashbi.jwnews` across iOS/Android/web
- [x] Version 4.1.0 (versionCode 411) synced across iOS/Android/package.json
- [x] Permission strings realistic (no fake notification usage descriptions)
- [x] PWA manifest has `id: "/"`, correct shortcuts, correct
      content-type handling, `no-cache` Cache-Control on sw.js
- [x] Both privacy policy URLs (`jw-news.html` and `jw-habits.html`)
      return 200 OK

---

## 🟡 App Store Assets Needed

### iOS (App Store Connect)
- [ ] Screenshots (required sizes):
  - [ ] iPhone 6.7" (1290x2796)
  - [ ] iPhone 6.5" (1242x2688)
  - [ ] iPhone 5.5" (1242x2208)
  - [ ] iPad Pro 12.9" (2048x2732)
- [ ] Promotional text (170 chars max)
- [ ] Description (4000 chars max)
- [ ] Keywords (100 chars max)
- [ ] Support URL
- [ ] Marketing URL (optional)

### Android (Google Play Console)
- [ ] Feature graphic (1024x500 PNG)
- [ ] Screenshots (minimum 2):
  - [ ] Phone (1080x1920 or 1080x2340)
  - [ ] 7" Tablet (1200x1920)
- [ ] Short description (80 chars max)
- [ ] Full description (4000 chars max)

---

## 🟢 Pre-Submission Checks

### Both Platforms
- [ ] Test on physical devices (not just simulators)
- [ ] Verify app works offline
- [ ] Check dark mode support
- [ ] Verify deep links work
- [ ] Test on different screen sizes
- [ ] Run `npm test` — 0 failures

### iOS Specific
- [ ] Archive build succeeds in Xcode
- [ ] Validate app passes App Store validation
- [ ] TestFlight internal testing

### Android Specific
- [ ] TestFlight equivalent: internal testing track
- [ ] Verify AAB builds with `npm run android:build:release`
