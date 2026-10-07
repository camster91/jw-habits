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
Ruling (Codex P2 on PR #265, supersedes the accepted Task 4 limitation and amends Decision 2): familyWorship log value may be `true` or `{stepIds: string[]}`; checkInFamily logs the step ids it actually marked; undoFamily clears doneOn only on those ids (when doneOn === day); legacy `true` entries keep the old agenda re-read behaviour — fixes same-day hand-marked steps being cleared — cost if wrong: one more value shape in validateStore.
Task 5: concerns — linkLabel/fd.links.opensInLibrary not yet shown in UI (Tasks 8–10 will); Package.swift hand-edited and committed (AppLauncher); Today.test mocks openLink.
Task 5: ⚠️/Minor 1 linkLabel has no consumer yet — owned by Task 8 (StepSheet uses linkLabel per plan).
Task 5: minor (deferred): no lookalike-host negative tests; port not checked (hostname vs host); date= single-digit assertion; AppLauncher {completed:false} no fallback (benign for https); dailyTextUrl with undefined day.
Task 5: complete (commits adc50ea..1729a6a, review clean)
Task 4: fix round 2/5 (Codex P2 addressed — family check-in logs {stepIds}; undo clears only those; same-day re-check-in undoes first; commits 1729a6a..bf6b9e0). Today.jsx still logs family `true` until Task 10 wires checkInFamily.
Ruling (pre-Task 6): full family week = a familyWorship entry on D whose week has a STORED agenda with ≥1 item, every step item's step exists with doneOn ≤ D (free items count as done by the session); awarded once per week on the first qualifying session; plan-finished XP on finishedOn for finished plans (archived or not); level ≥ 8 named 'Fruitful Tree '+(level−6) — cost if wrong: XP numbers shift slightly.
External (Codex on PR #265 @23d9aaf): P2 createPlan/archivePlan write an unchecked `today` into createdOn/archivedOn → invalid store → corrupt-on-load. Ruling: fix (refuse non-day) before merge — cost if wrong: none.
External (Codex @23d9aaf): repeated P2 on undoFamily's legacy `true` path. Ruling: accepted as-is — legacy entries can't record step ids; no UI reaches undoFamily until Task 10, which writes {stepIds}; replied on the PR thread — cost if wrong: a pre-v5.1 family entry undone via the new UI could clear a same-day hand-marked step.
Task 6: Ruling: levelFor/gardenStage/levelName live in src/domain/garden.js (not xp.js as the plan said) — cohesive; later tasks (7, 11, 12) import them from garden.js — cost if wrong: none.
Task 6: ⚠️ finishedOn null for unfinished plans — verified in plans.js (finishedOn returns null unless all steps done).
Task 6: minor (deferred): undo/cap interaction and plan-finish XP not discriminated by tests (cap hides 85+); untested: plan finished after today, two family entries same day.
Task 6: complete (commits bf6b9e0..058784a, review clean)
Codex date fix: complete (4ed5ecf, re-review clean). Flake watch: one full-suite run reported 633/645 with no failure output; 12 further runs all 645/645 — likely a transient worker/timeout under concurrent load; recheck at the final review.
- Task 7: implemented c7ce8a2 (670 tests); onStoreChange cb now (store, {update, today}); xp.js exports fullFamilyWeekDays. Task review dispatched.
- Task 7 review: Spec ✅, Quality APPROVED; 5 Minor parked:
  Ruling: park listener-ordering (#1), finishedPlans future-date guard (#2 — setStepDone already validates days, UI can't write future), test-driver/edge/fake-id notes (#3-5) — all minor, re-check at final review — cost if wrong: a badge dated oddly in a hand-edited import.
Task 7: complete (c7ce8a2)
- Codex P2 (malformed agenda week key): fixed ea1cf78 on release/v5.1-foundation (agenda uses store.js isMonday); merge release→feat after Task 8 lands.
- Codex P2s (prune on clock day; pruning drops earned family-week XP): fixed 90c7490 on release (xp.js now exports familyWeekDays — merge with feat's fullFamilyWeekDays wrapper should be clean). Merge release→feat after Task 8.
- Task 8: implemented e9bd4f6 (721 tests, smoke 7/7 + journeys green locally); task review dispatched.
  Ruling: deleting a plan/step removes its derived XP (treated as undo) — spec: XP computed never stored; never-decreases covers missed days/grace/settings — cost if wrong: add an XP-floor record later.
- PR #265 MERGED to main as 0a40fb6 (merge commit; foundation Tasks 1-6 + Codex fixes ea1cf78, 90c7490). Deploy check running.
- Task 8 review: Spec ✅, Quality CHANGES (1 Important contrast + 9 Minor). Fix round 1 sent to implementer (items 1-6, 8-10).
  Ruling: park #7 (SettingsSheet → Sheet refactor) — duplication only, no behaviour risk — cost if wrong: two focus-trap copies to keep in sync.
  Ruling: park #8 domain part (undoing the auto-archiving step doesn't restore activePlan from the trail) — trail undo uses setStepDone; Today's undoStudy already restores — re-check at final review.
- Deploy verified: container main-0a40fb6 healthy, jwhabits.ashbi.ca 200, valid TLS, title Faithful Days.
Task 8: complete (e9bd4f6 + fix a52eb7d; re-review ALL ADDRESSED, #7 parked)
- Merged origin/main (0a40fb6) into feat as fa805f1: 731 tests, lint clean. Task 9 BASE fa805f1.
- Task 9: implemented 73c71e0 (742 tests). Ruling: free-item links use isSafeHttpUrl (http+https) like every other link field; brief's 'non-https' test uses ftp:// — consistency over brief wording — cost if wrong: one-line tightening.
- Task 9 review: Spec ✅, Quality CHANGES (8 Minor). Fix round 1 sent (1-5, 7, 8).
  Ruling: park #6 (cleared week has no "back to suggestions") — agenda.js design: empty array = cleared on purpose — cost if wrong: add a restore-suggestions action later.
Task 9: complete (73c71e0 + fix 6449e1d; re-review ALL ADDRESSED, #6 parked). Task 10 BASE 6449e1d.
- Task 10: implemented 3b4a6b2 (762 tests, smoke+journeys green). Review dispatched.
- Task 10 review: Spec ✅, Quality CHANGES (1 Important: "Did something else" on a done row silently un-ticks). Fix round 1 sent (1-6).
  Ruling: on a done row, "Did something else" is hidden; changing today's entry = undo then re-pick — avoids a silent replace — cost if wrong: one extra tap.
Task 10: complete (3b4a6b2 + fix a6db8e7; re-review ALL ADDRESSED). Task 11 BASE a6db8e7.


## Codex continuation — 2026-10-07

Task 11: implemented — original eight-stage garden, level progress, one-per-session level celebrations, badge event queue and collection route, Today sprout and Settings switches. Quiet tone and reduced motion suppress confetti as configured. Badges/garden stay when points are hidden.
Task 12: implemented — four local PNG card kinds, explicit copy allowlist, bounded canvas text, native cache/share/cleanup, web download, and sharing controls on all specified surfaces. Notes and links never enter card copy.
Task 13: writers, journeys, docs and version 5.1.0/build 510 updated. Full unit suite: 793 tests/51 files. ESLint, source formatting, production build and npm high-severity audit pass (0 vulnerabilities). Smoke: 7/7 pass. The enhanced journey checks cover 390px, 768px and 1440px layouts.
Browser environment: default Playwright Chromium 151 download returned empty archives; web checks use installed Chromium Headless Shell 134. Test contexts pin en-CA to avoid the environment's invalid C locale. Native device checks remain unverified.
No independent agent review was performed in this continuation. No production merge or deployment performed.
Enhanced journeys: all passed, including study creation/check-in, badge toast, next-week agenda, family check-in, hidden XP with retained garden, PNG download, badges, no horizontal clipping and sharing toggle at 390/768/1440px. Final console-error and third-party-request checks both pass.
