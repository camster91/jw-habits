# Data lifecycle inventory

See [privacy policy](PRIVACY_POLICY.md) and the [published policy](https://jwhabits.ashbi.ca/privacy.html).
The inventory describes current v3 behavior. New notes/capture fields require
review in the proposed capability map before changing this contract.

| Data | Purpose | Retention/deletion | Backup/recipient |
|---|---|---|---|
| Routine/day log, chapters, ministry hours/studies | Local check-ins, progress and history | Until edited/reset/app storage removed; no daily expiry | JSON/OS backup; no remote activity service |
| Schedules, labels, reading start/pace, anchors, reminders, quiet hours | Personal configuration/local scheduling | Until edited/reset/app storage removed | JSON/OS backup; local notification OS |
| Plans/steps/notes/links, active project and family agendas | User-written organisation and external destinations | Until deleted/reset/app storage removed | JSON/OS backup; destination receives a request only on open |
| Badges, theme/accent, game/share preferences | Optional presentation/progress | Until reset/app storage removed; derived garden/XP not a remote profile | JSON/OS backup |
| Language and mirrored boot theme | Local UI/startup preference | Until changed or app/site storage removed | Device/browser-managed settings |
| Widget snapshot and routine/day queue | Local widget display/tap transport | Snapshot replaced; queued taps drained on foreground, only up to three days old accepted | App Group snapshot/locked iOS queue file, Android shared preferences and OS widget; no server |
| Migration/recovery/corrupt copies and legacy keys | Preserve original bytes for recovery | No automatic expiry; current-store reset preserves them; OS/site clearing removes them | Local only unless user exports a copy |
| Diagnostic categories/times | Local troubleshooting | At most 20, seven-day retention; user can inspect/clear | No remote reporting |
| Temporary native PNG/JSON files | User-controlled system sharing | Best-effort cleanup after completion/cancel, OS-managed cache | Recipient apps chosen by user |
| Hosting/feed request metadata | Web delivery/optional feed | Hosting/feed retention requires operations/owner review | Hosting service or jw.org; no routine/note payload sent |

Source boundaries: `src/domain/store.js`, `src/utils/safeStorage.js`,
`src/utils/diagnostics.js`, `src/utils/backup.js`, `src/native/shareCard.js`,
`src/native/widgetBridge.js`, `src/native/whatsNewClient.js` and native widget
bridges. Import rejects malformed/newer schema backups and preserves originals
before upgrades. Never infer server restore coverage for device-local data.
