# JW Progress - Mobile App Build & Publishing Guide

This guide covers building and publishing the JW Progress app for iOS and Android.

## Prerequisites

### For Android
- [Android Studio](https://developer.android.com/studio) (latest version)
- Java JDK 17+
- Android SDK (installed via Android Studio)

### For iOS
- Mac with [Xcode](https://developer.apple.com/xcode/) (latest version)
- Apple Developer Account ($99/year)
- iOS 14.0+ deployment target

## Building the Apps

### Step 1: Build Web Assets

```bash
# Install dependencies
npm install

# Build the web app
npm run build

# Sync to native platforms
npx cap sync
```

### Step 2: Build Android APK

```bash
# Open in Android Studio
npx cap open android

# OR build from command line
cd android
./gradlew assembleDebug      # Debug APK
./gradlew assembleRelease    # Release APK (needs signing)
```

**APK Location:**
- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release.apk`

### Step 3: Build iOS App

```bash
# Open in Xcode
npx cap open ios
```

Then in Xcode:
1. Select your development team
2. Choose "Any iOS Device" as build target
3. Product → Archive

## Signing Configuration

### Android Release Signing

1. **Generate a keystore:**
```bash
keytool -genkey -v -keystore jw-progress-release.keystore -alias jw-progress -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configure signing in `android/app/build.gradle`:**
```groovy
android {
    signingConfigs {
        release {
            storeFile file('jw-progress-release.keystore')
            storePassword System.getenv('KEYSTORE_PASSWORD') ?: 'your-password'
            keyAlias 'jw-progress'
            keyPassword System.getenv('KEY_PASSWORD') ?: 'your-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### iOS Signing

1. Open the project in Xcode
2. Select the "App" target
3. Go to "Signing & Capabilities"
4. Select your Team
5. Enable "Automatically manage signing"

## App Store Publishing Plan

### Google Play Store

#### Preparation Checklist
- [ ] Create [Google Play Developer Account](https://play.google.com/console) ($25 one-time fee)
- [ ] Generate signed release APK or App Bundle (.aab)
- [ ] Prepare app listing assets:
  - App icon (512x512 PNG)
  - Feature graphic (1024x500 PNG)
  - Screenshots (min 2, max 8 per device type)
  - Short description (80 chars)
  - Full description (4000 chars)
  - Privacy policy URL

#### Publishing Steps
1. **Create App in Play Console**
   - Go to Play Console → Create App
   - Enter app name: "JW Progress"
   - Select language and app type

2. **App Content**
   - Complete content rating questionnaire
   - Add privacy policy
   - Set target audience
   - Add contact info

3. **Store Listing**
   - Add title, descriptions
   - Upload graphics and screenshots
   - Select category: Lifestyle / Religion

4. **Release Management**
   - Create internal testing track first
   - Upload signed AAB/APK
   - Test with internal testers
   - Graduate to closed beta → open beta → production

5. **Review & Launch**
   - Submit for review (typically 1-3 days)
   - Respond to any policy feedback
   - Release to production

### Apple App Store

#### Preparation Checklist
- [ ] Enroll in [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
- [ ] Create app in [App Store Connect](https://appstoreconnect.apple.com)
- [ ] Prepare app listing assets:
  - App icon (1024x1024 PNG, no alpha)
  - Screenshots for each device size
  - App preview video (optional)
  - Description and keywords
  - Privacy policy URL
  - Support URL

#### Publishing Steps
1. **Create App in App Store Connect**
   - Go to Apps → + → New App
   - Select iOS platform
   - Enter app name and bundle ID

2. **App Information**
   - Add description, keywords, support URL
   - Set category: Lifestyle
   - Select content rating
   - Add privacy policy

3. **Build & Upload**
   - Archive app in Xcode
   - Upload to App Store Connect via Xcode Organizer
   - Or use `altool` / Transporter app

4. **Configure Version**
   - Add screenshots for all device sizes
   - Set pricing (Free)
   - Enter release notes

5. **TestFlight (Recommended)**
   - Add internal testers first
   - Send to external beta testing
   - Gather feedback

6. **Submit for Review**
   - App Review typically takes 24-48 hours
   - May require additional info for religious apps
   - Be prepared to explain app functionality

## Push Notification Setup

### Firebase Cloud Messaging (Android & iOS)

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create new project
   - Add Android and iOS apps

2. **Android Configuration**
   - Download `google-services.json`
   - Place in `android/app/`
   - Update build.gradle files

3. **iOS Configuration**
   - Download `GoogleService-Info.plist`
   - Add to Xcode project
   - Enable Push Notifications capability
   - Upload APNs key to Firebase

## App Store Assets

### Required Screenshots

**Android:**
- Phone: 1080x1920 or 1080x2340
- 7" Tablet: 1200x1920
- 10" Tablet: 1600x2560

**iOS:**
- iPhone 6.7": 1290x2796
- iPhone 6.5": 1242x2688
- iPhone 5.5": 1242x2208
- iPad Pro 12.9": 2048x2732

### Suggested Screenshots
1. Home screen with daily tasks
2. Daily Text with reflection
3. Bible reading progress
4. News feed
5. Stats/achievements page
6. Settings with notifications

## Compliance Considerations

### Privacy Policy Requirements
Your privacy policy should include:
- What data is collected (local storage only for this app)
- Data usage (personal progress tracking)
- No data sharing with third parties
- User rights to delete data

### Religious App Guidelines
- Google Play and App Store allow religious apps
- Clearly describe the app's purpose
- Don't claim official affiliation
- Include disclaimer about unofficial nature

## Continuous Deployment

Consider setting up CI/CD with:
- **GitHub Actions** for automated builds
- **Fastlane** for streamlined releases
- **App Center** for beta distribution

### Example GitHub Action for Android

```yaml
name: Android Build
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'adopt'
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npx cap sync android
      - run: cd android && ./gradlew assembleRelease
```

## Version Management

Update version in these files before each release:
- `package.json` - version field
- `android/app/build.gradle` - versionCode and versionName
- `ios/App/App.xcodeproj` - Build and Version numbers

## Support

For issues with:
- Capacitor: https://github.com/ionic-team/capacitor/issues
- App Store review: https://developer.apple.com/contact/
- Play Store: https://support.google.com/googleplay/android-developer/
