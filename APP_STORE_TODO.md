# JW News - App Store Submission TODO

## 🔴 Critical Blockers (Must Fix)

### iOS App Store
- [ ] Fix app name mismatch (Info.plist shows "JW Habits", should be "JW News")
- [ ] Update required device capability from `armv7` to `arm64`
- [ ] Set proper version numbers in Xcode project (currently using variables)
- [ ] Add NSCalendarsUsageDescription permission string (if using calendar features)
- [ ] Add NSUserTrackingUsageDescription if using analytics

### Android Google Play
- [ ] Create release keystore for signing
- [ ] Update `build.gradle` with proper release signing config
- [ ] Remove debug signing from release builds
- [ ] Update versionCode and versionName for release

## 🟡 App Store Assets Needed

### iOS (App Store Connect)
- [ ] App icon (1024x1024 PNG, no transparency) - ✓ EXISTS, verify it meets guidelines
- [ ] Screenshots (required sizes):
  - [ ] iPhone 6.7" (1290x2796)
  - [ ] iPhone 6.5" (1242x2688) 
  - [ ] iPhone 5.5" (1242x2208)
  - [ ] iPad Pro 12.9" (2048x2732)
- [ ] App preview video (optional but recommended)
- [ ] Promotional text (170 chars max)
- [ ] Description (4000 chars max)
- [ ] Keywords (100 chars max)
- [ ] Support URL
- [ ] Marketing URL (optional)

### Android (Google Play Console)
- [ ] App icon (512x512 PNG) - check existing
- [ ] Feature graphic (1024x500 PNG)
- [ ] Screenshots (minimum 2, maximum 8):
  - [ ] Phone (1080x1920 or 1080x2340)
  - [ ] 7" Tablet (1200x1920)
  - [ ] 10" Tablet (1600x2560)
- [ ] Short description (80 chars max)
- [ ] Full description (4000 chars max)

## 🟢 Pre-Submission Checks

### Both Platforms
- [ ] Test on physical devices (not just simulators)
- [ ] Verify app works offline
- [ ] Check dark mode support
- [ ] Test push notifications
- [ ] Verify deep links work
- [ ] Test on different screen sizes
- [ ] Run accessibility audit
- [ ] Check for memory leaks
- [ ] Verify app doesn't crash on launch

### iOS Specific
- [ ] Archive build succeeds in Xcode
- [ ] Validate app passes App Store validation
- [ ] TestFlight internal testing
- [ ] Check for deprecated API usage

### Android Specific
- [ ] Build signed release APK/AAB
- [ ] Test on multiple Android versions
- [ ] Check for permission requests
- [ ] Verify ProGuard/R8 minification works

## 🔵 Store Listing Content

### Required for Both
- [ ] Privacy policy URL (✓ EXISTS - PRIVACY_POLICY.md, needs hosting)
- [ ] Contact email
- [ ] App category (Lifestyle / Religion)
- [ ] Content rating questionnaire

### iOS Specific
- [ ] App Store privacy details (data collection disclosures)
- [ ] App Clip configuration (optional)

### Android Specific
- [ ] Target audience selection
- [ ] News app declaration (if applicable)

## 🟣 Developer Accounts

- [ ] Apple Developer Program enrollment ($99/year) - verify active
- [ ] Google Play Developer account ($25 one-time) - verify active
- [ ] Access to App Store Connect
- [ ] Access to Google Play Console

---

## Current Status

| Platform | Status | Blockers |
|----------|--------|----------|
| iOS | 🟡 In Progress | App name fix, screenshots, device testing |
| Android | 🟡 In Progress | Release keystore, screenshots |

## Notes

- Bundle ID: `com.ashbi.jwnews`
- Current iOS version in build.gradle: 3.0.0 (versionCode 300)
- App uses Capacitor for native bridge
- Has push notification setup (Firebase)
