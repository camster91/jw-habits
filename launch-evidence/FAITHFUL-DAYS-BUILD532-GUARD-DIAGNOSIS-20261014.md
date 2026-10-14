# Faithful Days Build 532 guard diagnosis

Recorded 2026-10-14. This evidence covers the guarded replay for the already
signed Faithful Days candidate. It does not claim TestFlight upload, Apple
processing, tester availability, or device installation.

## Candidate and retained artifact

- App Store Connect app: `6821076241`
- Bundle ID: `ca.ashbi.habittracker`
- Marketing version: `5.3.0`
- Build: `532`
- Candidate source: `9fb9614c4ef06805f664ae80f2fdcc97120267c9`
- Retained IPA SHA-256: `1695673e366a65b06eb2a517055e145229af1fc24f6582cd3c084f1951c64c74`
- Signing artifact source run: `38557294977`, attempt `1`, upload disabled

The retained artifact and source were not changed during this diagnosis.

## Failed GitHub replay

Run `38574491156` used workflow branch
`agent/261-launch-candidate-review` at the exact candidate source SHA above.
Preflight succeeded (`115887903056`), the exact retained IPA replay checks
succeeded, and the separate `testflight-upload` approval was granted. The
`upload_existing` job (`115888853370`) stopped at **Recheck Apple identity and
unused build number** at 2026-10-14 13:48:05Z. The uploader step was skipped,
so Apple state did not change.

The immutable guard at that source was the original `apple_build_guard.py`
(SHA-256 `da2fe22f213f7ecfb9cc178688e246c9237dda5472e8a324500a2c1c16ecfdb6`).
Its broad handler printed only:

`Apple build-history verification failed; reconcile before upload`

## Root cause

The failure happened before the Apple API request. The guard attempted to
create its temporary private-key file with:

`Path.open('x', opener=...)`

`pathlib.Path.open` does not accept an `opener` argument. A source-equivalent
local execution raised:

`TypeError: open() got an unexpected keyword argument 'opener'`

The broad exception handler hid that TypeError behind the generic message,
which initially made the failure look like an ASC credential or history
problem.

## Local proof with the existing protected identity

The known Faithful Days protected files were used read-only:

- `/Users/Cameron/.config/faithful-days/apple-signing/AuthKey_Y39SY353V3.p8`
- `/Users/Cameron/.config/faithful-days/apple-signing/asc-identity-readback.json`

The identity readback records an active key, a matching key filename, the
Faithful Days app/team/bundle mapping, and issuer metadata. Identity values
were not printed or copied into this record.

With those files and fabricated temporary replay metadata for version 5.3.0,
the corrected full wrapper reached Apple and returned:

`Apple identity and unused build number verified. No Apple state changed.`

That run proves the API endpoint, JWT construction, Apple app mapping, build
history filters, current clock/network path, and Build 532 unused check are
valid. App Store Connect still shows only Build 530 for this version train.

## Minimal fix and validation

The guard now uses Python’s built-in `open(..., opener=...)` for the temporary
key file and keeps owner-only `0600` permissions. It also retains the safe
diagnostic handling that reports only Apple HTTP status, endpoint path, error
code and title when an actual API error occurs.

Validation:

- `python3 scripts/native/test_signed_ipa_replay.py` — **13/13 passed**
- Full corrected wrapper with the existing protected local identity — **passed**
- No GitHub secrets changed
- No push, upload, retry, credential generation, or public release occurred

## Minimum next action

Apply the local guard fix to the exact dispatch branch, rerun preflight, obtain
the existing separate `testflight-upload` owner approval, and run one replay
of the retained IPA. Do not rebuild or change the source/build number. Verify
Apple processing and internal TestFlight availability after the uploader
completes; those remain separate gates.

## GitHub secret scope and wiring

The `testflight-upload` environment contains exactly these relevant protected
secret names:

- `ASC_API_PRIVATE_KEY`
- `ASC_KEY_ID`
- `ASC_ISSUER_ID`

The repository-level secret listing does not contain those ASC names. In
`.github/workflows/ios-testflight.yml`, `upload_existing` declares
`environment: testflight-upload`; its guard step maps the three environment
secrets to identically named process variables, and the uploader receives the
same three secrets. No secret value was read or logged.
