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
Task 2: concerns — no captured RED (tests written after code); added un-archive when undoing the step that auto-archived a plan; MAX_* moved to ids.js; refused ops return input store; generators throw RangeError.
Task 2: Ruling (review Important 1): active-plan restore on undo is owned by Task 4 — undoStudy, when clearing the logged {stepId} un-archives that plan (archivedOn === the entry day) and activePlan.personalStudy is null, re-activates that plan; Task 4 adds the round-trip test (active → finish last step → undo → archivedOn null AND activePlan back). setStepDone stays store-only — cost if wrong: none (deterministic from the log).
Task 2: minor (deferred): un-archive condition doesn't check the clear happens on the finishing day (review Minor 4).
Task 2: fix round 1/5 (3 addressed, 0 open — day validation, auto-archive on deleteStep/createPlan, updateStep null guard; commits 1315f60..0b5d865)
Task 2: complete (commits a485c6e..0b5d865, review clean)
Ruling (pre-Task 3): "active family plans" = kind family + not archived, createdOn order; agendaFor returns stored items when the week key exists (empty array = deliberately cleared), else the autoFill preview (ids preview-<stepId>, never stored until Keep); reserved = steps in any other week's stored agenda + done steps; free titles 1–60 trimmed, link null or safe https; prune keeps weekStart(today)−52w .. +8w; provider runs pruneAgendas(cleanReferences(store), today) after load and persists only if changed (not in read-only) — cost if wrong: small UX differences.
Task 3: minor (deferred): setAgenda accepts whitespace-only free titles on direct calls; same stepId twice in one week not de-duped; provider prunes with appDay(new Date()) not currentDay and only on load; agendaFor previews any Monday (UI must limit to planWeeks — Task 9); no test for addFreeItem at 5 items on a previewed week.
Task 3: complete (commits 0b5d865..0f05186, review clean)
Ruling (pre-Task 4): checkInFamily stores a previewed (auto-filled) agenda before marking its steps, so undo and later views match; family plans never become activePlan; undoStudy restores activePlan per the Task 2 ruling with a whole-store round-trip test — cost if wrong: none.
Task 4: concerns — study logs {stepId} only when it ticks a not-done step (else true); same-day re-check undoes first; preview week stored on family check-in and left stored on undo; undoFamily re-reads the week's agenda (item removed in between stays done; a step hand-marked done the same day is cleared) — follows Decision 2.
Task 4: review Approved (no Critical/Important). Accepted limitation: family undo can't be exact for a step hand-marked done earlier the same day (family log value is `true` only, Decision 2) — doc note added in the fix.
External finding (Codex on PR #265, P2, Task 3 code): setAgenda accepts empty planId/stepId → store fails validation next launch → whole store treated as corrupt. Ruling: fix before merging; bundled with Task 4 hardening as one fix round on feat/plans-projects; the release PR then includes Task 4 — cost if wrong: none.
Task 4: minor (deferred): back-dated study check-in can miss re-activation (archivedOn = finishedOn later than the entry day).
Task 4: fix round 1/5 (4 addressed + Codex P2 addressed, 0 open — agenda writer reuses store's validAgendaItem, family kind guard, study ticks only the active plan, doc note/test rename; commits fbd0926..adc50ea)
Task 4: minor (deferred): plans.js cleanTitle trims then slices (a cut title can end in a space).
Task 4: complete (commits 0f05186..adc50ea, review clean)
