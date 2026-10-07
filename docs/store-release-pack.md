# Faithful Days 5.1 store release pack

Current code and web release, not a claim that either store listing is live.
Cameron / Ashbi Design owns name reservation, account declarations and submission.

## Listing copy

Name: **Faithful Days** (availability/reservation still requires the store owner).
Subtitle: **Spiritual routines, your way**.
Play short description: **A private, on-device routine and study planner for Jehovah's Witnesses.**

Long description:

Faithful Days helps Jehovah's Witnesses organise daily spiritual routines and
personal study on their own device. Choose the routines that fit your life:
daily text, Bible reading, meeting preparation, family worship, personal study
and ministry. Keep a steady rhythm with gentle progress, optional reminders,
and a daily wrap-up.

Create study and family projects with your own titles and steps. Plan a family
worship agenda, track Bible chapters, and choose an optional garden, badges and
levels. Export a JSON backup to move or protect your data, and import it on
another device. No account or cloud sync is required. The app contains no
publication text or verses; you choose your own links and written plan content.

Faithful Days is an independent app. It is not affiliated with, endorsed by,
or sponsored by Watch Tower Bible and Tract Society or jw.org, and contains no
content from jw.org.

Clearing app data or uninstalling can remove your history. Protect a backup
before doing so. Reminders and home-screen widgets need supported native
platforms and permissions; final listings must describe the verified release.

Suggested category: Productivity. Age/content-rating questionnaires must be
answered in the actual consoles; do not invent a published rating.
Privacy: https://jwhabits.ashbi.ca/privacy.html
Support: https://jwhabits.ashbi.ca/support.html

## Current UI assets

`scripts/marketing/screenshot-store-assets.cjs` captures Today, evening wrap-up,
Plans, Progress/Bible map and onboarding with synthetic records in light/dark.
Outputs have no alpha channel and include a dimensions/source manifest.
The smoke workflow uploads the generated pack as `current-store-ui`.

Targets: iPhone medium 1179×2556, iPhone large 1320×2868, iPad 13-inch 2064×2752,
and Android phone 1080×1920. Recheck current console requirements before upload:
https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications

These are browser-rendered current-app references. Recapture the signed native
release and real widgets on the required devices before store submission. No
widget image is fabricated, and these captures are not device certification.

## Reviewer notes draft (validate against signed build)

No login is required. The app stores user routines/plans/history locally and
works offline. Native functionality includes local notification permissions,
haptics, system sharing, JSON export/import and home-screen widget integration.
Test native reminders/widgets on a physical device before describing them as
verified. Widget interaction requires the widget's supported OS and App Group
configuration. The app day rolls at local 03:00. Reviewers can complete or skip
onboarding, hold a routine to check it in, create a plan in Plans, open Progress,
and access Settings for reminders, backup and privacy/support.

## Privacy declaration review

The app has no account backend, analytics or remote habit/note storage. It
reads a public What's New feed if enabled, and hosting/feed operators may see
network metadata. The owner must review those recipients and retention before
asserting Apple Data Not Collected or the Play equivalent. OS backups and
user-invoked exports/shares are also described in the public policy. Native
required-reason manifests compile; store-console privacy answers remain an
account-holder task. Do not mark the declarations complete from unit tests.

Outstanding gates: #132/#133 signing incident, #246 name reservations,
#248/#249 signed artifacts, #251 physical QA, #252 pilot, #253 account-specific
Play eligibility, #254 submission/review and #255 web-retirement prerequisites.

## Initial language claim

Declare the current app UI as English only. #259 chooses its English-only initial-release alternative and removes unused v1 es/fr catalogs. Native widget chrome resources may follow the device language; full Spanish/French app UI, notifications/destination review, and fluent accessibility checks remain #46. Do not advertise full es/fr support from the native widget resources.
