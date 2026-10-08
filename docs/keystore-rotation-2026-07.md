# Android signing incident — owner runbook

Updated 2026-10-08. This replaces the July execution guidance; it does not certify remediation. Track rotation in #132, history/copies in #133 and the new release pipeline in #249. No key was generated, reset requested, artifact signed/uploaded, history rewritten or external record changed during this review.

## Establish the affected identity first

The July incident record identifies `com.ashbi.jwnews`. Current Gradle uses `ca.ashbi.habittracker`; #249 calls this a new listing using a fresh upload key. Neither a repository name nor that issue proves current Play enrollment or key lineage. Cameron must privately inspect both application records and compare certificate identities against the protected signing inventory. Keep fingerprints, passwords and key material out of public GitHub evidence.

Record a sanitized result for each package: listing exists/absent, Play App Signing enrolled/not enrolled, exposed key role (upload/app signing/both/unknown), affected certificate match yes/no/unknown, current credential accepted/retired/unknown, and owner/date. If lineage cannot be established, keep the incident open and do not reuse historical signing material for Faithful Days.

With Play App Signing, an upload key authenticates uploaded bundles; Google uses a separate app signing key for delivered APKs. An upload-key reset does not rotate the app signing key. If the compromised key also signs installed apps, the owner must assess that separate remediation path. [Google Play signing guidance](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en-GB).

## Prepare the approved replacement

For an affected existing listing, generate a new upload key in an approved secure location and submit only its public PEM certificate through the upload-key reset process. For a genuinely new Faithful Days listing, establish its own fresh upload key and Play App Signing enrollment. Follow the actual console response and effective date; do not assume a seven-day overlap or that a reset is already effective. [Google Play signing guidance](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en-GB).

Generation, enrollment, rotation and uploads require Cameron's explicit authorization. Protect the keystore and recovery copy in approved private storage outside this checkout. Do not pass passwords as literal command arguments or paste them into chat, tickets, screenshots or logs.

The locally prepared `scripts/generate-android-keystore.sh` requires one absolute destination outside this checkout and an existing parent directory. It refuses existing files/symlinks, generates in a private staging directory, and creates the final path atomically without replacement. It uses the Faithful Days identity and fixed `habittracker` alias, RSA 4096, JKS format, owner-only file permissions and hidden prompts or protected environment injection. It requires Bash, JDK keytool and Python 3. Invoke it only after explicit generation approval; it does not enroll, rotate, sign an app or upload anything. Do not enable tracing or run it in an untrusted environment. Password environment variables remain sensitive even though their values are absent from command arguments. Keytool's environment-password options are documented in the [Oracle keytool reference](https://docs.oracle.com/en/java/javase/25/docs/specs/man/keytool.html).

`python3 scripts/native/test_keystore_generator.py` uses a fabricated keytool and nonsecret fixtures to check argument/output redaction, private permissions, failure cleanup and destination races. It never creates real signing material. The hidden interactive prompt and real keytool generation have not been exercised; those remain approved owner-run verification, not an outcome of the fabricated test suite.

Current Gradle reads ignored `android/keystore.properties` or `KEYSTORE_FILE`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`; that is configuration support, not signing proof. Android now reads version from `package.json` and default build from `native-release.json`, with validated `FD_NATIVE_BUILD` overrides. Shared version/checksum evidence wiring is prepared locally; the Android signed-release workflow is now prepared locally with separate signing/upload gates, but there is no accepted closed-testing proof. Protected credentials, real native verification and track processing remain #174/#249 work. See [native release evidence](native-release-evidence.md).

## Prove replacement and retire the affected key

After the confirmed effective date and specific upload approval, use the approved replacement for a proof build in the affected listing's test track. Verify acceptance and processing in Play, then install the Play-delivered build on a physical device. Preserve existing-user update compatibility where relevant. Record package/version/build, source SHA, artifact checksum, track status and install outcome without credential data. Verify the former upload credential is no longer accepted using owner-console/support evidence; do not attempt an unauthorized old-key upload. Retire controlled affected key copies only according to the owner's recovery policy. A new Faithful Days key alone does not close the old listing incident.

## Prepare history and copy cleanup separately

First retire or rotate affected credentials; deletion from Git is not revocation. For #133, prepare an isolated full-history cleanup rehearsal with encrypted restricted backups, an inventory of affected refs/copies, sanitized changed-ref/commit mapping and a reviewed recovery plan. This review clone is shallow and cannot establish historical cleanliness.

Inventory issues/PR text, releases, Actions logs/artifacts, LFS, mirrors, forks and local backups without printing matches. Do not use history-diff or grep commands that emit exposed values. Scanner output must be redacted and privately retained. Recheck HEAD with a redacted scan, but keep its scope distinct from all-history and hosted-copy review.

Before any remote rewrite, obtain exact authorization for the refs and protection changes, coordinate a write freeze, preserve unpublished work, and review the resulting history. Afterward, verify a fresh clone and restore approved protections. Cached views, read-only PR refs, other clones and forks may retain data; GitHub Support involvement has eligibility limits. Existing clones must not merge old history back into cleaned refs. [GitHub sensitive-data removal guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

## Evidence required to close

- #132: privately reconciled key lineage, replacement effective and accepted in the affected listing, former upload key retired, controlled current copies sanitized, signed install/update proof and sanitized incident timeline.
- #133: approved cleanup completed for scoped refs and controlled copies, fresh full-history scan, hosted-reference/cached-view outcomes, collaborator recovery and prevention controls; external uncontrolled copies explicitly recorded.
- #249: distinct current-package release proof accepted and processed in closed testing, protected fresh credentials, reproducible version/source mapping and physical-device evidence.

All three remain incomplete. Do not label a successful unsigned debug compile, ignored properties file or local draft as credential remediation or a store release.
