# Capability map: prepare ahead and personal memory

Scope for #263 and #264, following the shipped v5.1 plans. Cameron's
2026-10-08 instruction to keep working, following presentation of this map,
authorizes continuing from these boundaries and build order. Module-specific
specifications remain separate review gates. Existing v5.1 app/release fixes
are independent of this map.

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

## Specification index

| Module | Specification | Status |
|---|---|---|
| store-v4 | [SPEC-store-v4.md](SPEC-store-v4.md) | Draft for human review; no schema change implemented |
| local-memory | Not written | Depends on the store-v4 boundary contract |
| meeting-parts | Not written | Depends on the store-v4 boundary contract |
| assignment-plans | Not written | Depends on the store-v4 boundary contract |
| reading-ahead | Not written | Existing reading/catch-up semantics need a focused spec |
| local-search | Not written | Depends on approved searchable record contracts |
| native-capture | Not written | Depends on durable save acknowledgement and physical-device gates |
| prepare-board | Not written | Depends on approved preparation and ahead semantics |

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
