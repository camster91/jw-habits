# iOS widget: one-time Xcode setup

The widget's sources are committed in `ios/App/FaithfulDaysWidget/`, but the
**widget extension target is not in `project.pbxproj`** — it was written on a
machine without Xcode, and hand-writing a whole extension target into the
project file is too error-prone. Do these steps once, on a Mac, then commit the
resulting `project.pbxproj` change.

What is already wired without these steps (in the App target):

- `App/WidgetBridgePlugin.swift` — the `WidgetBridge` Capacitor plugin
  (`setSnapshot`, `drainQueue`) on `UserDefaults(suiteName: "group.ca.ashbi.habittracker")`,
  keys `fd.snapshot` and `fd.queue`.
- `App/MainViewController.swift` — registers the plugin in `capacitorDidLoad()`.
  `Main.storyboard` now uses `MainViewController` (module `App`) instead of
  `CAPBridgeViewController`.

Without the steps below the app still builds and runs; the plugin just writes a
snapshot nobody reads (without the App Group entitlement, iOS keeps the suite in
the app's own container).

## Requirements

- Xcode 15 or later (interactive widgets with `Button(intent:)` need the iOS 17 SDK).
- An Apple developer team that can register the App Group `group.ca.ashbi.habittracker`.

## Steps

1. **Build the web app and sync** from the repo root:

   ```sh
   npm ci
   npm run build
   npx cap sync ios
   ```

2. **Move the provided sources aside.** Xcode's template writes into
   `ios/App/FaithfulDaysWidget/`, which already holds our files:

   ```sh
   mv ios/App/FaithfulDaysWidget ios/App/FaithfulDaysWidget.provided
   ```

3. **Open** `ios/App/App.xcodeproj` (or `npx cap open ios`).

4. **File › New › Target… › iOS › Widget Extension**, then Next:
   - Product Name: `FaithfulDaysWidget`
   - Team: your team
   - Bundle Identifier should read `ca.ashbi.habittracker.FaithfulDaysWidget`
     (fix it in the target's General tab afterwards if Xcode proposes something else)
   - **Uncheck** "Include Live Activity"
   - **Uncheck** "Include Configuration App Intent"
   - Project: `App`, Embed in Application: `App`
   - Finish. If asked to activate the `FaithfulDaysWidgetExtension` scheme, choose
     **Cancel** (keep the `App` scheme active).

5. **Replace the generated sources with ours.**

   ```sh
   cd ios/App/FaithfulDaysWidget
   rm -f FaithfulDaysWidget.swift FaithfulDaysWidgetBundle.swift AppIntent.swift \
         FaithfulDaysWidgetLiveActivity.swift FaithfulDaysWidgetControl.swift
   cp ../FaithfulDaysWidget.provided/* .
   cd .. && rm -rf FaithfulDaysWidget.provided
   ```

   Keep the generated `Assets.xcassets`. `Info.plist` is replaced by ours (it only
   adds `CFBundleDisplayName` to the template's `NSExtension` dictionary).

   Back in Xcode, make sure the `FaithfulDaysWidget` group contains exactly
   `FaithfulDaysWidget.swift`, `CheckInIntent.swift`, `Info.plist`,
   `FaithfulDaysWidget.entitlements` and `Assets.xcassets`:
   - Xcode 16+ (folder shown with a blue folder icon, "synchronized"): files appear
     automatically. Select `Info.plist` and `FaithfulDaysWidget.entitlements` and, in
     the File inspector, make sure **Target Membership is unchecked** for both (they
     must not be copied as resources — otherwise the build fails with "Multiple
     commands produce … Info.plist").
   - Older Xcode (yellow group): remove the deleted files' red references, then
     **Add Files to "App"…**, select `CheckInIntent.swift` and `FaithfulDaysWidget.swift`
     with only the `FaithfulDaysWidgetExtension` target ticked; add `Info.plist` and
     the `.entitlements` file with **no** target ticked.
   - The two Swift files must be members of the **extension target only** (not `App`).

6. **Extension target build settings** (`FaithfulDaysWidgetExtension` › Build Settings):
   - iOS Deployment Target: **17.0**
   - Info.plist File (`INFOPLIST_FILE`): `FaithfulDaysWidget/Info.plist`
   - Code Signing Entitlements (`CODE_SIGN_ENTITLEMENTS`):
     `FaithfulDaysWidget/FaithfulDaysWidget.entitlements`
   - Product Bundle Identifier: `ca.ashbi.habittracker.FaithfulDaysWidget`
   - Marketing Version / Current Project Version: same as the App target
     (`5.0.0` / `500` at time of writing) — App Store validation warns otherwise.

7. **App Group on both targets.**
   - `App` target › Build Settings › Code Signing Entitlements: `App/App.entitlements`
     (that file already exists and already lists the group; it just isn't referenced yet).
   - `App` target › Signing & Capabilities: the **App Groups** capability should now
     show; make sure `group.ca.ashbi.habittracker` is ticked. If the capability is
     missing, **+ Capability › App Groups** and tick/add `group.ca.ashbi.habittracker`.
   - `FaithfulDaysWidgetExtension` target › Signing & Capabilities: **+ Capability ›
     App Groups**, tick `group.ca.ashbi.habittracker`.
   - With automatic signing, Xcode registers the group and updates both provisioning
     profiles. Make sure Xcode did not create a second `.entitlements` file for either
     target; if it did, delete it and point `CODE_SIGN_ENTITLEMENTS` back at the files above.

8. **Build and run** the `App` scheme on an iOS 17+ simulator or device:

   ```sh
   cd ios/App
   xcodebuild -project App.xcodeproj -scheme App -sdk iphonesimulator \
     -destination 'generic/platform=iOS Simulator' build
   ```

   Then long-press the home screen › **+** › Faithful Days, add the small and the
   medium widget, open the app once (it publishes the snapshot), and run the widget
   items in `docs/release-checklist.md`.

9. **Commit** `ios/App/App.xcodeproj/project.pbxproj` and anything Xcode added
   under `ios/App/FaithfulDaysWidget/` (e.g. `Assets.xcassets`).

## After setup: `npx cap sync ios`

`npx cap sync ios` only copies the web build and regenerates
`ios/App/CapApp-SPM/Package.swift`; it does not touch the widget target,
`Main.storyboard` or `MainViewController.swift`. Run it after every web build as
usual. If `npx cap add ios` is ever re-run from scratch, redo the storyboard change
(`customClass="MainViewController" customModule="App" customModuleProvider="target"`),
re-add the two Swift files to the App target, and repeat the steps above.

## How the pieces talk

| Writer | Key | Reader |
|---|---|---|
| App (`setSnapshot`) | `fd.snapshot` — `{day, doneCount, dueCount, items: [{routine, label, done}], accent}` | Widget timeline; `CheckInIntent` (flips one `done`) |
| `CheckInIntent` | `fd.queue` — JSON array of `{routine, day}` | App (`drainQueue`, on every foreground; clears it) |

The widget computes its own app day (local date, rolling over at 03:00) and, when
the snapshot's `day` differs, shows "Open Faithful Days to start today" instead of
any ticks. Its timeline adds an entry at the next 03:00 so that message appears on
time even if the app is never opened.
