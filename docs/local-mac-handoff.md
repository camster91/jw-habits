# Local Mac handoff

Written 21 October 2026. This picks up after the cloud session: all coded work
is merged into `agent/261-launch-candidate-review`. What is left needs your
accounts, a Mac with Xcode, real phones or real people.

Never paste passwords, keys, `.p8`/`.jks` files or service-account JSON into
issues, chat or the repository.

## 1. Where things stand

- **Release source:** branch `agent/261-launch-candidate-review`. Every
  merged PR there passed CI, smoke on Chromium/Firefox/WebKit, and the Android
  debug and iOS simulator compiles.
- **iOS test build 533:** run
  [39622559898](https://github.com/camster91/jw-habits/actions/runs/39622559898)
  is waiting for your `ios-signing` approval. It was built from `8771679`.
  Commits merged after that (#329 smaller i18n, #330 cleanup, #331 attach a
  note) are not in build 533. They reach testers in build 534 (step 3).
- **Android:** not signed yet. Blocked by #249 (key custody and Play
  credentials), and its workflows only exist on the testing branch, not `main`.
- **Website:** production serves an old branch build (`95703b7`) from a server
  outside the deploy pipeline. The `/privacy` and `/support` redirect fix is
  in the code but not live (#239).

## 2. Set up the Mac

1. Install Xcode with an iOS 17+ SDK (the widget needs iOS 17), Node 22
   (`.nvmrc`), and Android Studio with JDK 21 if you will test Android.
2. Get the code:
   ```sh
   git clone https://github.com/camster91/jw-habits.git
   cd jw-habits
   git checkout agent/261-launch-candidate-review
   npm ci
   npm run build
   npx cap sync ios
   npx cap sync android
   ```
3. Optional local checks (the same ones CI runs):
   `npm run lint && npm run test:coverage && npm run budgets`.
   The browser suites need `npx playwright install chromium` first.

## 3. iOS: TestFlight

Use the protected GitHub workflow for anything testers receive. Local Xcode
builds are only for your own quick device checks.

1. Open the run link above, click **Review deployments**, tick
   **ios-signing**, then click **Approve and deploy**. The approval only
   counts after that last click.
2. When the archive job finishes, check its summary: version 5.3.0, build 533,
   source commit and IPA SHA-256. Then approve **testflight-upload** the same
   way.
3. In App Store Connect, wait for build 533 to finish processing. Answer any
   export-compliance question, then add internal testers (Bianca, #248).
4. Install it from TestFlight on a real iPhone. Record the result in #248.
5. **Build 534 with today's later changes:**
   - Make sure the latest testing-branch head has green CI, Smoke and Native
     compile. Dispatch them on the branch if needed.
   - Run **iOS TestFlight** from the Actions tab: branch
     `agent/261-launch-candidate-review`, `bundle_version` `534`,
     `upload` ticked.
   - The workflow refuses a build number Apple has already seen.
   - It must be started from your own GitHub account (`camster91`). The
     guard rejects other users.

Quick on-device check without TestFlight: `npx cap open ios`, choose your
team for both the **App** and **FaithfulDaysWidget** targets (App Group
`group.ca.ashbi.habittracker`), select your iPhone, then press Run. Don't
install over a phone that holds real data with a differently signed build
unless you've exported a backup first.

## 4. Device checks (#251)

Work through `docs/release-checklist.md` on a real iPhone (iOS 17+) and a real
Android phone. Record each result in a copy of
`docs/device-release-results-template.md` and attach it to #251. Use made-up
test data, not your real journal.

Also check these items, which automated tests can't prove:

| Check | Issue |
|---|---|
| Restore a backup in Settings: reminders and the widget update straight away | #318 |
| Leave the app open overnight past 03:00, reopen it, then check in: the entry is dated today | #319 |
| Settings → Backup export works when notes and tasks are fine, and the files open on the phone | #316 |
| OS "Reduce Motion" on: no smooth scrolling or long animations | #181 |
| VoiceOver (iOS) and TalkBack (Android) on Today, Plan, Notes and Settings | #176 |
| Notifications: permission prompt, delivery, quiet hours, a time-zone change | #42 |
| Widgets: add both sizes, check in from the widget, reopen the app | #244 / #243 |

The damaged-data recovery screen (#315) and two-tab handling (#317) are
covered by real-browser tests (`npm run data-safety:verify`), so they don't
need a phone.

## 5. Android (#249, then #253)

Do these in order:
1. Tell the issue *where* the encrypted upload-key backup lives and the path of
   the app-scoped Play service-account file. Names only, never contents.
2. Decide when to merge the testing branch into `main` (step 7). GitHub can
   only start `android-internal-testing.yml` and `android-closed-testing.yml`
   once they exist on `main`.
3. Follow `docs/android-closed-testing.md`: set up the protected environments,
   then run a signing-only dispatch with a build number Play hasn't used, then
   upload.
4. Install from Play on a real phone and run section 4. Don't uninstall a
   phone that has real data; the old debug build's signer differs.

## 6. Website (#239)

You need SSH access to the server. Steps and rollback are in
`docs/web-redirect-fix-239.md`. In short:
1. Look at what actually answers `jwhabits.ashbi.ca`, and back up the Traefik
   config and that container's config.
2. Either deploy this repo's image through `deploy-ashbi.yml` after the
   candidate is on `main`, or add `absolute_redirect off;` to the live nginx,
   run `nginx -t`, then reload.
3. Check that `/privacy` and `/support` redirect to `/privacy/` and
   `/support/` on HTTPS with no `:8080`, and that `/release.json` shows the
   expected commit.

## 7. Merging to `main`

`main` is about 80 commits behind the testing branch. Merging unblocks the
Android workflows and the normal web deploy. Recommended timing: after build
533 or 534 installs and passes a first device check. Open a PR from
`agent/261-launch-candidate-review` to `main`. Its CI must pass, and if the
deploy workflow runs it will publish the website, so plan that with step 6.

Open Dependabot PRs still to review after the merge:
- Majors #284, #286, #288, #290, #291.
- Workflow-action bumps #287, #289.
- #295 is an unmerged alternative iOS pipeline that needs a keep-or-close
  decision.

## 8. Still needs people

- Usability sessions (#199).
- Household pilot (#252).
- Play closed test with real testers for the required period (#253).
- Store listings and screenshots (#250).
- Store submission (#254).
- Web retirement only after both stores are live (#255).

`#184` is the master index. `#320` has the full integration and evidence log.
