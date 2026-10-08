# Capability map: prepare ahead and personal memory

Cameron approved end-to-end work on 2026-10-08. The current contract is
[feature/UI reconciliation](docs/feature-ui-reconciliation.md). This supersedes
the draft same-key v4 rollout; existing version-3 routine data remains compatible.

| Module | Current responsibility/status | Depends on |
|---|---|---|
| workspace-v1 | Separate validated notes, meetings and assignments; conflict detection, durable acknowledgement and recoverable combined backups | Existing durable adapter and routine store |
| local-memory | Note creation/edit/deletion, tags, links and optional day/plan/step/meeting/assignment context | workspace-v1 |
| local-search | Note text and tag search implemented; searching other record types remains open | local-memory |
| meeting-parts | Explicitly dated midweek/weekend preparation using generic section labels | workspace-v1 |
| assignment-plans | Dated personal assignments and preparation checklists; no fabricated activity | workspace-v1 |
| prepare-board | Preparation link under Plans; Notes tab; current study/family plans retained | meeting-parts, assignment-plans |
| reading-ahead | Remaining: pace comparison with extra chapters dated on the day actually read | Existing reading/day/schedule logic |
| native-capture | Remaining after first-device verification: bounded Android/iOS pending share transport, preview and save-before-ack replay protection | local-memory, native storage and signing |

No accounts, cloud sync, congregation programme, publication body imports or
remote indexing. Notes survive deletion of linked context. A fully prepared
meeting never writes a Today check-in. Native signing/App Groups, physical-device
share tests and meeting finder validation remain explicit gates. Compilation is
not device certification.
