> **SUPERSEDED — needs rewrite before submission.** Written for the pre-refactor app
> ("JW Habits", `com.ashbi.jwnews`), which no longer exists. The app is now a general
> habit tracker, `ca.ashbi.habittracker`, and every store listing field below — name,
> bundle id, SKU, description, keywords, and the affiliation disclaimer — is wrong for it.
> Treat this as a starting outline only. See [CLAUDE.md](./CLAUDE.md).

# JW Habits — App Store Submission Guide

## App Details
- **Name:** JW Habits
- **Bundle ID:** com.ashbi.jwnews
- **Version:** 4.1.0 (versionCode 411)
- **Category:** Lifestyle / Reference
- **Rating:** 4+ (no objectionable content)

## Short Description (80 chars)
Daily spiritual habits: Bible reading, meeting prep & progress tracking

## Full Description
JW Habits helps Jehovah's Witnesses build and maintain daily spiritual routines with beautiful, easy-to-use tracking tools.

**Features:**
- 📖 Daily Bible reading schedule with progress tracking
- 📅 Meeting preparation tracker (Midweek & Weekend)
- 🙏 Prayer & family worship tracking
- ✅ Daily spiritual goals and habits
- 📊 Weekly and monthly progress statistics
- 🔔 Local notifications & reminders
- 📱 Works offline — no account required
- 🌙 Dark mode support

Build consistent spiritual habits and see your progress grow over time.

---

## Android (Google Play Store)

### Prerequisites
1. Google Play Developer account ($25 one-time fee) — https://play.google.com/console
2. App signing keystore (already generated — see below)

### Building the Release AAB
```bash
cd C:\Users\camst\JW-News

# 1. Build web
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Open Android Studio
npx cap open android

# 4. In Android Studio:
#    Build > Generate Signed Bundle/APK
#    Select: Android App Bundle
#    Keystore: android/app/jw-habits-release.keystore
#    Key alias: jw-habits
#    Passwords: Set via KEYSTORE_PASSWORD and KEY_PASSWORD env vars
```

### Play Store Listing
- Screenshots: At least 2 phone screenshots (1080x1920 or 1080x2400)
- Feature graphic: 1024x500 PNG
- Icon: 512x512 PNG (hi-res)

### Keystore Info (KEEP SAFE)
- File: `android/app/jw-habits-release.keystore`
- Store password: Set via KEYSTORE_PASSWORD env var
- Key alias: jw-habits
- Key password: Set via KEY_PASSWORD env var

---

## iOS (Apple App Store)

### Prerequisites
1. Apple Developer account ($99/year) — https://developer.apple.com
2. Mac with Xcode (cannot build iOS on Windows)
3. Apple ID enrolled in developer program

### Building
```bash
# On Mac:
cd /path/to/JW-News
npm run build
npx cap sync ios
npx cap open ios
# Then in Xcode: Product > Archive > Distribute App
```

### App Store Connect Setup
1. Create app at https://appstoreconnect.apple.com
2. Bundle ID: com.jwprogress.app
3. Upload build via Xcode or Transporter
4. Fill in metadata (use description above)
5. Submit for review

---

## Privacy Policy
Required for both stores. Minimum content:
- App collects no personal data
- All data stored locally on device
- No account required
- No analytics or tracking

Host at: https://ashbi.ca/privacy/jw-habits (or similar)

---

## Screenshots Needed
- Home screen (daily view)
- Bible reading tracker
- Statistics screen
- Meeting prep screen
- Settings/dark mode

Use an iPhone 6.5" simulator or Android emulator for captures.
