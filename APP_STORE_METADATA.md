> Historical snapshot, superseded by [current commitments](docs/roadmap.md) and [current architecture](CLAUDE.md). Retained as evidence; claims here do not certify the current release or store readiness.

> **SUPERSEDED — needs rewrite before submission.** Written for the pre-refactor app
> ("JW Habits", `com.ashbi.jwnews`), which no longer exists. The app is now a general
> habit tracker, `ca.ashbi.habittracker`, and every store listing field below — name,
> bundle id, SKU, description, keywords, and the affiliation disclaimer — is wrong for it.
> Treat this as a starting outline only. See [CLAUDE.md](./CLAUDE.md).

# JW Habits — App Store & Play Store Listing Metadata

> All copy verified against the live app at https://jwhabits.ashbi.ca/ (2026-06-14).
> Bundle ID: `com.ashbi.jwnews` · Version 4.1.0 · versionCode 411

---

## Common (both stores)

| Field | Value |
|---|---|
| App name | **JW Habits** |
| Subtitle / Tagline | Daily spiritual habits |
| Privacy Policy URL | `https://ashbi.ca/privacy/jw-news.html` (✅ returns 200) |
| Support URL | `https://ashbi.ca/contact` |
| Developer / Seller | Cameron Ashley (ashbi.ca) |
| Contact | dev@ashbi.ca |
| Category | Lifestyle (iOS) / Lifestyle (Play) |
| Content rating | 4+ (iOS) / Everyone (Play) |
| Languages | English (primary) |
| Data collection | None — see Privacy Policy |
| Account required | No |
| Ads | None |
| In-app purchases | None |
| In-app subscriptions | None |

---

## Apple App Store — `https://appstoreconnect.apple.com`

### App Information

- **Name**: JW Habits
- **Bundle ID**: com.ashbi.jwnews
- **SKU**: jw-habits-com.ashbi.jwnews
- **Primary language**: English (U.S.)
- **Category (primary)**: Lifestyle
- **Category (secondary)**: Reference

### Promotional Text (170 chars max)

```
Build consistent spiritual routines with beautiful, offline-first
tracking. Daily Bible reading, prayer, meeting prep, and family
worship — all in one place. No account required.
```

### Subtitle (30 chars max)

```
Daily spiritual habits
```

(20 chars — well under the limit)

### Description (4000 chars max)

```
JW Habits helps Jehovah's Witnesses build and maintain daily
spiritual routines with beautiful, easy-to-use tracking tools
that work completely offline.

**WHAT YOU CAN TRACK**

• Bible reading — follow a 366-day reading plan and check off
  chapters as you go
• Daily text — quick checkbox to log "I read today's passage"
• Prayer — morning, afternoon, and evening with streak tracking
• Family worship — plan and log your weekly study together
• Meeting prep — built-in midweek and weekend meeting workbook
• Service hours — log field service minutes with monthly goals
  (for pioneers and publishers)
• Goals and projects — break down your spiritual goals into
  achievable tasks
• Daily reflection — capture a thought from your study in your
  own words
• News check-in — see what's new on jw.org

**WHY YOU'LL LIKE IT**

• **No account, no tracking, no ads.** All your data lives on
  your device, in localStorage. We never see it. Export and
  import work across devices via plain .json files.
• **Built for the way you actually track.** A picker asks which
  habits you want to track on day one, and the home reorganizes
  around your choices. Tweak any time from Settings.
• **Beautiful on every device.** iOS-native large title, dark
  mode that respects your system, safe-area handling for
  notched iPhones, full RTL support.
• **Works offline.** Install as a PWA, or download the iOS app
  from the App Store. Either way, you can check off habits on
  the train, the meeting, the ministry — anywhere.

**ACCESSIBILITY & i18N**

• Full VoiceOver / TalkBack support on iOS
• Grapheme-cluster-aware text slicing (emoji and RTL names
  render correctly)
• Bidi-isolated user name in greetings
• Reduced-motion support via the iOS system setting

JW Habits is an unofficial third-party tool. Not affiliated with
or endorsed by jw.org or the Governing Body of Jehovah's
Witnesses. JW.org is the source of all scripture content; we
just help you track your daily engagement with it.
```

### Keywords (100 chars max, comma-separated, no spaces in keywords)

```
bible,prayer,meeting,worship,family,habit,tracker,spiritual,devotional,streak,goals,service
```

(85 chars — under the 100-char limit)

### Support URL

```
https://ashbi.ca/contact
```

### Marketing URL (optional)

```
https://jwhabits.ashbi.ca
```

### What's New in this Version (Release Notes)

```
Version 4.1.0:
- Redesigned home for a calmer, more professional look
- New habit picker: pick which habits to track on day one
- Settings: "Daily routine" section to change your picks later
- Dark mode: white body text (was dim gray)
- PWA: web app manifest, offline support, installable on iOS
- Privacy manifest declared for iOS 17+ App Store
- Local notifications: 3 prayer slots + daily text + Bible reading
```

### Screenshots (required)

Apple requires 3-10 screenshots per device class. The recommended
order is:
1. Home (daily actions, with the new habit picker collapsed after pick)
2. Daily text + Prayer card (the primary daily loop)
3. Stats / Streak records
4. Bible reading plan chapter check-off
5. Settings / Dark mode

Captured via `_scripts/screenshot-store-assets.cjs` (see
`scripts/` in this repo). Resolutions: 1290x2796 (iPhone 6.7"),
1242x2688 (iPhone 6.5"), 1242x2208 (iPhone 5.5"), 2048x2732
(iPad Pro 12.9").

### App Privacy (App Store Connect)

Section: "Data Not Collected" — verified by the live app:

- Contact Info: **Not collected**
- Health & Fitness: **Not collected**
- Financial Info: **Not collected**
- Location: **Not collected**
- Sensitive Info: **Not collected**
- Contacts: **Not collected**
- User Content: **Not stored on our servers** (the "user content"
  checkbox refers to remote storage; everything is local)
- Browsing History: **Not collected**
- Search History: **Not collected**
- Identifiers: **Not collected**
- Usage Data: **Not collected**
- Diagnostics: **Not collected**
- Purchases: **Not collected**
- Location: **Not collected**
- Sensitive Info: **Not collected**
- Contacts: **Not collected**

### Encryption

- **App uses encryption**: NO (only HTTPS, which is exempt)

### Content Rights

- **Contains third-party content**: NO
  (All content is the user's own; jw.org links are outbound)

### Age Rating Questionnaire (App Store Connect)

- Cartoon or Fantasy Violence: **None**
- Realistic Violence: **None**
- Sexual Content or Nudity: **None**
- Profanity or Crude Humor: **None**
- Alcohol, Tobacco, or Drug Use: **None**
- Mature/Suggestive Themes: **None**
- Horror/Fear Themes: **None**
- Gambling: **None**

Result: **4+**

---

## Google Play Console — `https://play.google.com/console`

### App Details

- **App name**: JW Habits
- **Default language**: English (United States)
- **App or game**: App
- **Free or paid**: Free
- **Category**: Lifestyle
- **Tags**: Lifestyle, Religion & Spirituality, Books & Reference

### Short Description (80 chars max)

```
Daily Bible reading, prayer, meeting prep, and family worship —
trackable, offline, private.
```

(80 chars exactly)

### Full Description (4000 chars max)

```
JW Habits helps Jehovah's Witnesses build and maintain daily
spiritual routines with beautiful, easy-to-use tracking tools
that work completely offline.

TRACK:
• Bible reading — 366-day reading plan, check off chapters
• Daily text — quick "I read today's passage" check
• Prayer — morning, afternoon, evening with streak tracking
• Family worship — plan and log your weekly study
• Meeting prep — built-in midweek and weekend workbooks
• Service hours — log field service minutes (pioneers/publishers)
• Goals and projects — break down spiritual goals
• Daily reflection — capture a thought from your study
• News check-in — see what's new on jw.org

WHY YOU'LL LIKE IT:
• No account, no tracking, no ads. All data on your device.
• Beautiful iOS-style design — large titles, dark mode,
  safe-area handling, full RTL support.
• Works offline. Install as a PWA, or download this Android
  app from the Play Store. Check off habits anywhere.
• Accessibility: TalkBack labels, reduced-motion support,
  grapheme-aware text slicing.

JW Habits is an unofficial third-party tool. Not affiliated
with or endorsed by jw.org. JW.org is the source of all scripture
content; we just help you track your daily engagement with it.
```

### App Icon

- **Required**: 512x512 PNG, 32-bit
- Path: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
  (also the Android icon; one source)
- The same image is used for the Android adaptive icon — split into
  foreground + background layers in `android/app/src/main/res/`

### Feature Graphic (1024x500 PNG)

- **Required** for Play Store listing
- Not yet created — see TODO in `scripts/screenshot-store-assets.cjs`
  to generate one programmatically (a 1024x500 banner with the
  app name, icon, and tagline)

### Phone Screenshots

- **Required**: minimum 2 phone screenshots
- Recommended: 4-6 (Apple's data shows 4-6 increases conversion)
- Resolution: 1080x1920 or 1080x2340
- Captured via `scripts/screenshot-store-assets.cjs`

Recommended order:
1. Home with daily actions visible
2. Daily text + Prayer card (primary daily loop)
3. Stats / Streak records
4. Bible reading plan
5. Settings / Dark mode
6. (optional) Goals/Projects or Service hours

### 7" Tablet Screenshot (optional)

- Resolution: 1200x1920
- Captured via the same script

### Data Safety (Google Play)

Section: "Data collection and security"

**Does your app collect or share any of the required user data types?**

> **No**

The app stores all user data (habit logs, prayer tracking, etc.)
in the device's localStorage. It does NOT collect, store, or
transmit any data to a server. There is no analytics SDK, no
crash reporting service, and no advertising SDK.

**Is all of the user data collected by your app encrypted in transit?**

> **No** — N/A (no data is collected in the first place)

**Do you provide a way for users to request that their data is deleted?**

> **No** — N/A (no data is collected)

### Content Rating (IARC)

- Violence: None
- Sexual content: None
- Profanity: None
- Substances: None
- Gambling: None
- Hate speech: None
- User-generated content: User-entered notes (reflections) only;
  not shared with anyone

Result: **Everyone** (lowest tier)

### Pricing & Distribution

- **Pricing**: Free
- **Contains ads**: No
- **In-app purchases**: No
- **Categories**: Lifestyle (primary), Books & Reference (secondary)
- **Distribution**: All countries (or specific list)
- **Target audience**: Adults (18+) — appropriate for a religious tool
  used by adults; not directed at children

### App Access

- **All functionality available without special access**: Yes
- No login, no special permissions required (only standard
  Android POST_NOTIFICATIONS + SCHEDULE_EXACT_ALARM for reminders)

### Health Apps

- **Is this app a health app?**: No (it tracks spiritual habits,
  not health metrics)

### COVID-19 Apps

- **Is this a COVID-19 contact tracing, testing, or health resource
  app?**: No

### Data Practices

For Google's "Data Practices" form (different from Data Safety):

- **Data shared with third parties**: No
- **Data collected by app**: None
- **User can request data deletion**: N/A (no data collected)
- **User can opt out of data collection**: N/A

### Government App Declaration

- **Is this app a government app?**: No

---

## Marketing Assets (both stores)

### App Preview Video (optional but recommended)

- 15-30 seconds
- 1920x1080 portrait
- Should show the picker → daily actions → dark mode loop

### Promo / Banner Image

- Path: `marketing/app-banner-1024x500.png` (to be created)

---

## Pre-submission Sanity Checks

Run these on Cam's machine (with Android Studio / Xcode installed):

### Android

```bash
# 1. Build a debug APK first to verify the build works
npm run android:build:debug

# 2. Test on a physical device (or emulator)
adb install android/app/build/outputs/apk/debug/app-debug.apk

# 3. Run a release build (this is the one Play Store gets)
npm run android:build:release
# → output: android/app/build/outputs/bundle/release/app-release.aab

# 4. Upload to Play Console via "Internal testing" track first
```

### iOS

```bash
# On a Mac with Xcode:
npm run build
npx cap sync ios
npx cap open ios
# In Xcode: Product > Archive > Distribute App
# Choose: App Store Connect > Upload
```

---

## TODO (Cam to do, not automatable)

- [ ] Create Apple Developer account ($99/yr) — https://developer.apple.com
- [ ] Create Google Play Developer account ($25 one-time) — https://play.google.com/console
- [ ] Take 4-6 screenshots on each device class (use the script in
      `scripts/screenshot-store-assets.cjs` to get exact dimensions)
- [ ] Create the 1024x500 feature graphic for Play Store
- [ ] Fill in Apple App Store Connect metadata (paste from above)
- [ ] Fill in Google Play Console metadata (paste from above)
- [ ] Upload the iOS build via Xcode → App Store Connect
- [ ] Upload the Android .aab to Google Play Console
- [ ] Submit iOS for App Review (typically 1-2 day turnaround)
- [ ] Submit Android for Play Store review (typically hours to days)
