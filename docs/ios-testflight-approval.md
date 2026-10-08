# iOS signing and TestFlight approval

Prepared for #174/#248. No workflow was dispatched, build signed, artifact uploaded, profile changed or TestFlight submission made during local preparation.

## Three execution paths

Manual `skip_upload: true` runs preflight and unsigned simulator app/widget compilation. It reads no signing/upload secrets and uses no protected release environment. It is compilation evidence only.

Manual `skip_upload: false` (default) requests the separate `ios-signing` archive stage. Manual `upload: false` (default) retains the candidate without requesting TestFlight upload. Explicit `upload: true` additionally requests the `testflight-upload` stage. A version tag requests both stages through their separate gates. A tag also triggers existing Android/image workflows, so review all effects before authorizing it.

Signed paths require exact-source web/browser/native checks from the expected Actions app, in addition to preflight quality checks. Both protected stages require an eligible independent reviewer and self-review prevention; the shared read-only `release_guard.py` refuses absent/malformed rules. Owner must separately verify allowed refs, admin bypass disabled and the actual human approval record; the presence check alone does not establish those. [GitHub environment protections](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

## Signing and artifact boundary

Put signing/provisioning authentication only in `ios-signing`: `ASC_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_API_PRIVATE_KEY`. Register app/widget IDs and App Group first. The owner must explicitly approve automatic signing/provisioning updates, archive/export and signed-IPA artifact retention. Private authentication is staged with owner-only permissions and removed by always-run cleanup; interrupted/terminated runners remain an ephemeral-host recovery concern.

The archive resolves canonical version/build inputs, passes them to app and widget, exports exactly one IPA, and normalizes its name to `app.ipa`. Actual IPA app/widget identities and versions are checked before recording source/lock/artifact checksums. A seven-day run/attempt candidate artifact holds the IPA and two evidence JSON files; sanitized JSON evidence is also retained for 90 days. The artifact paths explicitly exclude authentication keys, export options, provisioning profiles and the archive directory. This is an approved artifact-transfer mechanism, not App Store publication.

Put least-privilege upload credentials in `testflight-upload`; credential names match the action but may use a different restricted Apple key. Upload downloads only the same run/attempt candidate, reinspects the IPA and compares its evidence byte-for-byte before the pinned Apple uploader runs. The IPA signature/certificate identity, entitlements and embedded privacy manifests still require separate inspection: version/hash validation does not prove them. No production App Review submission or tester invitation is requested by this workflow.

## Owner setup and resume conditions

The latest read-only environment inventory contains only github-pages, Preview and Production. Neither ios-signing nor testflight-upload exists. Choose an independent reviewer (current collaborator inventory previously showed only Cameron), authorize any necessary invitation, then authorize/configure both environments and read back protections. Verify account/team, app/widget/App Group records, valid provisioning, private keys and unused build allocation from actual Apple history. Never place key values or certificate identities in public handoff evidence.

After exact push and dispatch/sign/upload approval, prefer an approved signing-only run first. Review the IPA and source/run/checksum evidence before requesting upload approval. After uploader completion, inspect App Store Connect processing, compliance/reviewer requirements and TestFlight availability, then install the delivered app on physical supported devices and run the full app/widget/workspace/backup/notification checklist. Exact-device evidence remains required for native capture's baseline gate and store release.

## Failure and evidence limits

No fallback to unprotected signing or different artifact attempts exists. A standalone failed-upload rerun may have a different attempt number and therefore fail candidate lookup; inspect Apple state first rather than blindly rerunning a possibly accepted build. Any recovery, credential changes or new build allocation are owner actions. Local tests use fabricated API/process results and synthetic archives, not signing/account calls. They do not certify Xcode behavior, reviewer enforcement, signature validity, Apple processing or installed device behavior.

Record source SHA, build/version, run/attempt, artifact hash, reviewer approvals, private signature/provisioning inspection status and processing/install results separately. #248 closes only after approved upload processes and installs through TestFlight; full launch still requires physical/household/store acceptance and the other release gates.
