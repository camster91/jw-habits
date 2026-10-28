# Faithful Days commitments

`CLAUDE.md` is the canonical code/state reference. This ledger controls current work; July audits and older generic-habit plans are historical evidence. Owner: Cameron / Ashbi Design. Revisit at every release.

| Commitment | Status | Evidence / next gate |
|---|---|---|
| Local routines, reading, schedules, onboarding, backup | Shipped | v5.0; pure domain and provider tests |
| Study/family projects, agendas and trails | Shipped | #262 / #266, v5.1 |
| Garden, badges, optional levels, local PNG sharing | Shipped | #266; web smoke and responsive journeys |
| Privacy/support pages and local diagnostic controls | Shipped | #247 / #171; deployed HTTPS pages |
| Node/tooling alignment and dependency maintenance | Shipped | #169 / #260; Node 22 baseline, portable smoke launcher, storage warnings, no unused TS configuration; dependency PRs merged |
| Native compile and widget integration | Active | #243–#245 / #258; compilation plus physical-device check-ins required |
| Store listing and signed distribution | Blocked | #246 / #248–#254 / #261; Apple/Play owner accounts, signing, device QA and pilot evidence |
| Old Android signing incident | Blocked | #132: Play owner/password-manager access; #133 cannot begin until replacement key is active and collaborators are coordinated |
| Repository governance | Active | #175: contribution contract and PR template; administrator ruleset still absent |
| Component/migration test gates | Shipped | #136 / #269; coverage failure probe, multi-zone 03:00 rollover (worker and Docker drills retired with the website) |
| Accessibility, browser/offline upgrades and performance | Active | #176 / #177 / #181 / #192 / #197; automated coverage plus manual assistive-technology evidence |
| Initial release language | Shipped | #259: English-only UI/document language; legacy language preferences preserved |
| French/Spanish app UI | Deferred for initial release | Cameron / #46; revisit after current store release and fluent review; native widget chrome is separately localized |
| Human usability/household research | Blocked | #199 / #252: recruit consenting participants; do not fabricate results |
| Prepare ahead and assignments | Active | #263; dated meeting preparation and assignment checklists implemented in v5.2; year-plan pace comparison and actual activity dates implemented; device validation remains |
| Second brain / capture | Active | #264; local notes/tags/search implemented in v5.2; native share extension after device verification |
| Retire live web app | Shipped (5.3.0) | Website, PWA, deploy and monitoring removed 2026-10-28; privacy and support pages on GitHub Pages. Owner VPS/DNS cleanup remains |
| Phone-only 5.3.0: What's new routine, Dates card, backup reminder, iOS privacy manifests | Shipped in code | Store v4; device verification and store submission remain gates |
| jw.org Terms of Use review | Active | [terms checklist](terms-checklist.md); DeveloperSupport@jw.org decision is the owner's |
| Remote accounts, sync, analytics, congregation content | Deferred | No authorization/product contract; revisit only with an explicit privacy-reviewed spec |
| Earlier Goals / Service / Dashboard / Reading-tab promises (#39–#43) | Superseded | Current v5 product contract: Today, Plans and Progress; ministry and reading are routines, goals are not revived implicitly |
| Earlier 1,100-line Home / midnight notes / calendar bars | Superseded | Home removed; current store persists history and rolls app days at 03:00; reading map reflects recorded chapters |

A “Shipped” web feature does not imply native/store certification. Broad tracking issues #184/#185/#200/#201/#239/#261 stay open until their remaining linked gates pass. Historical snapshots are retained rather than rewritten as current claims.

Current automated validation contracts: [quality gates](quality-gates.md). Native capture is tracked separately in #264. The `/share` preview was removed with the PWA.

Store copy/current UI generation and outstanding account/device declarations: [store release pack](store-release-pack.md). Current #263/#264 module boundaries are recorded in [capability map](../CAPABILITY-MAP.md).
