# Device release results — copy for an actual run

Status: UNTESTED. This blank template proves no installation, processing or acceptance.
Owner: Cameron / device tester. Parent #251; use the current [release checklist](release-checklist.md).

## Build identity

| Field                                                         | Actual value |
| ------------------------------------------------------------- | ------------ |
| Date/tester alias (no private identity)                       | UNRECORDED   |
| Source commit and clean exact-candidate CI run                | UNRECORDED   |
| Artifact filename / SHA-256                                   | UNRECORDED   |
| Package/bundle ID / version / build                           | UNRECORDED   |
| Signing identity verified by owner (public fingerprint only)  | UNRECORDED   |
| Track and console processing evidence                         | UNRECORDED   |
| Physical model / OS / Android WebView                         | UNRECORDED   |
| Timezone / local clock / 03:00 app day                        | UNRECORDED   |
| Notifications permission / quiet hours / battery restrictions | UNRECORDED   |
| Locale / theme / text size / AT                               | UNRECORDED   |
| Fresh QA install or retained-data upgrade                     | UNRECORDED   |

Use an app-scoped fabricated QA dataset and retain its recovery copy before
upgrade/failure drills. Never include signing material, backups containing real
private content or personal participant identities in a public issue.

## Results

Create **one row per checkbox**, including each platform/widget variant, in the
checklist; split combined steps when outcomes differ. Reference N1–A1/C1–C4 for
v5.2; use section and exact checkbox text for existing checks. Do not infer an
entire section passes from one successful example. Native capture remains BLOCKED
until its prerequisite and implementation are complete.

| Checklist item / platform         | PASS / FAIL / UNTESTED / BLOCKED | Actual steps and observed result             | Redacted evidence / time | Existing issue / next action |
| --------------------------------- | -------------------------------- | -------------------------------------------- | ------------------------ | ---------------------------- |
| 0: exact-source compile           | UNTESTED                         |                                              |                          | #245                         |
| 0: signed artifact/install        | UNTESTED                         |                                              |                          | #174/#251                    |
| N1: offline note relaunch         | UNTESTED                         |                                              |                          | #264                         |
| P1: dated meeting preparation     | UNTESTED                         |                                              |                          | #263                         |
| B1: combined backup round-trip    | UNTESTED                         |                                              |                          | #195/#264                    |
| A1: physical assistive technology | UNTESTED                         |                                              |                          | #176                         |
| C1–C4: native capture             | BLOCKED                          | Signed-device baseline and transport pending |                          | #264                         |

For FAIL: include expected vs actual, reproducibility, affected build/device,
severity and recovery outcome using fabricated records. For BLOCKED: name the
owner/dependency and exact resume condition. For PASS: include the actual observation
and evidence; an automation result is labelled automation and cannot replace a device row.

## Decision (all fields initially pending)

- Remaining failures, untested variants and owner-approved deferrals: PENDING.
- Next action / owner / resume condition: PENDING.
- Physical baseline accepted for starting native capture: PENDING.
- Household pilot accepted: PENDING; separate #252 observations required.
- Store testing eligibility: PENDING; actual console requirement/outcome required.
- Release recommendation and approving owner/date: PENDING.

A passing device run permits a review recommendation, not an upload, submission,
listing publication or issue closure without its applicable authorization and criteria.
