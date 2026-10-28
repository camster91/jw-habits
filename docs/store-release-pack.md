# Faithful Days 5.3 store release pack

Step-by-step owner setup (keys, secrets, consoles): [store setup guide](store-setup-guide.md).

Current phone-app code, not a claim that either store listing is live.
Faithful Days is phone-only; the website was retired on 2026-10-28.
Cameron / Ashbi Design owns name reservation, account declarations and submission.

## Listing copy

Name: **Faithful Days** (availability/reservation still requires the store owner).
Name and keyword rule: no JW marks. Do not use "JW", "Jehovah" or "Watchtower" in the app name, subtitle, icon or keywords (Apple 5.2 / 4.1, Google Play impersonation and metadata rules). The description may name the audience in plain words and must carry the not-affiliated disclaimer. See [terms checklist](terms-checklist.md).
Subtitle: **Spiritual routines, your way**.
Play short description: **A private, on-device routine and study planner for Jehovah's Witnesses.**
Play title: **Faithful Days**.
Suggested Apple keywords (comma-separated, no spaces after commas): `routine,habit,bible reading,study,planner,family worship,meeting,reminder,journal,tracker`

Length limits (counted 2026-10-28): Apple name 13 of 30; subtitle 28 of 30; Play title 13 of 30;
Play short description 71 of 80; Apple keywords 89 of 100; long description about 1,490 of 4,000.
Recount if you edit any of them.

Long description:

Faithful Days helps Jehovah's Witnesses organise daily spiritual routines and
personal study on their own device. Choose the routines that fit your life:
daily text, Bible reading, meeting preparation, family worship, personal study
and ministry, with a daily What's new check that links to jw.org. Keep a steady rhythm with gentle progress, optional reminders,
and a daily wrap-up. On the 1st of each month an optional reminder prompts you to send your
ministry report, and a card on Today shows last month's totals, which you entered yourself, with
a button to copy them.

Add big yearly dates such as the Memorial or an assembly and see what is coming up. Create study and family projects with your own titles and steps. Plan a family
worship agenda, track Bible chapters, and choose an optional garden, badges and
levels. Export a JSON backup to move or protect your data, with an optional monthly
reminder, and import it on another device. No account or cloud sync is required. The app contains no
publication text or verses; you choose your own links and written plan content.

Faithful Days is an independent app. It is not affiliated with, endorsed by,
or sponsored by Watch Tower Bible and Tract Society or jw.org, and contains no
content from jw.org.

Clearing app data or uninstalling can remove your history. Protect a backup
before doing so. Reminders and home-screen widgets need supported native
platforms and permissions; final listings must describe the verified release.

Suggested category: Productivity. Age/content-rating questionnaires must be
answered in the actual consoles; do not invent a published rating.
Privacy policy URL (store listing and in the app): https://faithfuldays.ashbi.ca/privacy/
Support URL: https://faithfuldays.ashbi.ca/support/
The pages are published from `site/` by Cloudflare Pages (project `faithful-days`) to https://faithfuldays.ashbi.ca on every merge to `main`.

## Current UI assets

`scripts/marketing/screenshot-store-assets.cjs` captures eight scenes with synthetic
records in light/dark: `today`, `wrap-up`, `plans`, `progress`, `onboarding`, `whats-new`
(What's new row with a "3 new" count), `dates` (Plans Dates card with three user-typed events)
and `report` (Today on day 3 of a month with the ministry report card).
Outputs have no alpha channel and include a dimensions/source manifest.
The smoke workflow uploads the generated pack as `current-store-ui`.

Targets: iPhone medium 1179×2556, iPhone large 1320×2868, iPad 13-inch 2064×2752,
and Android phone 1080×1920. Recheck current console requirements before upload:
https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications

These are browser-rendered current-app references. Recapture the signed native
release and real widgets on the required devices before store submission. No
widget image is fabricated, and these captures are not device certification.

## App Review notes (validate against the signed build)

No login is required. Faithful Days is a native Capacitor app, not a web wrapper:
it is installed from the store and works fully offline. Features to note:

- **Widgets:** an iOS WidgetKit widget (iOS 17+) and an Android home-screen widget
  show today's routines and let the user check one in. Widget interaction needs
  the supported OS and App Group configuration.
- **Local reminders:** morning, evening, date and monthly backup reminders are
  scheduled on the device after the user grants notification permission. Nothing
  is sent from a server.
- **Offline use:** all routines, plans, dates and history are stored on the
  device and need no network. The only network request is an optional daily
  read of jw.org's public What's New feed (two fields, on by default, off switch
  in Settings).
- **Share sheet:** the user can share a locally drawn PNG encouragement card, and
  export or import a JSON backup, through the system share sheet. Nothing is sent
  automatically.

Test reminders, widgets and sharing on a physical device before describing them
as verified. The app day rolls at local 03:00. Reviewers can complete or skip
onboarding, hold a routine to check it in, open Plans to add a date or a plan,
open Progress, and use Settings for reminders, backup, privacy and support.

## Privacy declaration

- **Apple App Privacy:** select **Data Not Collected**. The app has no account
  backend, analytics, advertising or remote storage and no third-party SDK that
  collects data. The iOS privacy manifests (`ios/App/App/PrivacyInfo.xcprivacy`,
  `ios/App/FaithfulDaysWidget/PrivacyInfo.xcprivacy`) declare the required-reason
  APIs used and no tracking.
- **Google Play Data safety:** declare **no data collected or shared**, and answer
  that the app has no accounts and no data deletion request flow beyond
  uninstalling.
- The daily What's New request carries no personal data from the app; jw.org sees
  ordinary network information such as an IP address, which is the same as opening
  any link. The account holder confirms this reading in each console before
  submitting. Do not mark the declarations complete from unit tests.

## Owner items

- Confirm the developer name "Cameron Ashley (Ashbi Design)" and the support email
  shown on the support page.
- Decide whether to write to DeveloperSupport@jw.org about the feed check
  ([terms checklist](terms-checklist.md)).
- Retire the old website: stop the `jw-habits` container on the VPS, remove the
  `traefik-guard` cron and the Traefik router, remove the `jwhabits.ashbi.ca` DNS
  record, and delete the deploy secrets from the repository.

Outstanding gates: #132/#133 signing incident, #246 name reservations,
#248/#249 signed artifacts, #251 physical QA, #252 pilot, #253 account-specific
Play eligibility, #254 submission/review and #255 owner-side retirement cleanup (above).

## Initial language claim

Declare the current app UI as English only. #259 chooses its English-only initial-release alternative and removes unused v1 es/fr catalogs. Native widget chrome resources may follow the device language; full Spanish/French app UI, notifications/destination review, and fluent accessibility checks remain #46. Do not advertise full es/fr support from the native widget resources.
