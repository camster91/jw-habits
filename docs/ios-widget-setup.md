# iOS widget release setup

The `FaithfulDaysWidget` extension is embedded in `App.xcodeproj`. Its two Swift sources are registered, App and widget share `group.ca.ashbi.habittracker`, and both targets have their entitlement paths. Do not create a second widget target or move/replace these committed sources.

Use Node 22, `npm ci`, `npm run build`, `npx cap sync ios` on macOS. The Native compile workflow builds the App and embedded extension without signing on an iOS simulator. Compilation alone does not verify widget interaction.

Remaining account/device steps:

1. Register `ca.ashbi.habittracker` and `ca.ashbi.habittracker.FaithfulDaysWidget` in the Apple team and enable the shared App Group for both.
2. Configure valid automatic signing and distribution profiles for both targets. TestFlight needs `ASC_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, and `ASC_API_PRIVATE_KEY`; never put private key material in the repository.
3. The TestFlight workflow takes version from a `v<major.minor.patch>` tag (or package version on dispatch) and build number from the run number. Build overrides apply to both targets through xcodebuild settings. A skip-upload dispatch compiles unsigned rather than attempting a signed archive.
4. Install on a device/simulator, add both widget sizes, check in a routine, reopen the app and verify the correct app-day entry. Check 03:00 rollover, offline use and App Group behavior.
5. Complete section 2 of `docs/release-checklist.md` and record real device/OS evidence in #244. Store launch remains blocked until this evidence and signed TestFlight installation exist.

The widget requires iOS 17; the containing app's deployment target remains iOS 15. Validate the older-OS app behavior and latest supported SDK during release QA.
