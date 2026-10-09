# Privacy data inventory — source evidence and owner gates

Reviewed October 8, 2026 against the local Faithful Days 5.2 candidate. Parents
#178/#174/#250; owner Cameron / store account holder. This is a source inventory,
not a signed-package inspection, console declaration, retention approval or legal
assessment. No private user data was inspected. Test records remain fabricated.

## On-device data and copies

| Data/path                                          | Contents and persistence                                                                                                                                                          | Source / boundary                                                                                                                   | Remaining verification                                                                                                          |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Routine store `jw-habits-v2`                       | Version-3 routines/history, reading, dated schedule, user labels/links, study/family plans/agendas, badges/preferences; Whats New last-check, count and up to 100 seen feed guids | `src/domain/store.js`, `src/domain/whatsNew.js`, `src/data/StoreProvider.jsx`; browser localStorage or native Capacitor Preferences | Signed native persistence/upgrade/read failures; no key rename or reset from this audit                                         |
| Workspace `faithful-days-workspace-v1`             | Version-1 notes/body/tags/links/context, dated meetings/prepared sections, assignments/details/tasks; revision                                                                    | `src/domain/workspace.js`, `src/data/workspaceClient.js`; same durable adapter, separate key                                        | Signed storage/restart/concurrent writes; no remote indexing or native share-in transport implemented                           |
| Pre-import `faithful-days-before-import`           | Complete routine/workspace recovery bundle retained before replacing either store                                                                                                 | `BackupSection.jsx`; plaintext, overwritten on a later import; no automatic expiration configured                                   | Owner retention/deletion choice and signed two-store failure/recovery proof; writes are not atomic                              |
| `jw-habits-v2-backup`, `jw-habits-v2-corrupt-<ms>` | Original migration/recovery values; may include private history                                                                                                                   | `StoreProvider.jsx`; no timed expiration configured                                                                                 | Owner recovery/retention decision; preserve original bytes before any approved removal                                          |
| Legacy v1 keys                                     | Prior routine/reading/settings values read by migration and retained for rollback                                                                                                 | `migrateV1.js`; current migration does not delete them                                                                              | Imported device inventory; avoid treating unused legacy helpers as active app writers                                           |
| Diagnostics `jw-error-logs`                        | Timestamp and category only; latest 20, seven-day pruning on app use; no message/stack/query/user agent                                                                           | `src/utils/diagnostics.js`; local browser/WebView storage, manual About clear                                                       | Native WebView persistence/clear and physical crash behaviour; no automatic upload                                              |
| Appearance/session UI values                       | Boot theme cache and session wrap-up/celebration flags                                                                                                                            | `src/theme/theme.js`, Today/celebration UI; no private note body                                                                    | Device cold start and storage teardown                                                                                          |
| Widget snapshot                                    | App day, counts, due routine IDs, **user-customized labels**, completion booleans, accent; ministry excluded                                                                      | `src/native/widgetBridge.js`; Android app-private `fd_widget` SharedPreferences; iOS App Group UserDefaults                         | Physical visibility/privacy (labels may be personal), App Group entitlements, snapshot lifetime and OS backup                   |
| Widget queue/recovery                              | Routine/day pending taps; Android `fd.queue`; iOS App Group lock/queue JSON and corrupt-queue recovery copies                                                                     | Android WidgetStore, iOS WidgetQueue; process-local/shared container only                                                           | Signed processing/durable acknowledgement and queue failure/restart/recovery acceptance; no timed corrupt-copy pruning asserted |
| Export/draft/recovery JSON                         | User-written private content in plaintext; browser download or native Cache file → chosen share destination                                                                       | `src/utils/backup.js`, Notes export, BackupSection; native deletion attempted in finally after Share resolves/rejects               | Physical OS cancellation/handoff/file-lifetime and delete-failure checks; recipient copies remain outside app control           |
| PNG share cards                                    | Locally generated selected routine/project/agenda data; omit step notes/links but may include user titles and planned topics                                                      | `src/share/cards.js`; user chooses share/download                                                                                   | Inspect all real signed card variants and cancellation; do not describe cards as containing no personal content                 |
| PWA caches                                         | Precached app assets and navigation shell; separate from localStorage records                                                                                                     | `src/sw.js`; user-controlled update, no routine/workspace cache upload                                                              | Installed physical PWA/updates and eventual authorized retirement; do not clear user data during web cutover                    |

No field/storage class here is a promise of app-level encryption. OS sandboxing
and disk protections are distinct from encrypted export or cloud sync.

## Network and user-directed destinations

- The web app makes normal asset/navigation/worker requests to its host. No
  routine/workspace payload is attached by the reviewed source. The host receives
  ordinary IP/header/path metadata; operational access logs and retention must be
  confirmed by the hosting owner. Browser journey no-third-party-request evidence
  applies to its exercised web paths, not a native traffic capture.
- What's New is an optional user-opened shortcut to the official page. No runtime
  feed request, collection or update-count claim remains. Legacy last-check/count/seen
  values stay in existing backups for compatibility and are not displayed as news.
  Verify absence of automated site requests in the actual signed native package.
- User-selected links leave the app for browser/JW Library. Destinations and URL
  paths are chosen/generated by the user flow; destination privacy applies. A
  private user-supplied URL may itself reveal information; no automatic link
  preview/upload or remote Notes index is implemented by the reviewed app.
- User-invoked OS sharing/download/export sends the selected content to a chosen
  destination. No automatic habit/note analytics backend was found in the reviewed
  current source entry points. This is not a complete third-party binary audit.
- Support email is user-directed to cameron@ashbi.ca. Recipient/provider access,
  retention and handling are owner facts to confirm; no support conversation was
  sent or inspected during this audit.

## Native configuration and declaration evidence

Android source manifest sets `allowBackup=false`, declares INTERNET,
POST_NOTIFICATIONS and RECEIVE_BOOT_COMPLETED, and does not declare contacts,
location, advertising-ID or camera/microphone permission. Inspect the **merged
signed manifest** and plugin dependencies before treating that source list as final.
Do not promise no device-to-device transfer from this flag: Android documents that
manufacturer behaviour can differ for Android 12+ ([Android Auto Backup](https://developer.android.com/identity/data/autobackup)).

The iOS app and widget source PrivacyInfo manifests declare tracking false, empty
tracking domains and empty collected-data arrays. App required-reason entries are
UserDefaults (1C8F.1/CA92.1), SystemBootTime (35F9.1) and FileTimestamp (C617.1);
widget declares UserDefaults (1C8F.1). Xcode source resources reference both manifests.
Plist parsing establishes syntax/declared values only; validate purpose eligibility,
all embedded SDK manifests and the aggregated report from the actual signed archive.
No new entitlement, permission, identifier or security setting was changed here.

Apple's privacy-label guidance includes partner practices and defines collection
in terms of off-device access beyond serving the request in real time. An empty
source manifest therefore cannot alone establish a console “Data Not Collected”
answer ([Apple privacy details](https://developer.apple.com/app-store/app-privacy-details/)).
This inventory deliberately leaves console answers pending the actual recipient,
SDK, signed-network and owner evidence. Required-reason guidance was consulted at
[Apple documentation](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api);
its browser-readable response did not expose reason eligibility details, so the
numeric reason codes are recorded from source and not independently certified here.

## Exact remaining owner actions

1. Inspect signed APK/AAB merged permissions and IPA app/widget/embedded SDK
   manifests, entitlements, signatures and aggregated privacy report for the actual build.
2. Test no automated site requests, user-opened links, URLs/redirects/headers
   and no routine/workspace egress using fabricated data. Preserve personal device data.
3. Confirm host/external-site/support recipients and retention, OS backup/transfer behaviour,
   recovery-copy lifecycle and plaintext export/widget visibility expectations.
4. Review and approve policy/listing/console responses against these results; verify
   public privacy/support availability before any separately approved submission.

Source-copy correction: the earlier “at most daily” feed claim was broader than
runtime behaviour. It now describes successful-check throttling and failed-request
retries. No scheduling/storage behaviour or public deployment changed. #178 remains
an owner decision; #174/#250 remain signed-package/declaration acceptance work.

October9 polish supersedes historical feed-throttle notes: foreground RSS collection is disabled; the official page opens only on user action. No public policy deployment or signed-runtime verification occurred.
