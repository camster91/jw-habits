# Capability map: prepare ahead and personal memory

Proposed scope for #263 and #264, following the shipped v5.1 plans. This is a
reviewable module map; module specifications and implementation have not yet
been approved. Existing v5.1 app/release fixes are independent of this map.

Assumptions: user-written content only; local storage and JSON backup; no
accounts, cloud sync, imported publication text or automatic third-party
fetches. Notes may refer to a day, plan, step or meeting. The existing frozen
`jw-habits-v2` storage key remains. A schema upgrade preserves the original v3
bytes separately from the existing v2 rollback copy. Notes/search are reached
through a Notes tab; preparation stays under Plans.

| Stable module id | Responsibility | Depends on |
|---|---|---|
| store-v4 | Validated notes, meeting-part records and dated assignment references; safe v3/v2 upgrades and backup round-trip | Existing pure store, provider and backup |
| local-memory | Create/edit/delete user notes, tags and safe links; contextual day/plan/step/meeting references; quick capture | store-v4 |
| meeting-parts | Dated midweek/weekend part checklists using generic labels; next/current/following week views; no workbook content | store-v4, existing schedules |
| assignment-plans | Dated student part/talk/reading/demonstration plans; family/ministry preparation uses existing plan steps | store-v4, existing plans |
| reading-ahead | Derive clearly labeled days ahead from recorded chapters and the selected reading schedule; extra reading remains dated today | Existing Bible/day/schedule logic |
| local-search | On-device search over notes, tags, plan titles/step notes and meeting preparation; no remote indexing | local-memory, meeting-parts, assignment-plans |
| native-capture | Android text/link share intent and iOS share extension; preview/edit before saving; bounded pending payload queue with acknowledgement | local-memory, store-v4 |
| prepare-board | Plans entry points and ahead summaries; compatible Today check-ins; existing week link; meeting finder enabled only after real device test | meeting-parts, assignment-plans, reading-ahead |

Build order: store-v4 → local-memory, meeting-parts, assignment-plans and
reading-ahead → local-search and prepare-board → native-capture.

Provider boundaries own validation and persistence; UI modules never write raw
storage. Search consumes records and never changes them. Native capture owns
only pending payload transport; the app owns final note validation/save and
acknowledges a payload only after durable storage. Generic meeting parts do
not invent completed routine days or copy third-party content. No dependency
points back into a consumer.

Review decisions: module boundaries/build order; Notes navigation; v4 fields
and pre-upgrade backup policy; how a fully prepared meeting affects the
existing meeting check-in; reading-ahead semantics for pace changes and Bible
wraparound; capture retention, size limits and deletion. Native signing,
App Groups, physical-device share tests and `alias=meetings` verification
remain explicit release gates.
