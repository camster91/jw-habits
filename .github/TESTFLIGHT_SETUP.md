# JW Habits — TestFlight Setup & Runbook

This is the one-time setup + per-run instructions for shipping the JW Habits iOS app to TestFlight via the new `ios-testflight` GitHub Actions workflow.

## Overview

Workflow file: **`.github/workflows/ios-testflight.yml`**

Triggers:
- **Manual** — `gh workflow run ios-testflight.yml` from your terminal, or via the GitHub Actions tab's "Run workflow" button. Override `marketing_version`, `bundle_version`, or `skip_upload` per run.
- **Tagged** — every push of a `v*`-tagged release triggers an auto-upload (currently disabled by default — flip the `push.tags` branch on when you're ready for tagged releases).

It runs on `macos-latest` (Apple Silicon image) and uses the official [`apple-actions/upload-testflight-build`](https://github.com/marketplace/actions/upload-testflight-build) action. The build is async-aware — the workflow waits for Apple's build-processing to complete so the success/failure signal is meaningful.

The 4.2.0 version bump here corresponds to the merged Sunday Watchtower feature (PRs #123, #124, #126). After merging all three, this PR is the iOS side of the same release.

## Prerequisites

You need **three pieces** before you can run this workflow for the first time. All three live in the GitHub repo secrets — never in the workflow file:

### 1. App Store Connect API key (.p8)

Apple now prefers API keys over Apple ID/password authentication. Get one:

1. Sign in to https://appstoreconnect.apple.com/access/api-keys (you must have App Manager or Admin role on the JW Habits team).
2. Click **"+ Generate API Key"**.
3. Name it `jw-habits-testflight` (descriptive — you'll see this in the App Store Connect logs).
4. Choose the **App Manager** access level.
5. Download the `.p8` file from the confirmation screen — **Apple only shows this once**. Save it as `~/.hermes/secrets/jw-habits-asc-key.p8` or similar; never commit it.
6. Also note down:
   - **Key ID** — 10-char alphanumeric, e.g. `ABC1234567`
   - **Issuer ID** — UUID-formatted, e.g. `12345678-aaaa-bbbb-cccc-1234567890ab`

Both are visible on the API keys page after generation.

### 2. Apple Developer Team ID

1. Sign in to https://developer.apple.com/account
2. Click **Membership** in the sidebar.
3. The **Team ID** is the 10-char alphanumeric field under "Team ID". It usually starts with a letter (e.g. `XYZ1234567`).
4. Save this too.

You only need the Team ID, not the membership password. Apple's `xcodebuild -allowProvisioningUpdates` handles the signing side if you keep a valid distribution certificate in the team's keychain (CI-side this comes from `runner.apple.team_id` env — but the workflow above uses interactive signing, so a clean dev cert is enough).

### 3. Wire the secrets into GitHub

Run from your terminal:

```bash
# Pass the raw PKCS8 .p8 file contents (NOT a filesystem path).
# The upload action expects api-private-key = key body.
gh secret set ASC_API_PRIVATE_KEY  --repo camster91/jw-habits < ~/path/to/AuthKey_XXXXXX.p8
gh secret set ASC_KEY_ID           --repo camster91/jw-habits "ABC1234567"
gh secret set ASC_ISSUER_ID        --repo camster91/jw-habits "12345678-aaaa-bbbb-cccc-1234567890ab"
```

GitHub encrypts these at rest and only makes them available to workflow runs on this repo. Never commit the `.p8` file (it is gitignored).

> **Migration note:** older docs referred to `ASC_API_KEY_PATH`. Rename/recreate the secret as `ASC_API_PRIVATE_KEY` with the key file contents — the action does not accept a path input.

## How to run

```bash
# Default: builds 4.2.0 (versionCode 421) and uploads to TestFlight
gh workflow run ios-testflight.yml --repo camster91/jw-habits

# Override the version
gh workflow run ios-testflight.yml --repo camster91/jw-habits \
  -f marketing_version=4.2.1 -f bundle_version=422

# Build only (no upload) — useful for verifying a commit builds cleanly
gh workflow run ios-testflight.yml --repo camster91/jw-habits -f skip_upload=true
```

The workflow logs stream at https://github.com/camster91/jw-habits/actions/workflows/ios-testflight.yml. Typical wall-clock: **5–8 min** for the build + 1–3 min for Apple's processing + TestFlight ingestion.

When it succeeds, the summary line in the run page contains a link into App Store Connect's TestFlight tab.

## Post-upload checklist (one-off per build)

1. Open **App Store Connect → My Apps → JW Habits → TestFlight**.
2. The new build appears under **iOS Builds** with the version label `4.2.0 (421)`.
3. Apple's automatic compliance checks ("Encryption export compliance") will pop a dialog box — choose:
   - "Yes, uses encryption" if you have any non-Apple-standard crypto (you don't — the app uses no third-party crypto libraries beyond TLS).
   - "No, doesn't use encryption" if it's pure HTTPS/network calls.
4. The build is initially in **"Missing Compliance"** state — answer the dialog, save, and it flips to **"Ready to Submit"** within a few minutes.
5. Under the **TestFlight** tab, distribute to:
   - **Internal testers** (your team) — no TestFlight review required.
   - **External testers** (any family / designated outside testers) — Apple's first-time app review takes ~24 hours, then they're added to a group that you can refresh.
6. Build the specific bundle once it's Ready (TestFlight auto-distributes) — testers get an email or push notification.

## Version-bump workflow

When you have a release to ship (currently 4.2.0):

- Update `package.json` → bump `version` (web/dashboard parity).
- Update `ios/App/App.xcodeproj/project.pbxproj` → bump `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` (the bundle version).
- Optionally update `ios/App/App/Info.plist` to match — the workflow rewrites those values via PlistBuddy during the build, so this is cosmetic.

Or, simpler: when invoking the workflow, pass `-f marketing_version=4.2.1 -f bundle_version=423` and the workflow does it for you.

## Future CI gate

Right now the workflow runs the full lint/test/format gate inline. Once the existing `ci.yml` is reliable on the `camster91` billing plan, this can be replaced with a one-line `needs: [ci]` to depend on the canonical workflow — saves ~30 seconds of redundant compute per build.

## When the Apple-side cert expires

Distribution certificates expire annually (Apple Developer Program membership). The renew-on-rotation dance:

1. Re-sign in to https://developer.apple.com
2. Membership → Expired Cert → "Generate New"
3. Download the new certificate, install on your Mac, push to a CI store (or, since `apple-actions/upload-testflight-build` does interactive signing, just commit a fresh "Pass" profile into the repo and let CI auto-rotate it through Xcode's "Manage Certificates" feature, which `upload-testflight-build` configures automatically).
4. The next workflow run should pick up the rotated cert via `xcodebuild -allowProvisioningUpdates`.

If you hit a "no signing identity found" error, that's almost always a stale cert — open the workflow run's Apple logs to see what `xcodebuild` thinks it has available.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Missing API Key" error | `ASC_API_PRIVATE_KEY` / Key ID / Issuer ID secret missing or wrong | `gh secret list`; recreate `ASC_API_PRIVATE_KEY` with raw `.p8` contents |
| "App Store Connect operation failed: 401" | Wrong Key ID or Issuer ID | Re-check the values from the API keys page |
| Build fails "Could not find developer disk image" | Xcode version mismatch with the project's `IPHONEOS_DEPLOYMENT_TARGET` | The workflow pins macos-latest (Xcode 16+); bump Xcode or lower deployment target |
| Upload succeeds but build appears 5 min later | Apple's processing pipeline — wait | Re-check the build status in App Store Connect |
| `npm ci` fails on sharp | sharp needs binary wheels for macOS ARM — solved by `macos-latest` runner | Already set; if it recurs, pin sharp version |
| "No bundle identifier found" | Bundle ID mismatch between Info.plist and xcconfig | Confirm `com.ashbi.jwnews` is set in both |

## What's intentionally NOT here

This workflow does NOT:

- **Submit to App Store for review.** TestFlight-only. Auto-submission to App Store needs a separate `apple-actions/submit-app-store` step and additional metadata (promo text, screenshots, privacy questions).
- **Auto-bump versions on every merge.** Manual override per run. Auto-bumping would quickly make version numbers noisy.
- **Run on tag pushes.** Currently manual-only. Flip the `push.tags` branch on if/when you want tagged-release automation.

🤖 Generated with [Hermes Agent](https://hermes-agent.nousresearch.com)
