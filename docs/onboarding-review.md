# Onboarding review and refinements — 2026-10-09

Reviewed every existing step in the in-app browser before changing it, then inspected each refined step at 390px. This is a local review candidate; previous published bc5df60/native APK does not include these refinements.

| Step | Original problem | Refinement and judgment |
| --- | --- | --- |
| 1 Welcome | Long introduction, tracking-cutoff detail mistaken for a wake-up time, unclear difference between immediate defaults and setup | Shorter purpose, smaller original artwork, interactive rhythm/ideas/pace explanations, explicit six-step versus immediate-default paths. Tracking date examples stay behind optional disclosure. Storage and independent-app notices stay visible. Clearer, with vertical scrolling retained for readable disclosures. |
| 2 Routines | Bare switches with no reason to choose each routine | Illustrated purpose card, six distinct icon/color cards, one-line routine descriptions, live selected count, explicit rename/disable guidance. Selection stays optional and editable later. |
| 3 Week | Meeting labels, family day and ministry mode mixed in a plain form | Separate meeting/family/ministry sections, comfortable weekday targets, explanation that preparation appears the day before, live draft schedule summary and honest empty meeting state. Monthly goal remains conditional on pioneer mode. |
| 4 Reading | Pace and progress-counting choices unexplained | Described pace cards, grouped starting position, visible explanation of earlier-book completion, live starting-place summary. Position/restart/counting semantics unchanged. |
| 5 Rhythm | Clock times, evening notifications, encouragement and permission mixed together | Separate daily/evening/encouragement cards. Routine cues and the reminder clock are explicitly separate; changing a cue preserves the chosen time. The app explains that it cannot detect meals, prayer or bedtime; tone explanation updates as selected. Phone permission results are announced; interrupted requests can be retried. Web explains its reminder limitation and never requests native permission. |
| 6 Look and finish | Decorative preview only, no confirmation of actual setup | Illustration, color/theme preview labelled as sample activity, actual draft review of enabled routines, meeting/family days, reading position/pace, anchor time, evening notification, tone and conditional monthly hours. Back revises the draft; Start saves choices without logging activity. |

## Implementation boundaries

Same six steps and stable persistence contracts. No rollover customization or migration. Back preserves the draft; Skip restores that step's starting settings; completing the last step commits the draft once. Choosing defaults from Welcome retains existing store/history and sets onboarding done. No new permission request on mount. The native request remains an explicit user button. Settings shares the refined field layout and explanatory content, but the final setup review is onboarding-only.

Reused original local book/path/notebook illustrations; no copied publisher artwork or new external data source. English-only initial release remains the current scope. The six-segment visual indicator supplements the accessible step text and heading focus.

## Verification

Full suite: 906 tests / 65 files with coverage thresholds passed before the final additional permission-retry test; all 18 onboarding tests then passed, including the retry, actual draft review, Back editing, denied permission, no write before finish, reset/skip/history preservation, and reference-only text. Lint, formatting and build pass. Main accessibility script now visits all six onboarding steps at 320px in light and dark mode, plus the existing whole-app/expanded-guide scans: no automated violations or overflow. A journey run was invalidated by rebuilding its preview while it still requested an earlier chunk. A subsequent run found an intermittent desktop hold test timeout; the standalone path passed. Hardened the existing test helper to scroll its target into view before coordinate holding, and retained full locator failure messages for future diagnosis. The final stable Chromium journey run passed all checks, including onboarding save/skip, 390/768/1440px plans and sharing, 320/390/768/1440px Notes/preparation, backups, reload persistence and no third-party requests. No assertion was disabled or skipped.

Captures in task outputs: onboarding-refined-1.png through onboarding-refined-6.png, plus onboarding-refined-6-review.png. Use viewport screenshots: the in-app browser's full-page capture distorted some narrow-layout captures; inspected DOM dimensions and normal viewport captures confirm the intended 390px layout. This is a capture limitation, not a verified app-layout failure; independent browser accessibility scans confirm no overflow at 320px.

Native OS permission dialogs, refreshed Android APK, signed iOS/TestFlight and physical-device acceptance have not been verified for this local candidate. Account sign-in remains a separate TestFlight dependency.

## Routine cue and reminder clock correction

A meal, family prayer or bedtime is a personal event, not a known clock time. Step 5 and Settings now call the selection a daily-text cue and label the separate clock field Reminder time. Changing any cue (including Just a clock time) preserves the user's chosen clock; it no longer assigns the legacy before-bed suggestion of 21:30. The final setup review shows both cue and clock. Existing saved clocks, reminder permissions, quiet hours and scheduling rules remain intact. No meal or bedtime detection is implemented.

Validation: 110 affected onboarding, Settings, store and notification tests; lint, formatting, production build and size budgets; production dependency audit (zero vulnerabilities); Chromium smoke and responsive journeys; light/dark 320px accessibility checks (zero violations or overflow). A rendered 390px dark preview confirmed Before bed with a separately chosen 22:15 clock. This correction is local and is not in the previously delivered APK or TestFlight.

## Today visibility correction

Today previously replaced its routine list at the chosen wrap-up time. With the list reopened, the guide, official-site shortcut and review still pushed most routine cards below the phone viewport. Today now renders the routine list before those extras, keeps it present at all times, and removes Hide/Show routines controls. Done for today minimizes only the review. Still time focuses and scrolls to the corresponding visible routine. Stored history, due-day rules, wrap-up scheduling and reminder permissions are unchanged.

Validation: 64 Today component tests, lint/format/build/budgets; rendered 390px evening light/dark layouts and accessibility checks. New browser journey assertions require routines to remain visible before and after Done for today. Native/device distribution is separate.
