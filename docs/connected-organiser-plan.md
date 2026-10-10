# Faithful Days connected organiser plan

Status: approved product direction, with a persisted 5.3.0 local candidate now implemented. Original plan was prepared 2026-10-10 against c09a7ff; candidate evidence and explicit limits are in [organiser-candidate-review.md](organiser-candidate-review.md). No new posted issues, native distribution or store launch is claimed.

## Product goal

Make Faithful Days a private daily organiser for spiritual routines, preparation and personal ideas. A person should quickly see what matters today, schedule preparation, capture a related thought and return to the same work later. Borrow the clarity of task lists, calendars and quick notes while giving Faithful Days its own warm visual identity.

Success means a new user can complete a useful first action, and an existing user can follow meeting → preparation task → Today → linked note → completion without searching through unrelated forms. The first release of this direction remains local-only and English-only.

This extends [the experience review](product-experience-review.md). Existing release/security gates remain part of the launch objective. Implementation is incomplete until saved data, rendered journeys and physical devices are verified; a plan or passing build alone does not satisfy it.

## Navigation and connected objects

| Destination | Main question                | Default content and actions                                                                                          |
| ----------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Today       | What can I do today?         | Date, compact scheduled agenda, due tasks, selected routines; one Add action; completed items collapsed on request   |
| Plan        | What is coming up?           | Agenda by default; Week, Month and Tasks views; next study step, family agenda and preparation accessible in context |
| Notes       | What do I want to remember?  | Searchable notes, recent first, optional tags and linked activity; quick capture and useful starters                 |
| Progress    | What have I recorded?        | Weekly activity and reading position; optional garden and celebrations below useful information                      |
| Settings    | How should this work for me? | Grouped routines, schedule/reminders, appearance, links, backup/privacy and about                                    |

Keep five navigation destinations. Rename Plans to Plan when the connected views are ready. Tasks are a view within Plan, not a sixth navigation tab. Every top-level destination opens at its heading; returning from an item preserves the relevant list position. Onboarding completion starts at the top of Today.

| Object                                  | Meaning                                        | Completion behavior                                                                                  |
| --------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Routine                                 | Repeated personal activity with a cadence      | Explicit check-in; preserves existing daily, weekly and monthly accounting                           |
| Task                                    | A concrete action, optionally due or recurring | Tap checkbox to complete; visible undo; overdue tasks remain available                               |
| Event                                   | Something happening at a date/time             | Calendar presence never completes an activity; optional linked preparation tasks                     |
| Note                                    | A person's own ideas or references             | Save/edit independently; links back to related task, event or existing plan                          |
| Study plan / family agenda / assignment | Existing structured preparation                | Retains its existing source of truth; organiser surfaces its next action without duplicating records |

Example: Thursday meeting → Wednesday preparation task → Wednesday Today → note “Question about the reading” attached to the meeting → complete the preparation task. Thursday's event remains scheduled. A separate personal-study check-in is recorded only when the user chooses it.

## Screen requirements

### Today

- Compact date header and neutral summary such as “2 tasks · 1 event”. Routine progress uses a separate, cadence-aware summary; stop mixing monthly ministry with a daily steps score.
- Show timed agenda and due preparation, then routines. Keep the first actionable row visible on a typical phone. Empty agenda does not create a tall empty section.
- Task rows show checkbox, title and useful due/context information. Routine rows show icon, title, cadence, next study step where relevant, explicit completion and separate reference action. Expand chapter counters and supporting details only where needed; reading position remains discoverable.
- Tap to complete and immediate undo should be the default proposed interaction, replacing hidden hold-only behavior after accessibility and widget regression checks. Reference taps never complete a routine.
- Keep routines visible throughout the evening. “Done for today” minimizes the optional review only. No automatic disappearance, guilt language or pressure to complete everything.
- Replace “Make Today your own” with a clear action, “Edit routines”, and contextual help beside unfamiliar actions. Guides teach one action instead of adding long panels above the work.
- One Add button opens Task, Event or Note. Opening from a dated view preselects that date; nothing is saved until confirmed.

### Plan: agenda, calendar and tasks

- Agenda is the mobile default. Week and Month are alternative views; selecting a date opens its agenda and Add action. Narrow screens retain readable rows and an agenda fallback rather than squeezing text into calendar cells.
- Clearly separate all-day activities from timed events. Month cells show restrained indicators and an overflow count; selected-day details carry the full text.
- Create events with title, date, optional time/end time, recurrence and preparation. A date-only event is all-day. End time cannot precede start time.
- Task views: Today, Upcoming, All and Completed, plus search. Undated tasks stay in All and are easy to schedule; overdue tasks are clearly labeled, never automatically discarded.
- Support edit, reschedule, complete, undo and delete with recovery where practical. Editing recurring items asks “This occurrence” or “This and future occurrences”; historical completions remain intact.
- Existing study plans, assignments and family weeks appear as contextual cards with their next useful action. Lead with this week and upcoming items; expand older/future family weeks on request.
- Meeting events may reference existing preparation records. Assignment checklist items appear as linked tasks through an adapter; do not create independently editable duplicate checklists.

### Notes

- Quick capture requires only the note body; title can be suggested or added later. Preserve existing titles and limits. Show an attached activity as a visible chip while composing.
- Tags and reference links live in optional details. Search covers title/body/tags; filters include unlinked notes and related activities. Keep attachment links visible when a related object is removed, with an honest unavailable-context state.
- Meeting, study and family starters open editable drafts. Untouched starters close immediately; edited drafts use the now-fixed visible discard/keep-editing choice. Save failures preserve the draft and explain retry.
- Task/event detail offers “Add note” and existing linked notes. A note can link to more than one object through a new relation model without rewriting its legacy context field.
- Support a task-from-note action with confirmation and a backlink; never turn text into tasks automatically.

### Progress and personality

- Lead with useful weekly recorded activity, reading position and cadence-aware totals. Explain dates and omissions without judging a person's spirituality.
- Optional garden, gentle celebrations and share controls remain secondary. No ranking, competitive streak pressure or compulsory animation.
- Establish consistent spacing, typography, surfaces, icons, button styles and light/dark palettes before adding decoration. Use meaningful accents for activity categories, with text/icons so colour is never the only signal.
- Original illustrations support welcome, empty states and guides. Keep them small or absent in busy lists. Avoid repeating large decorative cards that push work off screen.
- Warm, specific copy and brief motion provide personality. Respect reduced motion, screen readers, contrast and touch target requirements. Include loading, offline, empty, error, completed and permission-denied states in the design system.

### Onboarding, guides and settings

- Fast path: explain private storage briefly, choose routines, arrive at Today and practice one action. Optional guided setup remains available for people who want detailed help.
- Ask for meeting days, reading pace and reminders only when relevant. Propose own-pace reading as the default; changing an existing user's pace requires an explicit choice.
- Teach the tracking-day boundary with an optional example: activity before 03:00 counts toward the previous app day. Do not describe it as a wake-up time.
- “Before bed”, “After breakfast” and similar cues are personal labels, not detected events. A scheduled notification requires a chosen clock time; changing the cue preserves that time. Review cue and clock together.
- Explain reminder settings and native permission together, with a real status and retry/settings path. No permission request before its benefit is understood. No promise of notifications on an unsupported platform.
- Settings becomes navigable groups with backup and reminder status easy to find. Help is attached to the feature it explains, with a separate optional short guide.

### What's New and additional routines

- Support an optional manual routine, “Explore what's new”, with a chosen cadence and a separate official-site link. It must not replace one of the six fixed routine IDs or imply that unseen updates were detected.
- Opening jw.org is separate from checking in. The user decides whether they explored it; no automatic content collection, copied publications or official branding.
- Additional personal routines use the same extension boundary and clear daily/weekly cadence. Start with simple title/icon/cadence/reference, rather than a general automation builder.
- Current terms and any new linking/content behavior must be reviewed when implementing this slice. This plan does not certify legal compliance or grant rights to publisher material.

## Date, recurrence and reminder semantics

Routine history continues to use the 03:00 local app-day boundary. Events and task due dates use civil calendar dates: a 01:00 Friday event remains Friday even if a routine check-in then belongs to Thursday. Labels and tests must make that distinction explicit.

Timed events store a local date/time with an IANA timezone and a resolved occurrence instant; all-day events and date-only tasks store dates without UTC conversion. Default to the device timezone at creation. Traveling changes display deliberately, not historical event dates silently. A fixed timezone event and a floating daily task need distinct representations.

Recurring tasks/events store a series definition plus stable occurrence keys and exceptions. Completing, skipping and rescheduling are different actions. Completion records actual completion time; a due date is not proof of work. Rescheduling one occurrence retains its original identity, and editing a series affects future occurrences without erasing past records. Limit the first recurrence editor to daily/selected weekdays/weekly/monthly; define invalid-month-day behavior before implementation.

Reminders refer to concrete occurrences. Editing, deleting, completing, restoring or rescheduling reconciles pending notifications and prevents duplicates. Permission denial must not block saving a task. Handle daylight-saving gaps/overlaps, midnight/03:00, week/month boundaries and clock/timezone changes explicitly. Do not invent quiet hours or automatic scheduling beyond what the platform adapter can support and verify.

## Data architecture and compatibility

Preserve `jw-habits-v2` schema 3, its six fixed IDs and existing history. Preserve `faithful-days-workspace-v1` schema 1, including notes, meetings and assignment checklists. Their strict validators make ad hoc extra fields or a same-key version bump unsafe.

Proposed implementation: a separate versioned organiser store, with tasks, events, recurrence definitions/exceptions, additional routines, completion records and relation records. Final key/schema is selected in ORG-02 after reviewing adapters and backup code. Stable typed references connect existing objects; selectors produce Today/Plan views from their owning stores. Editing an existing assignment checklist still writes through its original workspace adapter.

- Capture a fixture set and named backup before migration work. No rewriting legacy records merely to populate the new UI.
- Retain compare-before-write, serialized/native write behavior and conflict handling. A visible save acknowledgement follows durable persistence; failed writes keep drafts and the previous valid state.
- Cross-store actions must be retry-safe, with stable IDs and reconciliation. Prefer one owning write plus a recoverable relation write; never claim atomicity across separate storage adapters.
- Extend combined export/import with an explicitly versioned envelope containing each store, including organiser data and relations. Validate the complete payload before replacing data, keep a restore backup and make unsupported newer formats fail safely. Maintain reading of existing backups.
- Document old-client behavior: new organiser data is unavailable to older builds and must not be silently dropped by an older restore/export. Show compatibility information when transferring data between versions.
- Keep browser/native offline support and device-only privacy. No Google login, cloud backend or analytics service is implied by this design.

## Delivery backlog and dependencies

These are local, issue-ready work packages, mapped to existing GitHub tracking issues. They are not newly posted issues. Each package needs a small PR-sized acceptance checklist and its own verification evidence when implemented.

| ID     | Priority / size | Deliverable and acceptance                                                                                                                | Depends on                | Existing tracking      |
| ------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------- |
| ORG-01 | P0 / S          | Fix first-arrival/top-level scroll and focus; fresh onboarding opens Today at heading, item return preserves list context                 | None                      | #200, #199, #176       |
| ORG-02 | P0 / L          | Confirm models, ownership, temporal rules, backup envelope and old-client contract; fixtures prove legacy data untouched                  | None                      | #264, #263, #178       |
| ORG-03 | P0 / M          | Connected interaction prototype with fabricated week, all five destinations and empty/error states; review on phone sizes and both themes | ORG-02                    | #200, #196             |
| ORG-04 | P0 / L          | Persisted tasks and events, recurrence exceptions, durable save/conflict paths, export/import                                             | ORG-02                    | #263, #264             |
| ORG-05 | P0 / M          | Compact Today agenda/tasks/routines, explicit completion/undo and cadence-aware labels                                                    | ORG-03, ORG-04            | #200, #192             |
| ORG-06 | P1 / L          | Plan agenda/week/month/tasks, date selection and rescheduling, accessible narrow-screen fallback                                          | ORG-03, ORG-04            | #263, #176             |
| ORG-07 | P1 / M          | Linked note capture/search/filters and task-from-note; drafts/context survive failed save                                                 | ORG-04                    | #264                   |
| ORG-08 | P1 / M          | Meeting/assignment/study/family adapters, next action and linked preparation; no duplicated checklist source                              | ORG-05, ORG-06, ORG-07    | #263, #264             |
| ORG-09 | P1 / M          | Fast/guided onboarding and grouped Settings; first action before optional configuration                                                   | ORG-05                    | #199, #194, #200       |
| ORG-10 | P1 / M          | Additional routines and optional What's New check-in with independent external link and cadence                                           | ORG-02, ORG-05            | #200, #178             |
| ORG-11 | P1 / L          | Occurrence reminder reconciliation and truthful permission/status flows on claimed platforms                                              | ORG-04, ORG-06            | #42, #174              |
| ORG-12 | P1 / M          | Useful Progress, visual system, original illustration placement, motion and all system states                                             | ORG-03, ORG-05, ORG-08    | #196, #181, #192       |
| ORG-13 | P0 release / L  | Candidate regression, backup/restore/offline/a11y/native/device review, then exact-source release gates                                   | All launch-scope packages | #176, #251, #252, #261 |

Size is relative complexity, not a delivery-date commitment. Cameron owns product review, physical-device checks and Apple/Google account decisions. Implementation owns code, affected tests, documentation and candidate evidence. Public launch remains a separate verified milestone.

### Milestones and review checkpoints

1. **Decisions and prototype:** ORG-01–03. Produce a connected Today → meeting preparation → note example, with quick Add, calendar selection and undo. Judge hierarchy and usefulness before applying it everywhere. This is the next bounded action.
2. **Working connected slice:** ORG-04, ORG-05, ORG-07 and the minimum ORG-06 agenda. Prove durable task/event/note storage, legacy data compatibility and the end-to-end path. Do not treat a clickable mock as this milestone.
3. **Full organiser and character:** Finish calendar/task views, preparation adapters, onboarding/Settings, optional routines, reminder handling and Progress/visual polish. Review each feature in populated and empty states.
4. **Candidate and phone review:** Freeze scope and source; complete ORG-13. Resolve failures instead of hiding them behind optional UI. Test a full sample week and a physical backup/restore before calling it ready.
5. **Distribution and launch:** Apply existing signing/security, CI, TestFlight/Play testing, listing and store submission gates. Account blocks do not prevent independent implementation; they do prevent claiming a shipped launch.

The initial connected-organiser launch includes local tasks, events, recurrence, linked notes, calendar views, coherent routines and supported reminders. Google/Apple calendar sync, cloud/account sync, collaboration, attachments, AI suggestions and widgets for new organiser objects are later proposals requiring separate scope and platform decisions. Existing widgets must continue to work.

## Review scenario: a realistic fabricated week

| Day       | Scheduled / due item         | Connected action                                                           |
| --------- | ---------------------------- | -------------------------------------------------------------------------- |
| Monday    | Personal study task, Mark 1  | Open existing study step, capture a question, deliberately record study    |
| Wednesday | Prepare for Thursday meeting | Open checklist and linked meeting note; complete preparation task          |
| Thursday  | Meeting, 19:00               | View event and notes; event does not create an automatic routine check-in  |
| Friday    | Family worship, 19:30        | Open this week's agenda, capture an idea and record worship separately     |
| Saturday  | Ministry plan, 10:00         | Show planned event; monthly ministry record changes only on explicit input |
| Sunday    | Optional Explore what's new  | Open official site externally; optional manual routine check-in afterwards |

Also review an undated task, a missed recurring task, a moved event and an empty week. No real personal or publisher content is needed for fixtures.

## Acceptance and evidence before release

- New-user flow: choose a few routines, reach the top of Today, perform one action, undo, find it again and understand which data stays on the phone.
- Connected flow: create a meeting/event and preparation task, see it on the correct date, add a linked note, complete/undo/reschedule, search and reopen the same note. Existing study/family/assignment flows retain their actual history.
- Temporal flow: late-night routine vs calendar event; DST, travel, recurrence exceptions, this/future edit, overdue/date-only/all-day and monthly edge cases have deterministic results.
- Persistence/recovery: legacy fixtures and backups round-trip; new combined restore is verified; interrupted/conflicting/failed writes preserve valid data and drafts; upgrade/offline refresh does not lose relations or completions.
- Interaction: close/back/Escape/discard/save and return focus work consistently; no invisible confirmation; keyboard and screen-reader completion work; navigation does not strand users below headings.
- Rendered review: 320px and typical Android/iPhone sizes, larger text, light/dark/reduced motion, long titles and populated calendars; no horizontal overflow, clipped actions or colour-only meaning. Run affected accessibility and browser journey checks.
- Native/device: exact candidate compiled through existing CI, then physical Android and iPhone permission/reminder/background/external-link/keyboard/back/restore checks. Compare the installed build marker to the tested commit.
- Launch: signing credential remediation and protected owner approvals, signed artifact/upload processing, actual TestFlight/Play access, required testing and store acceptance are separately recorded. Recheck platform requirements at that stage.

## Current state and next action

The product audit and note-close/onboarding/routine-visibility corrections are local at c09a7ff. The delivered debug APK uses earlier bc5df60 source; this plan and later local fixes are not installed there. No TestFlight build is established by this planning work.

Next action: ORG-01–03, beginning with architecture/backup constraints and a connected phone prototype using the sample week. Review the concrete prototype, then implement the persisted slice. Keep progress in the existing delivery ledger and mapped GitHub trackers when an external update is authorized; do not replace the existing launch goal with a planning-only completion claim.
