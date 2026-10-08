# Spec: store-v4

Status: draft for Cameron's review, 2026-10-08. Provider module for
[CAPABILITY-MAP.md](CAPABILITY-MAP.md); supports #263 and #264. This document
proposes contracts. It does not describe shipped behavior or authorize a
production schema bump. Plan/task breakdown follows specification review.

## Objective

Give personal notes, dated meeting preparation and assignment plans one
validated local data model, without losing the existing routines, plans,
reading history, family agendas or rollback copies. Give native capture a
reliable answer to "has this note actually reached storage?" before it may
acknowledge a pending payload. All content remains on-device and round-trips
through the user's JSON backup.

This module owns schemas, upgrades, backup compatibility and persistence
acknowledgement. It does not implement Notes navigation, editors, search,
meeting checklists, an OS share extension or reading-ahead calculations.

## Source baseline and risks

Baseline: main `7d12910de059936a8ac5df36257026076374b445` (v5.1.0).

- `src/domain/store.js`: store version 3; exact top-level keys; deep-copy
  validation; plans accept only study/family kinds; v2 JSON import upgrades.
- `src/domain/upgrade.js`: pure v2-to-v3 upgrade; studyTopic becomes a plan.
- `src/data/StoreProvider.jsx`: frozen `jw-habits-v2` key; original v2 backup;
  optimistic memory updates; `update(fn)` does not return write completion.
  Unknown/newer versions currently enter corrupt-data fallback, which can
  replace the main stored value with defaults. This is a downgrade hazard.
- `src/utils/safeStorage.js`: serialized writes, Capacitor Preferences on
  native and localStorage on web. The chain is process-local; it is not a
  multi-tab transaction lock. Web reads currently hide storage-read errors
  behind null. Upgrade protection needs an error-preserving read path.
- `src/domain/agenda.js`: current load-time cleanup drops dangling agenda
  references and prunes some family weeks. It must never prune new notes or
  meeting records implicitly.
- `src/components/settings/BackupSection.jsx` and `src/utils/backup.js`:
  existing import/export and temporary native-file cleanup.

An older, unguarded v5.1 tab cannot be made safe merely by changing the new
build. Forward-version protection must precede the v4 rollout, and the
supported downgrade/multiple-client policy must be approved before enabling
it. Do not claim that an in-process promise queue solves cross-tab races.

## Tech stack and commands

Use the existing React 19.3, Vite 8, Capacitor 8, Vitest 5 and JavaScript stack.
Node >=22.12 is required; use the repository's Node 22 baseline. No backend,
database service, account, new runtime dependency or permission is proposed.

```sh
npm ci
npm run dev
npm test -- src/domain/store.test.js src/domain/upgrade.test.js src/data/StoreProvider.test.jsx src/utils/safeStorage.test.js
npm run test:coverage
npm run lint
npm run format:check
npm run build
npm run budgets
npm run smoke:spawn
npm run offline:verify
```

The current repository also has native-adapter tests in
`src/utils/safeStorage.native.test.js`; include those for adapter changes.
After building, start `npm run preview -- --host 127.0.0.1 --port 4173` in a
separate process for `npm run journeys` and `npm run a11y`. GitHub Actions
provides Android/iOS compilation. Physical-device QA remains #251.

## Proposed data contracts

Keep the primary persistence key frozen. Extend the validated JSON store to
version 4 with four empty-array defaults: `notes`, `meetingPreparations`,
`assignments`, and `captureReceipts`. Preserve all other v3 fields and values.
Record writers are pure, return fresh stores, never mutate input, and reject
invalid edits without partially applying them. JSON validation rejects
unknown keys, invalid dates/URLs, unsupported discriminants and duplicate ids;
it returns a deep copy as it does today. No silent truncation on import.

### Personal notes

| Field | Contract |
|---|---|
| id | Non-empty id; unique across notes |
| title | User-written string, at most 120 characters; may be empty |
| body | Plain text, at most 8,000 characters; may be empty |
| tags | Up to 10 non-blank strings, each at most 32 characters; trim and case-insensitively deduplicate in the writer |
| links | Up to 5 absolute credential-free HTTP(S) URLs validated by existing URL policy; never auto-opened or fetched |
| context | null, or one of the discriminated references below |
| createdOn, updatedOn | Valid app-day dates, supplied by the provider; not UTC slicing |

Require at least one non-blank title/body or one safe link. Limits are for new
note records only; do not change the current 60-character plan title or
280-character step-note contracts. UI must display the limits and refuse an
over-limit save, preserving the draft. Plain text is rendered as text, never
HTML. Users may supply their own text/links; the app does not import or fetch
publication content itself.

Context is exactly `{kind:'day', day}`, `{kind:'plan', planId}`,
`{kind:'step', planId, stepId}`, or `{kind:'meeting', meetingId}`. Validate
shape, not referential existence: deleting a referenced record must not
delete the user's note or make a backup unloadable. Consumers label dangling
references as unavailable and allow relinking. Context does not complete a
routine, create a calendar entry or grant external URL access.

### Meeting preparation

Each record is `{id, type, meetingDay, parts, createdOn}`. `type` is midweek
or weekend; meetingDay/createdOn are valid app-day date strings. Record ids
are unique; one record per `(type, meetingDay)`. The user chooses the meeting
type explicitly: the legacy meetingDays array does not identify it.

Each part is exactly `{id, doneOn}`; ids are unique within the record and
drawn from the fixed generic set for its type. Midweek: treasures,
spiritualGems, bibleReading, applyYourself, livingAsChristians and
congregationBibleStudy. Weekend: watchtowerStudy. `doneOn` is null or the
app day on which the user prepared it. The consumer may omit an inapplicable
part; no workbook text or publication-specific tasks are synthesized.

Meeting preparation records never directly create routine check-ins. A future
meeting-parts spec must separately define that interaction. Preserve records
until explicit user deletion; the old family-agenda pruning window does not
apply. A meeting-date edit must explicitly resolve collisions rather than
merging or overwriting another week's preparation.

### Assignment references and plan compatibility

Each assignment is `{id, planId, type, dueOn}`, with a unique id and one
assignment per plan. `type` is studentPart, talk, reading or demonstration;
dueOn is a real calendar date, not a future activity-log entry. A dangling
planId is valid and shown as unavailable until the user repairs or deletes it.

Propose adding assignment/ministry to PLAN_KINDS so dated assignment steps and
ministry preparation reuse existing plan steps and links. Existing study and
family records keep their shapes and kinds. Only an unarchived study plan may
be the active personalStudy plan; only family plans enter auto-filled family
agendas. Never reinterpret an existing plan or infer a routine check-in from
preparing an assignment. This kind extension needs explicit spec review.

### Capture receipts

Each receipt is `{id, savedAt}`, where id is the native transport's stable
payload id and savedAt is a finite non-negative integer epoch timestamp.
Ids are unique. Receipts contain no shared text, note title or URL.

The eventual capture consumer creates a note and its receipt in one store
commit. Replay of a saved payload must not create another note. Deleting that
note intentionally must not cause a transport retry to recreate it. Receipt
retention must cover the transport's entire replay window; this module cannot
prune receipts until the native-capture spec defines bounded payload lifetime
and confirms acknowledgement. No arbitrary 100-item truncation is allowed.

## Upgrade, rollback and import contract

1. A compatible v3 bridge release must distinguish `newerVersion` from
   corruption, expose a readable update-required state with export/recovery,
   and avoid writing, default replacement, cleanup or raw-value deletion.
   It must protect pending mutations, not just startup reads.
2. Before replacing a valid raw v3 value, durably preserve its byte-exact
   original in `jw-habits-v2-before-v4`. Check/write that snapshot before the
   primary write; never overwrite a snapshot already present. If checking or
   writing it fails, leave the primary value unchanged and expose a recoverable
   unsaved/read-only state. Quota handling must not evict any upgrade backup.
3. Upgrade v3 purely by changing version and adding the four empty arrays.
   v2 still goes through the existing topic-to-plan upgrade. Preserve its
   original bytes in the existing `jw-habits-v2-backup`; if there was no raw
   v3 value, save a validated serialized v3 intermediate before v4. The
   intermediate is not represented as an original byte-exact v3 file.
4. Upgrade output must validate before adoption. Malformed or unsupported
   input must not be partially upgraded. Migration must be repeatable after
   interruption; the v2 topic must not acquire a different plan id after a
   successful intermediate snapshot has been saved.
5. v4 JSON exports include all four new fields. Import accepts valid v2/v3/v4
   through pure upgrade/validation, rejects newer versions, and preserves
   deep-copy isolation. The replacement confirmation explains that current
   notes/preparation will be replaced and offers current-data export first.
6. Downgrade is an explicit recovery operation using the preserved v3
   snapshot. Explain that it cannot represent later notes/preparation; offer
   a v4 export before proceeding. Never feed v4 directly to an old build or
   promise that a v3 snapshot contains subsequently created v4 content.

Do not enable v4 until a supported multiple-client policy is approved and
tested. A new-build version check alone cannot guarantee safety from an
already-open, unguarded v5.1 writer. An alternative isolated v4 store/sidecar
would require a revised capability-map boundary and its own compatibility
contract; it is not silently authorized by this draft.

## Persistence acknowledgement boundary

Keep `update(fn)` compatible with its existing callers. Add a separately named
`commit(fn)` provider operation returning a Promise result:

```js
const result = await commit((store) => addNoteAndReceipt(store, input, today));
if (result.ok) await acknowledgePayload(input.payloadId);
```

The pure addNoteAndReceipt helper belongs to a later local-memory/native-capture
slice; this snippet illustrates consumer ordering, not implemented code.

`commit` must validate the resulting store, use the same serialized write
pipeline as normal updates, and report success only after the corresponding
durableSet resolves. Failure returns `{ok:false, reason}` with invalid,
readOnly, conflict or storage as finite reasons; it must not acknowledge the
native payload. Unsaved in-memory state stays exportable and visibly unsaved.
No payload or note text is included in diagnostics.

Normal updates occurring while a commit is pending must use the latest memory
snapshot and must not overwrite or drop the committed note/receipt. Native
transport deletion is outside this provider; it happens only after success.
On replay, a receipt in memory alone is insufficient: persist the current
receipt-bearing snapshot successfully before acknowledging. If the app exits
after durable save but before acknowledgement, the next attempt deduplicates.

## Project structure and code style

Keep validation/upgrades and record operations in `src/domain/`; persistence
and version protection in `src/data/StoreProvider.jsx` and the durable adapter.
Use a dependency-free schema/limits leaf if importing validators from store.js
would introduce a cycle. Consumer UI never writes raw storage.

Tests stay beside their modules. Add fixture-driven provider/storage tests and
real multi-tab/offline-upgrade cases under `scripts/verify/`. Update CLAUDE.md,
PRIVACY.md and recovery/backup copy when implementation changes the contract.
Each implementation PR links the relevant section of this spec.

Follow the current pure-function style, named exports, camelCase, two-space
indentation and Prettier. Refused pure edits retain the original object:

```js
export function deleteNote(store, noteId) {
  if (!store.notes.some((note) => note.id === noteId)) return store;
  return { ...store, notes: store.notes.filter((note) => note.id !== noteId) };
}
```

This is a style example; a complete deletion contract belongs to local-memory.

## Testing strategy and success criteria

Use meaningful Vitest regressions plus built-browser cases. Existing coverage
floors remain: global 85% statements/functions/lines and 80% branches; domain
95% statements/functions/lines and 90% branches. Existing 818-test/58-file
baseline, budget, browser and native checks must stay green; do not lower floors.

- [ ] Representative v1/v2/v3 fixtures preserve every existing category;
  topic migration, badges, family agendas, links and chapter logs survive.
- [ ] Valid v4 import/export is lossless and non-aliasing. Invalid/duplicate
  ids, unsupported keys/kinds, invalid dates, unsafe URLs and oversized fields
  fail without partial replacement. Dangling references remain readable.
- [ ] Before-v4 and original v2 copies are correct; backup failure, read
  failure, quota failure and interruption never overwrite the old primary.
- [ ] Supported future-version/old-client paths show update-required and
  preserve raw bytes. Real two-tab tests verify the approved writer policy.
- [ ] Overlapping update/commit, failed commit then retry, and restart after
  save-before-ack preserve notes and deduplicate capture receipts. The native
  payload remains pending whenever save acknowledgement is unavailable.
- [ ] Current 03:00 rollover, timezone travel and explicit routine undo stay
  correct. New preparation metadata does not invent activity or earned XP.
- [ ] Actual service-worker update/offline reload preserves v4 bytes; current
  routines/plans still work before downstream feature UI is enabled.
- [ ] Backup/recovery/privacy copy states the new data categories, unencrypted
  export, snapshot retention, deletion behavior and downgrade limits accurately.

## Boundaries and review decisions

Always: preserve frozen keys and original copies; validate before adoption;
keep domain writers pure; retain user text on failed save; use existing 03:00
app days; keep raw content out of logs; report target-environment evidence.

Ask/review before implementation: this schema and provider contract; the
multiple-client/bridge rollout policy; assignment/ministry plan kinds; note
limits; any new dependency, CI contract or native permission. No unrelated
framework or database migration is included.

Never: bundle or scrape JW-owned text/logos; add accounts/sync/analytics;
acknowledge before durable save; silently trim imported notes; drop history
to fit a new limit; auto-complete a routine from a dated preparation record;
claim store/native-device certification from unsigned compilation.

The first review should decide the v4 same-key/bridge policy, note limits,
plan-kind extension and durable-commit semantics. Receipt lifetime is reserved
for native-capture and blocks any receipt pruning. Consumer module specs and
the implementation plan follow this provider-contract review; this spec alone
does not enable a production upgrade.
