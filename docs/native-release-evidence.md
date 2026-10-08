# Native version and artifact evidence

Prepared for #174/#248/#249. This wiring is not signed-release, device or store acceptance evidence.

## Canonical inputs

`package.json.version` is the marketing-version source. It must have three canonical numeric components, without prerelease/build suffixes. `native-release.json.buildNumber` is the shared positive default build, currently 520. Keep the four Xcode app/widget Debug/Release defaults aligned when changing these inputs; `check-defaults` rejects drift rather than silently editing valuable project configuration. Android Gradle reads the inputs directly.

Version tags must exactly equal `v` plus the package version. The TestFlight dispatch's marketing-version input is an assertion, not an unrelated override. A build override cannot regress below the committed number or exceed Play's versionCode limit. Android receives `FD_NATIVE_BUILD`; both iOS targets receive matching `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` settings. Build numbers no longer default to workflow-specific run numbers.

Before every signed/store build, the owner checks actual Apple/Play build history and allocates an unused higher number. Commit an appropriate shared default for a tag release; a manual override must be recorded with the source revision. Baseline 520 is inherited from source and does not prove it is unused in either console. Store histories may differ, and local validation cannot prove console monotonicity. Android requires successive release codes to increase and rejects reuse. [Android versioning guidance](https://developer.android.com/studio/publish/versioning).

## Commands and retained evidence

- `python3 scripts/native/release_evidence.py check-defaults`: read-only check of canonical inputs and four Xcode defaults.
- `python3 scripts/native/release_evidence.py resolve --output <private-metadata-path>`: resolve version/build/source HEAD and package-lock checksum. Optional `--build` and `--version` are validated; `--github-env` emits only validated version/build values for workflow steps.
- `record --metadata <metadata> --artifact <artifact> --platform ios --output <record>`: inspect the IPA's actual app and widget plists; reject mismatched bundle IDs, versions or builds, missing/unexpected extensions and ambiguous archive paths.
- `record ... --platform android --aapt <SDK-aapt-path>`: invoke aapt on the exact APK and validate its actual package/version/build before recording the checksum. For AABs use `--platform android-aab --bundletool <pinned-jar-path>`: the helper verifies the pinned JAR digest before execution, verifies JAR signatures, validates structure and checks the actual base manifest. This APK path does not validate a bundle.

The recorder re-resolves current checkout metadata to reject unrelated/stale input. It records artifact basename, byte size, SHA-256 and inspected identities alongside source commit and lock checksum. It reads IPA entries without extracting them; no certificate identities, private signing data or absolute artifact paths enter the JSON. A source HEAD/lock mapping is not a cryptographic build attestation or a guarantee of a clean local source tree: use a clean immutable checkout for release builds and retain the exact workflow revision/run evidence.

Android native CI installs build tools 36.1.0, matching Gradle, and retains debug APK plus metadata for seven days. iOS TestFlight verifies exported app/widget metadata before the existing upload step and retains the two evidence JSON files for 90 days and a separately approved IPA candidate for seven days for transfer to the upload job, with run/attempt in both artifact names. This is not App Store publication. Its unsigned simulator path does not claim IPA evidence. Version tags request separately approved signing/upload stages; manual upload is opt-in and unsigned simulator compilation remains separate. No workflow was dispatched or tag pushed here. See [iOS approval boundaries](ios-testflight-approval.md).

## Validation scope and remaining gates

`test_release_evidence.py` uses synthetic binary/XML plist archives and mocked Git facts. It checks version/tag/source mismatch, numeric limits/regressions, missing/stale/unexpected widget metadata, APK metadata mismatch, checksum/size records and Xcode default drift. It neither compiles nor signs anything. CI Build runs these fixtures and the live-default check. Workflow parsing/pin policy is local evidence only until the prepared branch runs in GitHub.

Record fields deliberately say `signingVerification: not-performed`, `storeProcessing: not-verified`, `deviceInstallation: not-verified`. Inspect actual signatures/entitlements/provisioning/privacy manifests and verify console processing plus physical installation separately. Nothing in this script verifies key lineage, notification delivery, app/widget behavior or household acceptance. Android signed AAB/closed-testing workflow is prepared with separate owner gates; see [Android closed testing](android-closed-testing.md). Apple/Play access and all signing/upload actions require exact owner authorization.
