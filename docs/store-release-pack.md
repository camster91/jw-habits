# Faithful Days 5.2 store release pack

Draft for the current implementation; neither store listing or signed release is verified live. Cameron / Ashbi Design owns name reservation, account declarations and submission. Validate final copy and images against the exact signed candidate before publishing.

## Listing copy

Name: **Faithful Days** (store availability/reservation remains an owner check).
Subtitle: **Spiritual routines, your way**.
Play short description: **Private routines, study plans, notes and meeting preparation on your device.**

Long description:

Faithful Days helps Jehovah's Witnesses organise spiritual routines and prepare ahead on their own device. Choose the routines that fit your life: daily text, Bible reading, meeting preparation, family worship, personal study and ministry. Keep a steady rhythm with gentle progress, optional reminders and a daily wrap-up.

Create study and family projects with your own titles and steps. Plan a family worship agenda and track Bible chapters. Keep your own notes with tags, links and local search. Choose actual meeting and assignment dates, mark the sections you have prepared, and make a personal assignment checklist. Preparation and notes stay separate from the routine activity you record on Today.

See recorded weekly activity, a garden and badges. Turn points and levels on or off. Export a combined JSON backup to protect your routines, notes and preparation, then import it on another device. There is no app account or automatic cloud sync. Backup files are not encrypted; keep them private. The app contains no publication text or verses: you choose your own links and written content.

Faithful Days is an independent app. It is not affiliated with, endorsed by or sponsored by Watch Tower Bible and Tract Society or jw.org, and contains no content from jw.org.

Clearing app data or uninstalling may remove your history. Save a backup first. Reminders and home-screen widgets depend on supported native platforms and permissions; final listings must describe the verified release.

Suggested category: Productivity. Complete age/content-rating questionnaires in the actual consoles; no published rating is claimed here.

Privacy: https://jwhabits.ashbi.ca/privacy/
Support: https://jwhabits.ashbi.ca/support/

These match the public source pages and app Settings links. Public HTTP availability is a separate production-recovery gate; do not submit unreachable URLs. The former `.html` paths do not match shipped static files and may fall back to the app shell.

## Current UI assets and recapture

`scripts/marketing/screenshot-store-assets.cjs` captures Today, evening wrap-up, Plans, Progress, Notes, a prepared meeting, an assignment checklist and onboarding with fabricated records in light/dark. Preparation/assignment shots are scrolled to the actual saved record; the manifest identifies that anchor. It validates both fixtures, waits for actual screen/data readiness, rejects visible alerts, exports opaque PNGs and records dimensions, source revision and generator hash. Smoke uploads the generated reference pack as `current-store-ui` when authorized CI runs.

Browser targets: iPhone medium 1179×2556, iPhone large 1320×2868, iPad 13-inch 2064×2752 and Android phone 1080×1920. These are rendered browser references, without native status bars, device frames or fabricated widgets. Select a truthful subset rather than submitting all references indiscriminately. Recapture the signed native candidate and real widgets on required supported devices before store submission. Confirm dimensions/count/format in the current consoles and [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications) / [Play preview-asset guidance](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).

Screenshot order draft: Today → Plans → Notes → prepared meeting → assignment → Progress. Use synthetic personal text only. Keep note/assignment creation forms, error/recovery and backup screenshots as reviewer evidence when useful, rather than marketing private-data recovery as a core benefit. No screenshots establish physical-device certification.

## Reviewer notes draft (validate on the signed build)

No login is required. Routines, plans, notes, preparation, assignments and history stay on-device. Core editing works offline; external links and the optional What's New feed require network access. The app day rolls at local 03:00. Preparation checks and written notes do not automatically mark a routine complete.

1. On welcome, choose Start with defaults or follow the customization steps. On Today, hold an empty circle to record a routine; tap a checked circle to undo.
2. Open Plans and create a study project with your own steps; use it on Today. Family plans and agendas are available in Plans. Open Progress for recorded weekly activity and the garden/badges.
3. Choose Notes in the bottom navigation. Choose New note, write a title/body and optional comma-separated tags or links, then Save note. Search notes locally and reopen the saved note to edit. Use fabricated personal text for review.
4. In Plans, choose Prepare for meetings and assignments. Add a meeting with its actual date and mark a prepared section. Add an assignment title/type/date and your own checklist. Add a contextual note from the meeting/assignment link. Return to Today to confirm preparation alone has created no routine check-in.
5. Open Settings → Go to Backup. Export a combined backup and keep it private. Import only into an isolated review install: combined imports replace routine and workspace data after confirmation, retain a pre-import recovery copy, and routine-only legacy imports leave notes/preparation alone. Verify reload and recovery separately; export/import is not sync or atomic two-store storage.
6. Native-only claims require device evidence: reminders/permission denial, haptics, system sharing, durable storage and home-screen widgets. Verify both widget sizes, app-day rollover and the signed App Group/OS configuration before asserting support. The containing iOS app targets iOS 15; WidgetKit extension requires iOS 17. Native share-in capture is still pending its first-device baseline and must not be advertised as implemented.

An uploader exit, unsigned compile, browser screenshot or synthetic test is not reviewer acceptance or store availability. Record exact source/build/device/OS and results under the controlling release issues.

## Privacy declaration review

The app has no account backend, advertising analytics or remote habit/note storage. Detailed source inventory and unresolved declaration checks: [privacy data inventory](privacy-data-inventory.md). The optional What’s New shortcut is user-opened and performs no automatic feed collection. Public source policy covers routine/workspace content, plain-text backups, pre-import recovery copies, OS backup possibilities, user-invoked sharing, user-opened website links, external destinations, local diagnostics and support email. Review the signed package's permissions, embedded SDKs/manifests, actual network behavior and hosting/external-site/support recipients and retention before answering console forms. Do not infer Apple Data Not Collected or Play declarations from on-device architecture alone. [Apple privacy details](https://developer.apple.com/app-store/app-privacy-details/).

Required-reason manifest source and old compile evidence do not verify the new signed archive or console answers. No cloud sync, automatic external capture, encryption or full accessibility/localization certification is promised by this copy. Owner approval and current console declarations remain pending.

## Initial language and remaining gates

Declare the app UI English only. #259 selected the English-only initial release. Widget chrome resources may follow device language; full Spanish/French UI, notification/destination review and fluent accessibility remain deferred under #46. Do not advertise full es/fr support from widget resources.

Outstanding: #132/#133 signing incident, #246 name/account records, #248/#249 approved signed artifacts and test-track processing, #251 physical QA, #252 real household pilot, #253 account-specific Play eligibility, #254 explicit submission/review, production privacy/support availability and #255 approved web-retirement prerequisites. Local copy/assets preparation closes none of these gates.
