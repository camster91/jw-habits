# Plans, Projects, Fun Layer and Sharing — Implementation Plan (v5.1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add study projects, family worship plans and weekly agendas, JW Library-friendly links, a fun layer (colour, trails, garden, XP and levels, badges) and encouragement share cards to Faithful Days.

**Architecture:**
- One shared Plan block in the store, upgraded from v2 to v3. Pure domain modules compute everything: plans, agendas, check-in effects, XP, levels, the garden and badges. Only badge earn dates are stored.
- New screens use the existing store context: a Plans tab, the plan trail, family weeks and badges.
- Links open through `@capacitor/app-launcher`. Share cards are drawn on a canvas and handed to `@capacitor/share`.

**Tech Stack:** React 19, Vite 8, Capacitor 8 (+ `@capacitor/app-launcher`), Tailwind 4 + DaisyUI 5, i18next, Vitest 4, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-07-plans-projects-design.md` (approved 2026-10-07). Also read `CLAUDE.md`. The v5.0 spec is the background (§2.2 is amended by spec §2.6).

## Global Constraints

- **Storage key** stays `jw-habits-v2` (CLAUDE.md: never rename `jw-` keys). The value is now `version: 3`.
- The v2 backup key is `jw-habits-v2-backup`, written once on the first upgrade.
- **Plan:** `{id, title, kind: 'study'|'family', colour: 0..7, icon, steps, createdOn, archivedOn}`.
  - Titles are 1–60 characters, notes ≤ 280 characters, steps ≤ 200 per plan.
  - Icons: `book`, `scroll`, `lamp`, `mountain`, `seedling`, `dove`, `sun`, `path`.
- **Step:** `{id, title, link, note, doneOn}`; `link`, `note` and `doneOn` may be `null`.
- **Agenda:** keyed by a Monday day, at most 5 items. Kept 8 weeks ahead and 52 weeks back.
- **XP:**
  - check-in 10, plan step 15, plan finished 100, full family-worship week 25;
  - **cap 100 per app day**;
  - level *n* needs `100·n·(n+1)/2` total XP;
  - XP never decreases except when the user undoes the action that earned it.
- **Level names, in order:** Seed, Sprout, Seedling, Sapling, Young Tree, Flourishing Tree, Cedar, Fruitful Tree, then "Fruitful Tree n" (n = 2, 3, …).
- **Never:** spending, a shop, leaderboards, comparisons, or wilting.
- **Settings:** `showGameLayer` and `showShare` both default `true`.
- **Links:**
  - Daily text default: `https://www.jw.org/finder?srcid=jwlshare&wtlocale={E|S|F}&prefer=lang&alias=daily-text&date=YYYYMMDD` (no dashes).
  - Meetings default: unchanged (wol.jw.org week link).
  - Open with `AppLauncher.openUrl`. Never use `@capacitor/browser`; never add jw.org to `server.allowNavigation`. Never fetch jw.org.
- **Copy rule:** never "missed/broke/failed/lost". All copy goes in `src/locales/en.json` under `fd.*`.
- **Share cards** never carry notes, links, jw.org text or logos, or "JW".
- **Tooling hazard:** prefer backslash-free regexes, and verify on disk (CLAUDE.md).

## Decisions this plan makes where the spec is silent

1. **The personal-study check-in records its step.** In v3 the `personalStudy` log `value` may be `true` (session only) or `{stepId: string}`. Undo clears that step's `doneOn` only if it equals the entry's day.
2. **The family-worship check-in marks its week's agenda steps.** Undo clears `doneOn` on those steps only where it equals the session day.
3. **Badges are awarded by a store-change listener.** `registerBadgeAwards()` in `src/main.jsx` runs on `onStoreChange` (the reminders/What's New pattern). It writes newly held badges once and dispatches a `fd-badge` window event for the toast. It never removes a badge.
4. **Garden stages** are set by total XP: 0, 50, 200, 500, 1000, 2000, 4000 and 7000 give stages 0–7.
5. **Badge ids** (18):
   - `firstStep`, `firstProject`, `firstFamilyPlan`
   - `familyWeeks4`, `familyWeeks12`, `familyWeeks52`
   - `dailyText30`, `dailyText100`, `dailyText365`
   - `study10`, `plans5`, `meetings10`
   - `pentateuch` (books 1–5), `gospels` (40–43), `greekScriptures` (40–66), `wholeBible` (1–66), from `booksCompleted`
   - `firstFullFamilyWeek`, `level5`

## Review Focus

1. **Deleting a plan or step that an agenda item or `activePlan` references** must not crash. References are dropped (owned by Task 3, tested there).
2. **Undo after the step was renamed or reordered** must clear the step the check-in recorded, not "the next step" (Task 4).
3. **Importing a v2 backup file** upgrades and validates. A v4 file is rejected as `newerVersion` and the store is unchanged (Task 1).
4. **Undo on the same day** removes that action's XP, and the daily cap still holds. A badge earned earlier stays even if undo makes its rule false (Tasks 6–7).
5. **Long custom titles, labels and emoji** on share cards wrap or truncate inside the card, never overflow (Task 12).

---

### Task 1: Store v3 and its upgrade

**Files:**
- Modify: `src/domain/store.js` (`STORE_VERSION = 3`, defaults and validation for the new fields)
- Create: `src/domain/upgrade.js`
- Modify: `src/data/StoreProvider.jsx` (upgrade before validating; write the v2 backup once)
- Modify: `src/components/settings/BackupSection.jsx` (via `importJson`)
- Test: `src/domain/upgrade.test.js`, `src/domain/store.test.js`, `src/data/StoreProvider.test.jsx`

**Interfaces:**
- Produces:
  - `upgradeStore(x): object` — returns `x` unchanged unless `x.version === 2`; for v2 returns the v3 shape.
  - `importJson` and the provider's load call `upgradeStore` before `validateStore`.
- **New v3 fields:** `plans: []`, `activePlan: {personalStudy: null}`, `familyAgendas: {}`, `badges: {}`, `showGameLayer: true`, `showShare: true`. `studyTopic` is removed.
- **Validation:**
  - every Global Constraint limit above;
  - plan and step ids are unique non-empty strings;
  - links pass the existing safe-https check;
  - agenda keys are Mondays;
  - agenda items are `{id, kind: 'step', planId, stepId}` or `{id, kind: 'free', title, link}`;
  - badge ids are among the 18, with day values;
  - a `personalStudy` log value of `{stepId}` is allowed.
- **Dangling agenda references and a dangling `activePlan` are not `badShape`.** They're dropped by `cleanReferences(store)` (Task 3) on load.

- [ ] **Step 1:** Write the failing tests:
  - a v2 store with `studyTopic: 'Daniel'` upgrades to v3 with one study plan titled "Daniel", no steps, set as active, and no `studyTopic`;
  - an empty `studyTopic` creates no plan;
  - the upgraded store passes `validateStore`;
  - `importJson` of a v2 file returns `{ok: true}` with version 3;
  - a v4 file is rejected as `newerVersion` and its input isn't mutated (Review Focus 3);
  - the provider loads a stored v2 value, persists v3, and writes `jw-habits-v2-backup` exactly once;
  - each new field's bad shapes are rejected as `badShape`.
- [ ] **Step 2:** Run `npx vitest run src/domain src/data`. Expected: FAIL.
- [ ] **Step 3:** Implement. Ids come from `crypto.randomUUID()` with a fallback, since jsdom has it.
- [ ] **Step 4:** Run `npx vitest run`. Expected: all suites PASS, including the existing `storeWriters.test.jsx`.
- [ ] **Step 5:** Commit: `feat(store): v3 with plans, agendas, badges; upgrade from v2`.

### Task 2: Plans domain

**Files:**
- Create: `src/domain/plans.js`
- Test: `src/domain/plans.test.js`

**Interfaces:**
- Consumes: `BOOKS`, `finderUrl` (`bible.js`); `linkLocale` (`links.js`).
- Produces:
  - `createPlan(store, {title, kind, colour, icon, steps}, today): {store, planId}`
  - Generators, each returning `{title, link, note: null, doneOn: null}[]` without ids:
    - `generateChapters(n)` ("Chapter n")
    - `generateLessons(n)` ("Lesson n")
    - `generateBibleBook(book, locale)` ("<Book name> n", linked with `finderUrl(locale, book, n)`)
    - `generateWeekly(n)` ("Week n")
  - Step operations, each pure and returning a new store:
    - `addStep(store, planId, {title, link})`
    - `updateStep(store, planId, stepId, patch)`
    - `moveStep(store, planId, stepId, delta)`
    - `deleteStep(store, planId, stepId)`
    - `setStepDone(store, planId, stepId, day | null)`
  - Plan lifecycle:
    - `archivePlan(store, planId, today)`
    - `restorePlan(store, planId)`
    - `deletePlan(store, planId)`
    - `setActiveStudy(store, planId | null)`
  - `progress(plan): {done, total}`, `nextStep(plan): Step | null`, `isFinished(plan): boolean`, `finishedOn(plan): day | null` (the max `doneOn` once all steps are done).
- Rules:
  - A plan auto-archives when its last step is done.
  - Generators reject n outside 1–200.
  - A plan never exceeds 200 steps (`addStep` refuses and returns the store unchanged).

- [ ] **Step 1:** Write the failing tests:
  - `generateBibleBook(27, 'en')` gives 12 steps "Daniel 1"…"Daniel 12", the first link being `https://www.jw.org/finder?wtlocale=E&prefer=lang&bible=27001001&pub=nwtsty`;
  - `moveStep` with -1 on the first step is a no-op;
  - marking the last step done archives the plan and sets `finishedOn`;
  - `deletePlan` of the active study plan sets `activePlan.personalStudy` to null;
  - a title longer than 60 characters is truncated to 60 by `createPlan`/`updateStep`;
  - inputs are never mutated.
- [ ] **Step 2:** Run `npx vitest run src/domain/plans.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(plans): plan building block, generators, step operations`.

### Task 3: Family agendas and reference cleanup

**Files:**
- Create: `src/domain/agenda.js`
- Test: `src/domain/agenda.test.js`

**Interfaces:**
- Consumes: Task 2; `weekStart`, `addDays` (`day.js`).
- Produces:
  - `agendaFor(store, weekStartDay): AgendaItem[]` — stored items, or the auto-fill preview when none are stored.
  - `autoFill(store, weekStartDay): AgendaItem[]` — the next unscheduled, not-done step of each active (non-archived) family plan, at most 3 plans and 5 items, in plan creation order. Steps placed in any other week's stored agenda count as reserved.
  - `setAgenda(store, weekStartDay, items): store` (caps at 5)
  - `addFreeItem(store, weekStartDay, {title, link})`
  - `removeAgendaItem(store, weekStartDay, itemId)`
  - `planWeeks(today): day[]` — this week's Monday plus the next 8.
  - `pruneAgendas(store, today): store` — drops weeks more than 52 back or 8 ahead.
  - `cleanReferences(store): store` — drops agenda step items whose plan or step no longer exists, and clears a missing `activePlan.personalStudy`. The provider calls `pruneAgendas(cleanReferences(store), today)` after load (wire it in `StoreProvider.jsx`).

- [ ] **Step 1:** Write the failing tests:
  - auto-fill takes the next step of 2 active family plans;
  - a step stored in next week's agenda isn't auto-filled this week;
  - free items survive pruning within range;
  - the 6th item is refused;
  - **Review Focus 1:** after deleting a plan, `cleanReferences` removes its agenda items and clears `activePlan`, and the provider renders Today without throwing.
- [ ] **Step 2:** Run `npx vitest run src/domain/agenda.test.js src/data`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(agenda): weekly family agendas with auto-fill and reference cleanup`.

### Task 4: Check-in effects for study and family worship

**Files:**
- Create: `src/domain/planCheckins.js`
- Test: `src/domain/planCheckins.test.js`

**Interfaces:**
- Consumes: Tasks 1–3; `addCheckIn`, `removeCheckIn` (`store.js`).
- Produces:
  - `checkInStudy(store, day, stepId | null): store` — with a stepId, logs `personalStudy {stepId}` and sets that step's `doneOn = day`; with null, logs `true`.
  - `undoStudy(store, day): store` — removes the entry; clears its step's `doneOn` only if it equals `day`.
  - `checkInFamily(store, day): store` — logs `familyWorship true` and sets `doneOn = day` on every step item in `agendaFor(store, weekStart(day))`.
  - `undoFamily(store, day): store` — the inverse; clears only `doneOn === day`.
  - `todaysStudyStep(store): {plan, step} | null` — the active plan's next step.

- [ ] **Step 1:** Write the failing tests:
  - check-in then undo is a round trip (deep-equal to before);
  - **Review Focus 2:** check in step B, rename and reorder steps, then undo, and step B's `doneOn` is cleared while the others are untouched;
  - a step marked done manually on another day isn't cleared by undo;
  - a family check-in marks exactly that week's agenda steps;
  - the outputs pass `validateStore`.
- [ ] **Step 2:** Run `npx vitest run src/domain/planCheckins.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(plans): study step and family agenda check-ins with exact undo`.

### Task 5: JW Library links and opening

**Files:**
- Create: `src/domain/jwlinks.js`, `src/native/openLink.js`
- Modify: `src/domain/links.js` (the daily-text default uses `dailyTextUrl`)
- Modify: every `window.open(` call that opens a routine, step, scripture or What's New link (find them with `grep -rn "window.open(" src`), so they call `openLink`
- Modify: `package.json` (add `@capacitor/app-launcher` ^8), then `npx cap sync android` (on Windows, do NOT commit `ios/App/CapApp-SPM/Package.swift` changes; add `CapacitorAppLauncher` to Package.swift by hand in the existing forward-slash format)
- Test: `src/domain/jwlinks.test.js`, `src/native/openLink.test.js`

**Interfaces:**
- Produces:
  - `dailyTextUrl(locale, day): string` (the Global Constraints format)
  - `isJwFinderLink(url): boolean` (https, host `www.jw.org` or `jw.org`, path starting `/finder`)
  - `linkLabel(url, t): string` — `t('fd.links.opensInLibrary')` ("Opens in JW Library") for finder links, otherwise the host.
  - `openLink(url): Promise<void>` — native: `AppLauncher.openUrl({url})`, falling back to `window.open(url, '_blank', 'noopener')` if it rejects; web: `window.open`. Never throws.

- [ ] **Step 1:** Write the failing tests:
  - `dailyTextUrl('es', '2026-10-07')` returns `https://www.jw.org/finder?srcid=jwlshare&wtlocale=S&prefer=lang&alias=daily-text&date=20261007`;
  - `routineLink(store, 'dailyText', 'fr')` uses the finder format with today's date;
  - `isJwFinderLink` is true for the user's four example links and false for `https://wol.jw.org/...`;
  - on native `openLink` calls `AppLauncher.openUrl` once, and on a rejection falls back to `window.open`;
  - `grep -rn "window.open(" src` outside `openLink.js` and tests prints nothing.
- [ ] **Step 2:** Run `npx vitest run src/domain/jwlinks.test.js src/native/openLink.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement and reroute the call sites.
- [ ] **Step 4:** Run `npx vitest run && npm run build`. Expected: PASS, and the build succeeds.
- [ ] **Step 5:** Commit: `feat(links): finder daily-text default; open links through the system launcher`.

### Task 6: XP, levels and the garden

**Files:**
- Create: `src/domain/xp.js`, `src/domain/garden.js`
- Test: `src/domain/xp.test.js`, `src/domain/garden.test.js`

**Interfaces:**
- Consumes: Tasks 1–4; `isFinished`/`finishedOn` (Task 2).
- Produces:
  - `xpByDay(store, today): {[day]: number}` — per app day ≤ today:
    - 10 × the log entries that day;
    - 15 × the steps with `doneOn` that day;
    - 100 × the plans with `finishedOn` that day;
    - 25 × the full family weeks whose session was that day (every agenda item's step done on or before the session, and the session logged);
    - the total capped at 100.
  - `totalXp(store, today): number`
  - `levelFor(xp): {level, name, floor, next}` (level 0 is "Seed" from 0 XP; level n's floor is `100·n·(n+1)/2`)
  - `gardenStage(xp): 0..7` (Decision 4)

- [ ] **Step 1:** Write the failing tests:
  - one check-in and one step on a day gives 25;
  - 12 check-ins on a day gives 100 (the cap);
  - `levelFor(99)` is level 0 "Seed" and `levelFor(100)` is level 1 "Sprout";
  - `levelFor(100·8·9/2)` is level 8 "Fruitful Tree 2";
  - **Review Focus 4:** a check-in followed by undo the same day returns the XP to its earlier value;
  - a day with nothing done reduces nothing;
  - `gardenStage(7000)` is 7.
- [ ] **Step 2:** Run `npx vitest run src/domain/xp.test.js src/domain/garden.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(fun): XP with daily cap, levels and garden stages`.

### Task 7: Badges

**Files:**
- Create: `src/domain/badges.js`, `src/native/badgeAwards.js`
- Modify: `src/main.jsx` (call `registerBadgeAwards()` next to the other `register*()` calls)
- Test: `src/domain/badges.test.js`, `src/native/badgeAwards.test.js`

**Interfaces:**
- Consumes: Tasks 2, 6; `totals`, `streak` (`progress.js`); `booksCompleted` (`bible.js`).
- Produces:
  - `BADGES: {id, rule(store, today): boolean}[]` — the 18 ids from Decision 5. Rules:
    - `firstStep`: any step done
    - `firstProject` / `firstFamilyPlan`: a finished study or family plan
    - `familyWeeksN`: N `familyWorship` log weeks
    - `dailyTextN`: N `dailyText` log days
    - `study10`: 10 `personalStudy` entries
    - `plans5`: 5 finished plans
    - `meetings10`: the meetingPrep `streak.current` ≥ 10
    - the book badges: their book range is within `booksCompleted`
    - `firstFullFamilyWeek`: any full family week (Task 6's definition)
    - `level5`: `levelFor(totalXp).level` ≥ 5
  - `newlyEarned(store, today): string[]`
  - `registerBadgeAwards()` — on `onStoreChange`, if `newlyEarned` is non-empty, `update(s => ({...s, badges: {...s.badges, [id]: today}}))` once, then dispatches `window` event `fd-badge` with `{detail: {ids}}`. It never deletes a badge.

- [ ] **Step 1:** Write the failing tests:
  - each rule is true at its threshold and false one below it;
  - earning writes the date once, and a second change doesn't re-write it;
  - **Review Focus 4:** undo that makes a rule false leaves the badge in place;
  - the listener doesn't loop: a single store change triggers at most one `update` from it.
- [ ] **Step 2:** Run `npx vitest run src/domain/badges.test.js src/native/badgeAwards.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(fun): badges awarded once, never revoked`.

### Task 8: Plans tab, plan trail and step sheet

**Files:**
- Create: `src/screens/Plans.jsx`, `src/screens/PlanTrail.jsx`, `src/components/plans/StepSheet.jsx`, `src/components/plans/NewPlanSheet.jsx`, `src/components/plans/PlanIcon.jsx`, `src/theme/planColours.js`
- Modify: `src/components/TabBar.jsx` (Today · Plans · Progress + Settings), `src/App.jsx` (routes `/plans`, `/plans/:planId`)
- Test: `src/screens/Plans.test.jsx`, `src/screens/PlanTrail.test.jsx`

**Interfaces:**
- Consumes: Tasks 2, 5; `useStore`.
- Produces:
  - `PLAN_COLOURS`: 8 hex values, each ≥ 4.5:1 for white text, and paired text shades ≥ 4.5:1 on light and dark backgrounds (reuse `accentText`'s method).
- **Plans screen** has three sections:
  - Study projects (active, waiting, "New project");
  - Family worship (a link to the weeks view from Task 9, and the family plans list);
  - the Completed shelf.
- **NewPlanSheet:** title, kind, colour, icon, a generator (chapters / lessons / Bible book picker / weekly, with N) or blank.
- **PlanTrail** draws steps as stops on an SVG path:
  - done stops are filled with the plan colour;
  - the next stop glows (respects reduced motion);
  - a stop opens the StepSheet: title, link (with `linkLabel`, open via `openLink`), note, Done/Undone, Move up/down, Delete.
- Copy in `fd.plans.*`.

- [ ] **Step 1:** Write the failing tests:
  - creating "Daniel" via the Bible-book generator lists it with "0 of 12";
  - opening a stop and pressing Done gives "1 of 12";
  - the trail has 12 stops with `aria-label`s "Daniel 1, done" / "Daniel 2, next" / "Daniel 3, not yet";
  - the tab bar shows Plans with `aria-current` on `/plans`;
  - the colour contrast test passes for all 8 colours in both modes.
- [ ] **Step 2:** Run `npx vitest run src/screens/Plans.test.jsx src/screens/PlanTrail.test.jsx src/components`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(plans): Plans tab, plan trail and step editing`.

### Task 9: Family worship weeks

**Files:**
- Create: `src/screens/FamilyWeeks.jsx`
- Modify: `src/App.jsx` (route `/plans/family`)
- Test: `src/screens/FamilyWeeks.test.jsx`

**Interfaces:**
- Consumes: Tasks 3, 5, 8.
- Behaviour:
  - Lists this week plus the next 8 weeks (`planWeeks`). Each shows its agenda: a stored list, or an auto-fill preview labelled "Suggested".
  - Each week has: "Keep" (stores the preview), add a free item (title + optional link), remove an item, and a step picker from family plans.
  - Past weeks show what was done (read-only).

- [ ] **Step 1:** Write the failing tests:
  - with 2 family plans, next week shows 2 suggested items;
  - "Keep" stores them, and the following week's suggestions advance;
  - adding a free item with a non-https link shows the inline error;
  - the 6th item's add button is disabled.
- [ ] **Step 2:** Run `npx vitest run src/screens/FamilyWeeks.test.jsx`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(family): plan family worship 8 weeks ahead`.

### Task 10: Today rows for projects and family agendas

**Files:**
- Modify: `src/screens/Today.jsx` and the components it uses for the personalStudy and familyWorship rows
- Create: `src/components/plans/SomethingElseSheet.jsx`
- Test: `src/screens/Today.test.jsx` (extend)

**Interfaces:**
- Consumes: Tasks 4, 5, 8.
- **Personal study with an active project:**
  - the row shows the plan icon and colour, the plan title, the next step title, and a link button;
  - hold-to-check runs `checkInStudy(day, nextStep.id)`; undo runs `undoStudy`;
  - a "Did something else" text button opens a sheet listing the plan's undone steps plus "Just log a session" (`checkInStudy(day, null)`).
- **With no project:** v5.0 behaviour.
- **Family worship on its due day:** shows the agenda items (titles with link buttons); hold-to-check runs `checkInFamily`; undo runs `undoFamily`.
- **When a check-in finishes a plan,** show the existing celebration plus "Project finished" copy. If waiting study projects exist, offer "Start next project" with a picker; choosing one calls `setActiveStudy`. Add a test: finishing the last step with one waiting project shows the offer, and accepting makes it active.

- [ ] **Step 1:** Write the failing tests:
  - with active "Daniel" (0 of 12), Today shows "Daniel · Daniel 1", and holding gives "1 of 12" and a log `{stepId}`;
  - "Did something else" → "Just log a session" logs `true`, with no step done;
  - the family row lists 2 agenda items, and the check-in marks both steps done;
  - copy contains no banned words.
- [ ] **Step 2:** Run `npx vitest run src/screens/Today.test.jsx`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(today): project step and family agenda rows`.

### Task 11: Fun layer UI — garden, XP, levels, badges, celebrations, settings

**Files:**
- Create: `src/components/fun/Garden.jsx` (original inline SVG, 8 stages, plant kinds by level, blooms per badge), `src/components/fun/LevelBar.jsx`, `src/components/fun/Confetti.jsx`, `src/components/fun/BadgeToast.jsx`, `src/screens/Badges.jsx`
- Modify: `src/screens/Progress.jsx` (garden, level bar, badges link), `src/screens/Today.jsx` (a small sprout), `src/App.jsx` (route `/progress/badges`; mount `BadgeToast`), `src/components/settings/` Look section (toggles `showGameLayer`, `showShare`)
- Test: `src/screens/Progress.test.jsx` (extend), `src/screens/Badges.test.jsx`, `src/components/fun/*.test.jsx`

**Interfaces:**
- Consumes: Tasks 6, 7.
- **Behaviour:**
  - The level bar shows "Sapling · Level 3" and "X / Y XP".
  - Crossing a level shows a celebration once per level (session flag `fd-level-<n>`).
  - `BadgeToast` listens for `fd-badge`.
  - Confetti is skipped under `prefers-reduced-motion`.
  - With `showGameLayer: false`, XP and level are hidden; the garden shows without its level label; badges stay.
- Copy goes in `fd.fun.*`, with level names under `fd.fun.levels.*`.

- [ ] **Step 1:** Write the failing tests:
  - Progress shows "Seed · Level 0" for a new store;
  - with 100 XP it shows "Sprout";
  - with `showGameLayer: false`, no "XP" text renders;
  - the badges screen lists earned badges with dates and unearned ones as "Not yet";
  - an `fd-badge` event shows a toast naming the badge;
  - Garden renders stage 0 and stage 7 with distinct `aria-label`s ("Your garden: a seed" / "Your garden: a fruitful tree").
- [ ] **Step 2:** Run `npx vitest run src/screens src/components/fun`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(fun): garden, levels, badges collection, celebrations and toggles`.

### Task 12: Share cards

**Files:**
- Create: `src/share/cards.js` (canvas drawing), `src/share/cardCopy.js` (pure copy builders), `src/native/shareCard.js`, `src/components/fun/ShareButton.jsx`
- Modify: share buttons on the plan-finished celebration, `Badges.jsx` items, Progress cards (streak/totals and garden/level) and the Sunday wrap-up (`WrapUpCard.jsx`, only when the app day is a Sunday)
- Test: `src/share/cardCopy.test.js`, `src/share/cards.test.js`, `src/native/shareCard.test.js`

**Interfaces:**
- Produces:
  - `cardCopy(kind: 'milestone'|'garden'|'weekly'|'streak', data, t): {title, lines: string[]}` — pure, uses `fd.share.*`.
  - `drawCard(canvas, {kind, copy, colour, gardenStage}): void` — 1080×1350. Titles wrap at most 3 lines, then truncate with "…"; each line is truncated to fit.
  - `shareCard(blob, fileName): Promise<void>` — native writes base64 to `Directory.Cache` via `@capacitor/filesystem` and calls `Share.share({files: [uri]})`; web downloads. A user cancel isn't an error (reuse `isShareCancel`).
  - `ShareButton` renders nothing when `store.showShare` is false.

- [ ] **Step 1:** Write the failing tests:
  - milestone copy for "Gospels" is "Finished reading the Gospels! 📖";
  - weekly copy includes "daily text 6 days" when 6 dailyText entries exist that week;
  - for every kind, a store whose steps carry notes `NOTE-SECRET` and links `https://example.org/x` produces copy without either string;
  - copy contains no banned words;
  - **Review Focus 5:** `drawCard` with a 60-character emoji title doesn't throw, and its measured text width per line is ≤ 1080 − 2×margin (mock canvas `measureText`);
  - `shareCard` on native calls `Share.share` with one file;
  - with `showShare: false`, no share button renders.
- [ ] **Step 2:** Run `npx vitest run src/share src/native/shareCard.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement. Use an `OffscreenCanvas` when available, otherwise a detached `<canvas>`, then `toBlob('image/png')`.
- [ ] **Step 4:** Run `npx vitest run && npm run build`. Expected: PASS, and the build succeeds.
- [ ] **Step 5:** Commit: `feat(share): encouragement share cards via the share sheet`.

### Task 13: Writers, journeys and docs

**Files:**
- Modify: `src/storeWriters.test.jsx` (add every new writer: plan create/edit/delete, steps, agendas, study and family check-in and undo, badge award, toggles)
- Modify: `scripts/verify/journeys.cjs` (the spec §4 journeys)
- Modify: `docs/release-checklist.md` (links open JW Library vs browser; share sheet with a card)
- Modify: `CLAUDE.md` (store v3 fields, the Plans tab, the fun layer and its guardrails, `openLink`, `registerBadgeAwards`, test count), `README.md`
- Modify: `package.json` and `android/app/build.gradle` and `ios/App/App.xcodeproj/project.pbxproj` version → 5.1.0 / 510

- [ ] **Step 1:** Extend the writers test, then run `npx vitest run src/storeWriters.test.jsx`. Expected: PASS (falsify once by breaking one writer and confirming it fails).
- [ ] **Step 2:** Run `npm run build`, start `npx vite preview --port 4173` in the background, run `npm run journeys`, then stop the preview. Expected: all journeys pass, exit 0.
- [ ] **Step 3:** Run `npx eslint src && npx prettier --check --end-of-line auto "src/**/*.{js,jsx,json,css}" && npm audit --audit-level=high`. Expected: clean.
- [ ] **Step 4:** Commit: `docs: v5.1 plans, fun layer and sharing; journeys and checklist`.
