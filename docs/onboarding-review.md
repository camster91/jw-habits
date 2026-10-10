# Onboarding review and refinements — 2026-10-09

Reviewed every existing step in the in-app browser before changing it, then inspected each refined step at 390px. This is a local review candidate; previous published bc5df60/native APK does not include these refinements.

| Step | Original problem | Refinement and judgment |
| --- | --- | --- |
| 1 Welcome | Long introduction, tracking-cutoff detail mistaken for a wake-up time, unclear difference between immediate defaults and setup | Shorter purpose, smaller original artwork, interactive rhythm/ideas/pace explanations, explicit six-step versus immediate-default paths. Tracking date examples stay behind optional disclosure. Storage and independent-app notices stay visible. Clearer, with vertical scrolling retained for readable disclosures. |
| 2 Routines | Bare switches with no reason to choose each routine | Illustrated purpose card, six distinct icon/color cards, one-line routine descriptions, live selected count, explicit rename/disable guidance. Selection stays optional and editable later. |
| 3 Week | Meeting labels, family day and ministry mode mixed in a plain form | Separate meeting/family/ministry sections, comfortable weekday targets, explanation that preparation appears the day before, live draft schedule summary and honest empty meeting state. Monthly goal remains conditional on pioneer mode. |
| 4 Reading | Pace and progress-counting choices unexplained | Described pace cards, grouped starting position, visible explanation of earlier-book completion, live starting-place summary. Position/restart/counting semantics unchanged. |
| 5 Rhythm | Clock times, evening notifications, encouragement and permission mixed together | Separate daily/evening/encouragement cards. Familiar moments explicitly map to adjustable suggested clock times; tone explanation updates as selected. Phone permission results are announced; interrupted requests can be retried. Web explains its reminder limitation and never requests native permission. |
| 6 Look and finish | Decorative preview only, no confirmation of actual setup | Illustration, color/theme preview labelled as sample activity, actual draft review of enabled routines, meeting/family days, reading position/pace, anchor time, evening notification, tone and conditional monthly hours. Back revises the draft; Start saves choices without logging activity. |

## Implementation boundaries

Same six steps and stable persistence contracts. No rollover customization or migration. Back preserves the draft; Skip restores that step's starting settings; completing the last step commits the draft once. Choosing defaults from Welcome retains existing store/history and sets onboarding done. No new permission request on mount. The native request remains an explicit user button. Settings shares the refined field layout and explanatory content, but the final setup review is onboarding-only.

Reused original local book/path/notebook illustrations; no copied publisher artwork or new external data source. English-only initial release remains the current scope. The six-segment visual indicator supplements the accessible step text and heading focus.

## Verification

Full suite: 906 tests / 65 files with coverage thresholds passed before the final additional permission-retry test; all 18 onboarding tests then passed, including the retry, actual draft review, Back editing, denied permission, no write before finish, reset/skip/history preservation, and reference-only text. Lint, formatting and build pass. Main accessibility script now visits all six onboarding steps at 320px in light and dark mode, plus the existing whole-app/expanded-guide scans: no automated violations or overflow. A journey run was invalidated by rebuilding its preview while it still requested an earlier chunk. A subsequent run found an intermittent desktop hold test timeout; the standalone path passed. Hardened the existing test helper to scroll its target into view before coordinate holding, and retained full locator failure messages for future diagnosis. The final stable Chromium journey run passed all checks, including onboarding save/skip, 390/768/1440px plans and sharing, 320/390/768/1440px Notes/preparation, backups, reload persistence and no third-party requests. No assertion was disabled or skipped.

Captures in task outputs: onboarding-refined-1.png through onboarding-refined-6.png, plus onboarding-refined-6-review.png. Use viewport screenshots: the in-app browser's full-page capture distorted some narrow-layout captures; inspected DOM dimensions and normal viewport captures confirm the intended 390px layout. This is a capture limitation, not a verified app-layout failure; independent browser accessibility scans confirm no overflow at 320px.

Native OS permission dialogs, refreshed Android APK, signed iOS/TestFlight and physical-device acceptance have not been verified for this local candidate. Account sign-in remains a separate TestFlight dependency.
