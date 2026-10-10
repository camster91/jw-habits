# Organiser data contract — proposed for implementation

2026-10-10. ORG-02 design decision, based on `domain/workspace.js`, `data/workspaceClient.js`, `domain/store.js`, `utils/safeStorage.js` and `components/settings/BackupSection.jsx`. This document selects boundaries; it does not introduce a persisted store yet.

## Ownership and schemas

Keep the routine and workspace stores unchanged. Add `faithful-days-organiser-v1`, schema version 1, with monotonically increasing `revision`. Its validator must reject unknown versions, malformed records, duplicate IDs and invalid typed references within the organiser. Missing references into another store are recoverable dangling links, not a reason to erase data.

Collections: `tasks`, `events`, `series`, `exceptions`, `personalRoutines`, `routineCheckIns`, `relations`. IDs are generated once using the existing UUID helper. Dates and timestamps are validated separately; never feed civil event dates through `appDay`.

| Record           | Minimum fields and ownership                                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Task             | id, title, details, optional due date/time, status, completedAt, optional series/occurrence identity, createdAt, updatedAt                      |
| Event            | id, title, details, allDay, local start/end dates and optional times, timezone for timed events, optional series identity, createdAt, updatedAt |
| Series           | id, target kind/template, start date, recurrence, optional end date/count, timezone policy                                                      |
| Exception        | seriesId + original occurrence date (unique), action skipped/rescheduled/overridden, replacement values if applicable                           |
| Personal routine | id, title, icon from controlled set, cadence daily or weekly, optional safe reference URL, archivedAt                                           |
| Routine check-in | routineId, appDay, actual recordedAt; unique routine/day for daily cadence, explicit day entries for weekly totals                              |
| Relation         | id, typed source and target references; unique source-target pair; no copied note/task bodies                                                   |

Titles: 120 characters, task/event details: 2,000. Retain existing note limits. Bound collections and export payload sizes before coding the validator, based on measured offline performance and realistic retained history; do not silently truncate a valid import. Archived records retain historical references.

Existing assignment checklist tasks remain workspace records. Render them through an adapter keyed by assignment ID and checklist task ID; writes call the workspace writer. Existing meetings, study steps and family agendas keep their owning store. Adding an event that represents an existing meeting creates a typed relation; its creation flow must explicitly choose whether it is a new event or a representation of the existing meeting. Avoid two competing editable dates.

## Civil time and recurrence decisions

Date-only tasks/all-day events use `YYYY-MM-DD`, without timezone conversion. A date-only task is due on that civil day and becomes overdue on the next civil day, independent of 03:00 routine rollover. All-day end dates are exclusive, matching calendar ranges; the UI presents inclusive human dates.

Timed events use local start/end + IANA timezone. Recurrence preserves wall-clock time in that zone. On timezone travel, display the device-local time with the original zone available in details. Floating due-time tasks follow the device timezone and carry that explicit policy. Actual completion uses an ISO instant and is never inferred from the due date.

Initial recurrence: daily, selected weekdays, weekly, monthly on a numbered day; optional end date. Monthly dates absent from a month are skipped, with preview copy explaining that rule. No implicit last-day clamp. End dates include matching occurrences on that date. Series edit offers This occurrence or This and future occurrences. The latter ends the previous segment and creates a linked segment; it preserves past exceptions/completions.

Occurrence identity is series ID + original civil date. Rescheduling retains that identity. Marking a task skipped is distinct from completing it; overdue incomplete occurrences remain incomplete. Only visible-range occurrences are expanded for lists, while due/overdue selectors use bounded queries and explicit older-item access.

For nonexistent DST wall-clock times, resolve to the next valid local time and disclose it in the preview. For repeated times, select the earlier occurrence and show the zone/offset in details. Implement against a tested timezone-capable utility; do not hand-roll offsets or assume 24-hour days. Notification adapters must use the same occurrence resolver.

## Durable writes and relations

Reuse the workspace writer pattern: durable adapter, serialized writes, Web Locks where available, compare-before-write, increment revision after validation, update React state only after durable success. Failed writes retain the previous state and editable draft. Unsupported/unreadable data pauses writes and offers raw export, never a reset disguised as recovery.

Each object has one owning write. A cross-store relation can be created after its object is durably saved; retry uses a stable relation ID/pair and does not duplicate the object. If the relation fails, acknowledge the saved note/task and offer Attach again. Never claim the whole operation failed and invite duplicate creation. Deletion leaves dangling references visible as removed context until explicit cleanup; no cross-store cascading deletion.

## Backup and restore boundary

Current backup code exports the routine/workspace bundle and replaces stores sequentially. It retains `faithful-days-before-import` and attempts routine rollback after a workspace-write failure. This is recoverable multi-key work, not an atomic transaction.

New backups need a distinct envelope marker and version, with routines, workspace and organiser snapshots plus minimum reader version. Do not add organiser data to the existing format: an older importer could accept it and ignore the new collection. A new-format marker must be rejected by the current old importer; prove this with its actual validator before shipping.

New reader accepts legacy routine-only and routine/workspace bundles without touching organiser data. New full restore validates all three stores first, obtains the appropriate write locks in one consistent order, captures a full pre-import recovery snapshot, then writes sequentially with a persisted recovery journal. Startup must detect incomplete restore, pause dependent writes and offer recovery/export rather than rendering a falsely complete state. Notifications reconcile only after a successful restore or recovery.

Acceptance fixtures: populated legacy stores unchanged through first load; legacy exports still readable; full new bundle round-trips tasks/events/relations/exceptions; newer format safely rejected by old/new unsupported readers; corrupt or conflict data never replaces valid stores; failure at each restore write step preserves a usable recovery snapshot. These fixtures and fault-injection tests are required in the persisted slice, not claimed by this design record.

## Implementation boundary

The prototype uses fabricated, memory-only records and performs no adapter writes. Next persisted work begins with pure validators/time selectors, backup compatibility/failure tests and a durable organiser client, followed by providers and screen integration. Keep new organiser features out of release claims until those checks and physical-device restore pass.
