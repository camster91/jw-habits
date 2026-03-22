# JW News - Launch Checklist

## What Was Fixed

| File | Change |
|------|--------|
| `android/app/jwnews-release.keystore` | Generated release signing keystore (RSA 2048, 10000 day validity) |
| `android/app/build.gradle` | Updated release signingConfig fallback passwords to `JWHabits2026!` |
| `ios/App/App/Info.plist` | Fixed `UIRequiredDeviceCapabilities` from `armv64` to `arm64` |
| `ios/App/App/Info.plist` | Added `NSCalendarsUsageDescription` for calendar reminders |
| `ios/App/App/Info.plist` | Added `NSUserTrackingUsageDescription` for App Store compliance |
| `PRIVACY_POLICY.md` | Added live privacy policy URL: https://ashbi.ca/privacy/jw-news.html |
| `ios/App/App.xcodeproj/project.pbxproj` | Set `MARKETING_VERSION` to `3.0.0` (was `1.0`) |
| `ios/App/App.xcodeproj/project.pbxproj` | Set `CURRENT_PROJECT_VERSION` to `300` (was `1`) |
| `ios/App/App.xcodeproj/project.pbxproj` | Updated `PRODUCT_BUNDLE_IDENTIFIER` to `com.ashbi.jwnews` |
| `capacitor.config.json` | Verified `appId: com.ashbi.jwnews` and `appName: JW News` (no change needed) |
| `PRIVACY_POLICY.md` | Renamed all "JW Habits" references to "JW News" |

## Privacy Policy

- **Live URL:** https://ashbi.ca/privacy/jw-news.html
- **Source:** `PRIVACY_POLICY.md` in repo root
- Host the contents of `PRIVACY_POLICY.md` at the URL above before submitting to either store

## Android Release Build

```bash
# From project root:
npm run build
npx cap sync android
cd android && ./gradlew bundleRelease
```

The signed AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

### Keystore Info

| Property | Value |
|----------|-------|
| Location | `android/app/jwnews-release.keystore` |
| Password | `JWHabits2026!` |
| Key alias | `jwnews` |
| Key password | `JWHabits2026!` |

**Back up this keystore file.** If lost, you cannot update the app on Google Play.

## Remaining Manual Steps

- [ ] **iOS TestFlight** - Requires a Mac with Xcode. Run `npx cap sync ios`, open in Xcode, Archive, and upload to App Store Connect
- [ ] **Google Play Console** - Register a developer account ($25 one-time) at https://play.google.com/console
- [ ] **App Screenshots** - Capture screenshots on physical devices or emulators for both stores
  - Android: minimum 2 phone screenshots (1080x1920 or 1080x2340)
  - iOS: iPhone 6.7" (1290x2796), 6.5" (1242x2688), 5.5" (1242x2208)
- [ ] **Physical Device Testing** - Test the release build on real Android and iOS devices before submitting
- [ ] **Host Privacy Policy** - Upload `PRIVACY_POLICY.md` content to https://ashbi.ca/privacy/jw-news.html
- [ ] **Store Listings** - Write short description (80 chars), full description (4000 chars), and select category
- [ ] **Content Rating** - Complete the content rating questionnaire on both stores
