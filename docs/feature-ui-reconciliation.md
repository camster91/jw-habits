# Faithful Days: feature and UI contract

Cameron approved end-to-end completion on 2026-10-08, then requested removal
of the Today seed and reconciliation of the features for Jehovah's Witnesses
and ordinary users. This contract supersedes ambiguous project terminology
and the unenabled same-key v4 proposal. It does not claim store release or
physical-device verification.

## Tasks and places

| Place | Person's task | What it records |
|---|---|---|
| Today | Read, study, prepare or share in the ministry today | Actual activity on the local 03:00 app day |
| Plans | Prepare for a dated meeting or assignment; organise personal study and family worship | Future intentions and individual prepared steps |
| Notes | Capture an idea, question, scripture reference or link; find it later | User-written plain text, tags and optional context |
| Progress | Review recorded activity and reading; optional encouragement | Derived totals, garden, badges and optional levels |
| Settings | Change routines, schedules, reminders and appearance; protect data | Preferences, backup/restore and support |

Today has no garden illustration. Progress retains its existing garden.
Check-ins are not a measure of a person's spirituality and have no comparative
ranking. Preparing an assignment or creating a note never invents a routine
check-in. Links open material in JW Library or the browser; no publication
text or official logos are bundled or scraped.

## Language and interactions

- Personal study is the routine; a **study plan** organises its topics or chapters.
  One current plan supplies Today's next step. Other plans are **Up next**.
- **Use on Today** selects that study plan; it does not claim the study happened.
- Family worship has an evening agenda and optional plans spanning several weeks.
  Planning an agenda and completing family worship are different actions.
- Meeting preparation identifies **midweek** or **weekend** and the actual meeting
  date. It never infers meeting type from the old untyped meeting-days list.
- Assignments have a type, date and checklist. Their due date is not an activity date.
- Notes have plain text, tags, safe links and optional day/plan/step/meeting context.
  Deleting a referenced plan must retain the note and explain unavailable context.
- Forms ask what the person wants to do before optional colours/icons. Empty states
  offer a useful next action; zero-activity routine cards do not offer sharing.
- Supported English meeting labels follow the public meeting structure, checked
  against https://wol.jw.org/gse/wol/d/r492/lp-ghs/1201038 on 2026-10-08.
  These are generic categories, not this week's workbook or assigned content.

## Safe new-data boundary

Keep `jw-habits-v2` and its version-3 routine store unchanged. A separately
versioned `faithful-days-workspace-v1` value owns notes, dated meeting
preparation and assignments. This deliberately replaces the draft same-key
v4 rollout: already-open older clients never know or write the workspace key.
It needs no destructive upgrade or fabricated guarantee about old-client locks.

New workspace writers validate records, preserve drafts on failed save, and
acknowledge success only after durable persistence. Use compare-before-write
and Web Locks for supported multiple-tab writes. A mismatch pauses mutation
and offers reload/export rather than silently adopting stale data. Native writes
share one serialized adapter; the OS capture queue remains separate from app data.
Failed reads and unknown/newer schemas never become empty writable stores.

One combined backup includes routine and workspace data. Legacy routine-only
backups remain importable, with an explicit choice to leave workspace records
alone. Import validates both payloads before replacing either and retains a
recoverable pre-import copy. Restoration is never described as successful before
all durable writes resolve. Old clients can read only routine-only exports.

## Dependency order and completion gates

1. Browser read protection and explicit saving-paused feedback (#195).
2. Today visual removal and coherent current UI (#196/#194).
3. Workspace validation, conflict-safe persistence and combined backup (#263/#264).
4. Local notes CRUD, tags, contextual capture and search (#264).
5. Dated meeting preparation and assignment checklists under Plans (#263).
6. Reading-ahead comparison with selected reading schedule; recorded chapters
   remain dated on the day actually read (#263).
7. Native share capture with preview, save-before-ack and replay protection (#264).
8. Responsive/keyboard/contrast/offline/update/backup journeys, native compile,
   then signed installations and physical-device checks (#176/#251).

Each code slice must keep coverage floors, lint, format, build and size budgets.
Browser journeys cover 320px, representative mobile/tablet/desktop and light/dark.
Current routine undo, family agendas and 03:00 rollover remain regressions.
No issue closes from a spec, unsigned compilation or unperformed device test.
