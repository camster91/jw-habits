# SDD ledger — plan: docs/superpowers/plans/2026-10-07-plans-projects.md
Spec: docs/superpowers/specs/2026-10-07-plans-projects-design.md. Branch feat/plans-projects from bef3950 (main f35dac9 + spec/plan). Baseline tests below.

## Pre-flight scan
| Pair / task | Produces vs consumes | Finding |
|---|---|---|
| T1→T2..T13 | v3 store shape, ids | GAP A: no id helper named; T2 createPlan and T3 items need ids |
| T1↔T3 | dangling refs tolerated by validator; cleanReferences in T3 | consistent (T1 must not reject dangling refs; T3 wires cleanup into provider) |
| T1 | studyTopic → plan | GAP B: plan colour/icon/createdOn for the migrated plan unspecified |
| T2→T3/T4/T6/T8/T9/T10 | plan ops, nextStep, finishedOn | consistent |
| T3→T4/T6/T9/T10 | agendaFor, autoFill, planWeeks | consistent |
| T4→T6/T7/T10 | log value {stepId}, check-in/undo | consistent |
| T5→T8/T9/T10/T12 | openLink, linkLabel | CONFLICT C: T5's grep rule "no window.open outside openLink.js" may hit unrelated web-only code (PWA/backup) |
| T6→T7/T11/T12 | totalXp, levelFor, gardenStage | consistent; XP counts every log entry incl. ministry/catch-up/widget entries (accepted per spec "a routine check-in") |
| T7→T11 | fd-badge event, badges map | consistent |
| T8→T9/T10/T11 | routes, PLAN_COLOURS, StepSheet | consistent |
| T11→T12 | ShareButton placement on Badges/Progress | consistent |
| T13 | version bump 5.1.0/510 incl. pbxproj | consistent |
| each task | tests vs code | self-consistent; T12 Review Focus 5 mocks measureText |

Ruling A: Task 1 exports `newId(): string` from src/domain/store.js (crypto.randomUUID with a Math.random/Date fallback); all later tasks use it — cost if wrong: trivial.
Ruling B: the plan migrated from studyTopic gets colour 0, icon 'book', createdOn = the upgrade day, archivedOn null — cost if wrong: cosmetic.
Ruling C: Task 5's grep rule applies to link-opening call sites only; a `window.open` in code that is not opening a routine/step/scripture/What's New link (e.g. web-only PWA or backup download code) is allowed if listed in the report — cost if wrong: one missed call site, caught in review.

## Progress
Baseline: 502 tests passing.
Owner instruction (2026-10-07): save everything to GitHub in case usage runs out — push feat/plans-projects and refresh the ledger snapshot on docs/plans-projects-spec (worktree ../jw-docs) after each completed task. Issues: #262 (v5.1 progress/resume), #263 (prepare ahead), #264 (second brain).
Task 1: Ruling (concern 2): onboarding's "Study topic" input removed (v3 has no studyTopic; projects replace it) — Today shows the active project title — cost if wrong: onboarding no longer names a study focus until Task 8's "New project" flow (could add an onboarding shortcut later).
Task 1: note (concern 1): step ids are globally unique (a {stepId} log value has no plan id) — every writer creating/copying steps uses newId(); carry into Task 2 dispatch.
Task 1: ⚠️ agenda 8-ahead/52-back limit not enforced by validation (correct) — owned by Task 3 pruneAgendas.
Task 1: minor (deferred): importJson default-param clock read; v2 studyTopic missing/non-string loads with no plan (accepted); reminders.test.js:128 uses studyTopic as scratch field.
Task 1: complete (commits bef3950..a485c6e, review clean)
Ruling (pre-Task 2): archivePlan (incl. auto-archive on last step) clears activePlan.personalStudy when it points at that plan; Today never shows an archived project — cost if wrong: none.
Ruling (pre-Task 2, review Minor 2): break the store.js↔upgrade.js import cycle by moving newId and the title/note limits into a leaf module src/domain/ids.js (store.js re-exports newId for compatibility) — cost if wrong: trivial.
