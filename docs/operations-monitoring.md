# Production monitoring and restore gates

The `Production metadata monitor` workflow checks every six hours and supports
manual dispatch. It reads the last successful deployment's retained publication
record, then checks trusted HTTPS, certificate expiry (at least 14 days), title,
exact revision, PWA manifest/service worker and public privacy/support pages.
It stores metadata only and never accesses a device's routines, notes or backups.
Incorrect revisions, HTTP failures and expired/near-expiry TLS fail the workflow.

Operations owner: Cameron / Ashbi Design. Alert surface: failed GitHub Actions
runs. Account email/mobile notification preferences and receipt of a controlled
alert need owner verification; a green test is not proof of alert delivery.
The deployment artifact has a 90-day retention period. Missing/expired records
fail visibly rather than silently accepting arbitrary public versions. Renew
records through a verified deployment before expiration.

A manual VPS rollback intentionally changes the served revision. The monitor
will report that difference until an operator records an approved deployment
of that revision through the deploy workflow. It never auto-redeploys or changes
traffic. See [production recovery](production-recovery.md) for local rollback.

## Proposed recovery objectives (owner review required)

- Server configuration/artifact recovery: RTO 60 minutes; config RPO 24 hours.
- Retain current and previous digests on the VPS and at least three successful
  GHCR release digests, with no automated pruning until ownership is verified.
- Encrypted off-host copies of edge config, compose, firewall/SSH config and
  signing-key escrow; access restricted to authorized owners.
- Quarterly clean-host restore rehearsal using an isolated target, plus one
  after an edge/deployment architecture change.
- Device-local user data has no server RPO guarantee. Users control export,
  import, OS backup and deletion; uninstalling/clearing app storage can lose it.

The objectives are proposals, not performed backup/restore or key-escrow claims.
#179 remains open for recoverable configuration/key copies, clean-host drill,
owner approval and actual alert receipt. #132/#133 retain their separate signing
incident gates. Existing unit failure-path tests and isolated Docker rollback
checks are complementary evidence, not a clean-host restore.
