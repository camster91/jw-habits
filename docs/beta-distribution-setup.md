# Faithful Days beta distribution

The requested test channels are Apple TestFlight and Google Play internal testing. Neither route requires distributing a development-signed iPhone build. Physical phones remain necessary for acceptance testing, but TestFlight testers do not need to submit UDIDs.

## Verified source and preparation

This local branch starts at tested organiser source c74c0dc5132557c2f0d14b99d1c00b48442f6648, app 5.3.0/build 530. Application code is unchanged. iOS release workflow now prepares validated App Store profiles and uses an Apple Distribution identity for both app and widget archive/export, avoiding the failed App Development provisioning path. The same protected signing and upload gates remain. Upload defaults false.

The distribution profile helper rejects other apps/teams, development or enterprise profiles, expired profiles, wrong signing certificates, and incorrect App Group membership. It configures only the two expected Release targets in the disposable CI checkout. Debug and simulator configurations remain unchanged. Private values are passed only to captured subprocesses; keychain errors do not print credential-bearing arguments. An always cleanup removes the temporary P12/keychain directory. Native compilation still occurs in GitHub Actions.

The new Android workflow builds and validates an AAB through android-signing, then optionally transfers that exact run/attempt artifact through a separate play-internal-testing gate. Track is hard-coded to internal; no production target exists in that workflow. The existing closed-testing workflow remains available and unchanged. Both Android paths need a fresh upload key for ca.ashbi.habittracker. Never reuse the exposed com.ashbi.jwnews key or treat the new app as incident closure.

Local validation: actionlint passes for both changed/new workflows. Fifty tests pass: three distribution profile/configuration tests, twelve environment/source guards, twenty-five artifact evidence tests, and ten keystore generator tests. No signed distribution build, upload, store processing, or device acceptance is established by these tests.

## Inputs and bounded activation

A matching Apple Distribution signing identity is present in this Mac's keychain; no private key was exported during preparation. The Apple app/widget bundle IDs exist. No Faithful App Store profiles were present in the inspected Apple inventory. Create profiles for these two existing IDs and the existing approved App Group, using the selected existing distribution certificate; do not revoke certificates or modify other apps' profiles.

To enable the prepared iOS job, securely export only that selected identity as an encrypted P12, preserve the original identity in its current keychain, and store these new inputs only in the existing protected ios-signing environment:

- IOS_DISTRIBUTION_P12_BASE64
- IOS_DISTRIBUTION_P12_PASSWORD
- IOS_APP_STORE_PROFILE_BASE64
- IOS_WIDGET_STORE_PROFILE_BASE64
- IOS_DISTRIBUTION_CERT_SHA256 as a protected environment variable, checked against the actual identity/profile certificate.

Preserve the existing ASC inputs in testflight-upload. Credential bytes/passwords must never enter chat, repository files, logs, PRs, artifacts or public issue evidence. A keychain authentication prompt must be completed by the owner if required.

Google Play's existing JW Habits draft app 4973248010610190630 has an inactive internal track and no releases. The android-signing and play-closed-testing environments have zero secrets. Prepare a fresh upload key with an approved recovery destination, store its existing workflow inputs only in android-signing, and preserve its offline recovery copy. Owner's recovery-storage preference is pending.

Create play-internal-testing with exactly Cameron as reviewer, solo self-review allowed, administrator bypass disabled, and only agent/261-launch-candidate-review as deployment branch. Store the app-scoped Play service account JSON there and configure the approved new upload certificate hash in both android-signing and play-internal-testing. Confirm the correct account/package before the first bundle upload fixes that package binding. Account access or a browser session is not a service-account credential.

Push this branch as a draft PR for the signing fix/internal test adapter only, run exact-source CI checks, then promote the reviewed release source without force. The new source SHA requires fresh release/source approval before dispatch. Prefer signing-only runs first. Review actual IPA/AAB identities, profiles, signatures and checksums before uploads. Tester availability and installation must be verified in each store afterward; do not report an invitation delivered from merely adding a tester record.

Bianca is already registered in Faithful Days' private iPhone Testing group. Retry the existing invitation after an installable external-test build exists; do not create duplicate tester records. Any required beta-review compliance/contact fields require factual owner inputs, not invented declarations. Public App Store/Play production release is outside this beta setup.

## Immediate Android test file

The existing debug test APK /Users/Cameron/Downloads/Faithful-Days-5.3.0-organiser-test.apk is verified at SHA-256 fd2af2f2ea9cb9c9367b2da4a02a56ffc2529c0e27a05773f3e485840bc7be8b. It is a direct-install test build, not a Play release. If replacing an older differently signed app, export a backup before uninstalling it. Installed-app and backup/restore results remain unverified.
