# iOS signing and TestFlight approval

Prepared for #174/#248. No workflow was dispatched, build signed, artifact uploaded, profile changed or TestFlight submission made during local preparation.

## Three execution paths

Manual `skip_upload: true` runs preflight and unsigned simulator app/widget compilation. It reads no signing/upload secrets and uses no protected release environment. It is compilation evidence only.

Manual `skip_upload: false` (default) requests the separate `ios-signing` archive stage. Manual `upload: false` (default) retains the candidate without requesting TestFlight upload. Explicit `upload: true` additionally requests the `testflight-upload` stage. Version tags do not trigger this workflow; release execution is manual only.

Signed paths require exact-source web/browser/native checks from the expected Actions app, in addition to preflight quality checks. Both protected stages require exactly one User reviewer, `camster91` / GitHub ID `33962910`, with self-review prevention disabled. Custom deployment branch policies must allow exactly the branch `agent/261-launch-candidate-review`. The shared read-only `release_guard.py` checks those exact rules and accepts only owner-initiated manual dispatches on that branch in `camster91/jw-habits`, including the triggering actor. Cameron approves each separate signing/upload pause. Owner must verify administrative review bypass is disabled in authenticated GitHub settings because the environment REST response does not expose it, and retain the actual human approval record separately. [GitHub environment protections](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

## Signing and artifact boundary

Put signing/provisioning authentication only in `ios-signing`: `ASC_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_API_PRIVATE_KEY`. Register app/widget IDs and App Group first. The owner must explicitly approve automatic signing/provisioning updates, archive/export and signed-IPA artifact retention. Private authentication is staged with owner-only permissions and removed by always-run cleanup; interrupted/terminated runners remain an ephemeral-host recovery concern.

The archive resolves canonical version/build inputs, passes them to app and widget, exports exactly one IPA, and normalizes its name to `app.ipa`. Actual IPA app/widget identities and versions are checked before recording source/lock/artifact checksums. A seven-day run/attempt candidate artifact holds the IPA and two evidence JSON files; sanitized JSON evidence is also retained for 90 days. The artifact paths explicitly exclude authentication keys, export options, provisioning profiles and the archive directory. This is an approved artifact-transfer mechanism, not App Store publication.

Put least-privilege upload credentials in `testflight-upload`; credential names match the action but may use a different restricted Apple key. Upload downloads only the same run/attempt candidate, reinspects the IPA and compares its evidence byte-for-byte before the pinned Apple uploader runs. The IPA signature/certificate identity, entitlements and embedded privacy manifests still require separate inspection: version/hash validation does not prove them. No production App Review submission or tester invitation is requested by this workflow.

## Owner setup and resume conditions

Read-only validation on 12 October 2026 confirms both ios-signing and testflight-upload exist with the exact sole-owner reviewer and release-branch policy above. Cameron is the sole operator. The REST guard does not expose administrative review bypass or establish an actual human approval; verify bypass is disabled in authenticated settings and retain each signing/upload approval separately. No settings were changed by this validation. Verify account/team, app/widget/App Group records, valid provisioning, private keys and unused build allocation from actual Apple history. Never place key values or certificate identities in public handoff evidence.

After exact push and dispatch/sign/upload approval, prefer an approved signing-only run first. Review the IPA and source/run/checksum evidence before requesting upload approval. After uploader completion, inspect App Store Connect processing, compliance/reviewer requirements and TestFlight availability, then install the delivered app on physical supported devices and run the full app/widget/workspace/backup/notification checklist. Exact-device evidence remains required for native capture's baseline gate and store release.

## Failure and evidence limits

No fallback to unprotected signing or different artifact attempts exists. A standalone failed-upload rerun may have a different attempt number and therefore fail candidate lookup; inspect Apple state first rather than blindly rerunning a possibly accepted build. Any recovery, credential changes or new build allocation are owner actions. Local tests use fabricated API/process results and synthetic archives, not signing/account calls. They do not certify Xcode behavior, reviewer enforcement, signature validity, Apple processing or installed device behavior.

Record source SHA, build/version, run/attempt, artifact hash, reviewer approvals, private signature/provisioning inspection status and processing/install results separately. #248 closes only after approved upload processes and installs through TestFlight; full launch still requires physical/household/store acceptance and the other release gates.

### Replay an already inspected retained IPA

The optional `signed_run_id`, `signed_run_attempt`, `signed_source_sha` and
`signed_ipa_sha256` inputs select a previously successful owner-signed artifact.
Leave all four unset for the existing archive flow. Replay requires
`skip_upload=false`; with `upload=false` it only validates the selection.
With `upload=true`, only `upload_existing` can run and it pauses at the existing
`testflight-upload` environment. It does not export or resign the app.

The adapter checks the original attempt, guarded branch, owner identity,
archive success, original upload being skipped, owner signing approval, unique
unexpired artifact, exact IPA checksum, immutable source checkout, lockfile,
app/widget versions and embedded release identity. After protected approval it
checks Apple app identity and build history before handing those exact bytes to
the pinned upload action. It rejects previously reused build numbers. An API
failure or ambiguous earlier upload must be reconciled; do not bypass a guard.

Before dispatch, manually confirm the environment's administrator bypass stays
unchecked (the API does not expose that setting) and obtain separate approval
for uploading the named IPA. Successful upload is still distinct from Apple
processing, TestFlight availability, invitations and physical-device acceptance.
If artifact retention expires, prepare a new signed candidate with a new unused
build number and repeat inspection and approval; do not relabel a rebuild as the
previously inspected IPA. Publishing this workflow is also separate from upload.

Local validator tests: `python3 scripts/native/test_signed_ipa_replay.py`.
