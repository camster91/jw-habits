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
  - **Password: `JWHabits2026!`** — add to password manager
- [x] `build.gradle` release signing updated to absolute keystore path
- [x] `versionCode` bumped to `411` (versionName already `4.1.0`)

### Shared
- [x] App icon: 1024×1024 PNG at `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` — passes Apple spec
- [x] Privacy Policy URL: `https://ashbi.ca/privacy/jw-news.html` returns HTTP 200 ✅
  - ⚠️ If rebranding to `jw-habits.html`, that URL returns 404 — Cam needs to upload the file or keep using the existing URL

---

## 🔴 Critical Blockers (Must Fix)

### iOS App Store
- [ ] Add App Store Connect metadata (name, description, screenshots, privacy URL, age rating, encryption = NO, content rights = NO)
- [ ] Archive + upload build via Xcode

### Android Google Play
- [ ] Fill Data Safety form (no data collected, no accounts, no tracking, no third-party SDKs that transmit data)
- [ ] Fill Content Rating, Pricing (Free), Distribution
- [ ] Upload signed AAB

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
