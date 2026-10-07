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
