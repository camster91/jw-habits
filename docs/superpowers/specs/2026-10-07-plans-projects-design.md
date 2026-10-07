# Faithful Days — Plans, projects, fun layer and sharing (v5.1)

**Status:** design approved in conversation 2026-10-07; written spec awaiting review.
**Builds on:** `2026-10-06-faithful-days-design.md` (v5.0, merged in #242).
**Research:** `reports/JW Library deep linking.md` (2026-10-07), kept outside the repo.

## 1. Intent

**What the owner asked for**
- Make the app feel like **"a second brain for JWs"**: plans, preparation and links in one place.
- **Personal study** isn't clear today. Define what it tracks and expand it.
- **Family worship**: add links, build plans for reference, and expand study features without breaking jw.org's terms of use.
- **Meeting prep and other preparation**: get ahead, part by part, into the next week. (This is project 1, below.)
- **More colour and fun, and gamify**, including points, XP and levels.
- **Social sharing** to celebrate what you did.

**Decomposition (agreed).** Three projects, each with its own spec, plan and build:
1. **Prepare ahead:** meeting parts by week; assignments with dates; Bible reading ahead; family worship and field ministry prep. *Separate spec.*
2. **Plans and projects:** this spec. Personal study projects, family worship plans and agendas, the shared Plan building block, links, the fun layer and sharing.
3. **Second brain:** notes on anything, tags, search, quick capture and receiving shares. *Separate spec.* It builds on this project's Plan block.

**Assumptions (agreed)**
- Everything stays on the device. Export/import is the only backup.
- The app never fetches or bundles jw.org content. It stores the user's own words, Bible references and links, and opens JW Library or jw.org to read.
- It complements JW Library, which already has highlights, notes and tags inside publications. Faithful Days covers planning and progress across publications.

**Success criteria**
1. Personal study shows *what* is being studied ("Daniel · Chapter 6") and *how far* ("5 of 12").
2. A family can plan the next 8 weeks of family worship, with links, and check in each week from an agenda that fills itself.
3. Links open JW Library when it is installed and jw.org when it isn't.
4. The fun layer works: plan colours and trails, garden, XP and levels, badges and share cards. No guilt mechanics, and it can be hidden.
5. A v2 store migrates to v3 losslessly. All existing streaks and history are unchanged.

## 2. Product design

### 2.1 The Plan building block

- **Plan:** `{id, title, kind: 'study' | 'family', colour (0..7), icon, steps[], createdOn, archivedOn | null}`.
- **Step:** `{id, title, link | null, note | null, doneOn | null}`. A step is done when `doneOn` is set. Notes are at most 280 characters (longer notes belong to project 3).
- **Generators** (all titles generic or the user's own; no publication titles are bundled):
  - "Chapters 1–N" (titles "Chapter n"; N from 1 to 200)
  - "Lessons 1–N"
  - "Bible book by chapter": pick a book. One step per chapter, titled "Daniel 1", each linked with a finder Bible link.
  - "Weekly × N" (titles "Week n")
  - Manual: add, rename, reorder (drag or up/down buttons), delete, and attach or edit a link or note.
- **Progress:** "N of M", the next step highlighted, and completed plans moved to a **Completed shelf** (archived, read-only, can be restored).
- **Icons:** a curated set — book, scroll, lamp, mountain, seedling, dove, sun, path. Original line icons; nothing resembling jw.org marks.

### 2.2 Personal study → projects

- Plans of kind `study` are **projects**. At most **one is active** (`activePlan.personalStudy`); the others are listed as "waiting".
- **Today row** with an active project:
  - shows the project's icon and colour, its title, the next step's title, and an open-link button when the step has a link;
  - **hold-to-check** writes the usual `personalStudy` log entry (a session counts towards the weekly target) **and** marks the next step done (`doneOn = today`);
  - **"Did something else"** (a small text button) opens a sheet: tick a different step, or "Just log a session". Undo reverses exactly what the check-in did.
- No active project: the routine behaves as it does in v5.0 (session only).
- When the last step is done, the project is completed: celebration, Completed shelf, and the "next project" prompt offers a waiting project.

### 2.3 Family worship → plans and weekly agendas

- Plans of kind `family` feed the **weekly agenda**: 1–5 items for each Monday–Sunday week.
  - An item is either a **plan step** (`{kind: 'step', planId, stepId}`) or a **free item** (`{kind: 'free', title, link | null}`).
- **Auto-fill:** when a week's agenda is first viewed and is empty, it fills with the next not-yet-scheduled step of each active family plan (at most 3 plans). The user can edit any week.
- **Plan ahead:** the Family worship screen shows the current week plus the next **8 weeks**. Each can be edited now; a step placed in a future week is reserved so auto-fill skips it.
- **Today:** on the family worship day (existing schedule), the row shows the agenda items, each with its link. Hold-to-check marks the session done (existing log entry) and sets `doneOn` on the agenda's plan steps. Undo reverses it.
- Existing family worship streaks, grace and due rules are unchanged.

### 2.4 Plans tab

The tab bar gains **Plans** (Today · Plans · Progress · Settings).

The Plans screen has:
- **Study projects:** active, waiting, and "New project".
- **Family worship:** the weeks view (this week plus 8 ahead) and the family plans.
- **Completed shelf**.

The plan screen is the **trail**: steps as stops along a winding path, done stops filled with the plan colour, the next stop glowing, and each stop opening a step sheet (title, link, note, mark done or undone).

### 2.5 Links

- One module, `src/domain/jwlinks.js`, builds and recognises links:
  - **Daily text:** `https://www.jw.org/finder?srcid=jwlshare&wtlocale={E|S|F}&prefer=lang&alias=daily-text&date=YYYYMMDD` (date without dashes). This **replaces** the v5.0 wol.jw.org daily-text default, because wol.jw.org links never open JW Library.
  - **Bible chapter:** the existing `finderUrl` (`bible=BBCCC001`, verse 001; `pub=nwtsty`).
  - **Meetings:** keep the v5.0 wol.jw.org week link (always works, browser only). A finder `alias=meetings` "Open in JW Library" option is *not* added until a device test confirms JW Library handles it.
  - **Recognising a link:** a pasted `https://www.jw.org/finder?...` link (e.g. JW Library's share link) is labelled "Opens in JW Library". Any other https link is labelled with its host. Non-http(s) links are rejected (existing rule).
- **Opening:** through `@capacitor/app-launcher` `openUrl` (new dependency). The OS then hands finder links to JW Library when installed, or to the browser. Web build: `window.open`.
  - Never use `@capacitor/browser` for these: it never hands off to apps.
  - Never add jw.org to `server.allowNavigation`.
- **Terms of use:** the app never fetches jw.org pages or APIs. docids come only from links the user pastes.

### 2.6 The fun layer

**Owner decision (amends v5.0 spec §2.2):** points, XP and levels are allowed, with these guardrails. The research caveat — expected rewards can reduce people's own motivation — is recorded in v5.0 §2.2 and stands as context.

- **Colour:** each plan has one of 8 colours, and colour is used generously on the Plans screen and trails. Text contrast follows the existing `--fd-accent-text` rule (≥ 4.5:1).
- **XP**
  - Earned for a routine check-in (10), a plan step done (15), a plan finished (100), and a full week of family worship with every agenda item done (25).
  - **Capped at 100 XP per app day.**
  - **Never decreases**: undo removes the XP that action added, but missed days, grace and settings changes cost nothing.
  - **No spending, no shop, no leaderboards, no comparison.**
- **Levels:** level *n* needs `100·n·(n+1)/2` total XP (100, 300, 600, 1,000…). Garden names in order: Seed, Sprout, Seedling, Sapling, Young Tree, Flourishing Tree, Cedar, Fruitful Tree; beyond these, "Fruitful Tree n". Progress shows a level bar; reaching a level shows a short celebration.
- **Garden:** an original illustration on Progress, plus a small sprout on Today.
  - Grows in stages with total XP, and plant kinds unlock by level.
  - Blooms appear for badges.
  - **It never wilts or dies.** Missed days only pause growth.
- **Badges** (~20, descriptive, never lost). Examples:
  - First step
  - First project finished
  - First family plan finished
  - 4 / 12 / 52 weeks of family worship
  - 30 / 100 / 365 days of daily text
  - The Pentateuch, the Gospels, the Greek Scriptures, the whole Bible (from the Bible-book map)
  - 10 meetings prepared in a row

  Each badge has a rule. It is earned the first time the rule holds, and its earn date is stored once. A toast shows when one is earned. Badges have their own collection screen.
- **Celebrations** use the existing haptics, a confetti animation (respects `prefers-reduced-motion`), and the encouragement tone setting.
- **Hide:** Settings → Look & feel → "Show points and levels" (default on). When off, XP, level and the garden's level label are hidden. Badges, colours and trails stay.

### 2.7 Sharing

- **Cards** are 1080×1350 PNGs drawn on an offscreen canvas in the app:
  - **Milestone:** a badge, a finished plan, or a reading milestone.
  - **Garden and level:** the garden plus the level name.
  - **Weekly recap:** offered from the Sunday wrap-up.
  - **Streak / totals:** for one routine.
- **Wording:** encouragement first, e.g. "Finished reading the Gospels! 📖", "A good week · daily text 6 days · 12 chapters · family worship ✓". Numbers appear only where the milestone is a count. No comparisons. All copy lives in en.json (`fd.share.*`) and follows the copy rule (never missed/broke/failed/lost).
- **Never on a card:** step or plan notes, links, jw.org text or logos, or "JW". Routines and plans appear under their display label (a custom label if the user set one). Scripture appears only as a reference.
- The card carries the app icon and "Faithful Days", small.
- **Flow:** Share buttons appear on celebration screens, in the Badges collection, on Progress cards and in the Sunday wrap-up. The card is drawn, written to the cache folder with `@capacitor/filesystem`, and passed to `@capacitor/share`. Web: download. Nothing is uploaded and nothing is shared without a tap.
- **Hide:** Settings → "Show share buttons" (default on).

## 3. Data and architecture

**Store v3**, migrated from v2 on first launch.
- The v2 store is kept under `jw-habits-v2-backup` for one release.
- `validateStore` accepts v3. `importJson` accepts v2 and v3, upgrading v2.
- **New top-level fields:**
  - `plans: Plan[]`
  - `activePlan: {personalStudy: string | null}`
  - `familyAgendas: {[weekStartDay]: AgendaItem[]}` (at most 5 items)
  - `badges: {[badgeId]: day}`
  - `showGameLayer: boolean`
  - `showShare: boolean`
- **Migration:** a non-empty v2 `studyTopic` becomes a study project with that title and no steps, set as active. `studyTopic` is removed. Everything else is carried over unchanged.
- **Validation:**
  - plan and step ids are unique strings;
  - titles are 1–60 characters, notes ≤ 280, links pass the existing safe-https rule;
  - colour is 0–7, icon is in the curated set;
  - agenda keys are Monday days, and agenda items reference existing plans and steps (dangling references are dropped on load, never fatal);
  - badge ids are known and their dates are days.

**Calculated, never stored:**
- XP from log entries and steps' `doneOn`, with the daily cap;
- the level;
- the garden stage;
- whether each badge's rule currently holds.

Only the badge earn date is stored.

**New modules:**
- `src/domain/plans.js`: generators, step operations, progress, next step.
- `src/domain/agenda.js`: auto-fill, reservations, week checks.
- `src/domain/xp.js`: XP, cap, levels.
- `src/domain/badges.js`: rules and earning.
- `src/domain/garden.js`: stages.
- `src/domain/jwlinks.js`: building, recognising and opening links.
- `src/share/cards.js`: canvas drawing.
- `src/native/shareCard.js`: file and share sheet.
- Screens: `src/screens/Plans.jsx`, `PlanTrail.jsx`, `FamilyWeeks.jsx`, `Badges.jsx`.

**New dependency:** `@capacitor/app-launcher` (^8).

## 4. Testing

- **Unit:**
  - v2 → v3 migration (with and without studyTopic) and v2 import;
  - each generator;
  - step done/undo through check-ins;
  - "Did something else";
  - agenda auto-fill, reservations, and dangling-reference cleanup;
  - XP per action, the daily cap, and that missed days never reduce XP;
  - level thresholds and names;
  - each badge rule, and that its earn date is stored once;
  - garden stages;
  - link builders for en/es/fr;
  - link recognition;
  - card copy for each card kind, and that no notes or links appear on any card;
  - every new writer's output passes `validateStore`.
- **Journeys:**
  - create a project from "Bible book by chapter", check in a step on Today and see "1 of N";
  - plan next week's family agenda, then check in the session on the family day;
  - earn the first badge and see the toast;
  - hide the game layer;
  - press the share button (the share call receives a PNG).
- **Device checklist additions:**
  - links open JW Library when installed, and the browser when not;
  - the share sheet opens with the card on iOS and Android.

## 5. Open risks

- **Points and levels** may reduce intrinsic motivation, as the research warned. Mitigated by the guardrails and the hide switch. Watch pilot feedback (issue #252).
- **Sharing spiritual activity** may feel uncomfortable to some users. Mitigated by encouragement-first copy, sharing only on a tap, and the hide switch.
- **JW Library hand-off** is untested on devices (research), and the `jwlibrary:` scheme is not used. The fallback is the browser.
- **Store size:** plans and agendas grow the store. Capped by limits (≤ 200 steps per plan; agendas kept 8 weeks ahead and 52 weeks back, older weeks pruned).
