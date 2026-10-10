# Faithful Days automated release gates

The current target is WCAG 2.2 AA. Automated checks are a release gate, not an
assertion of full conformance or physical-device assistive-technology support.

## Accessibility and reflow

`npm run a11y` scans the real build at 320 px in light/dark and reduced-motion
mode: onboarding, Today, a completed routine, Settings, Plans, Notes, preparation, Progress, badges
and shared-content preview, plus newer-schema recovery. The recovery case
downloads an actual byte-exact copy and checks that reload preserves the primary
value. Axe A/AA checks include color contrast; page-width
checks reject horizontal overflow. Essential routine details and project context
wrap. Completed labels retain full text contrast, with a checked control as the
completion cue. VoiceOver, TalkBack, keyboard across browser engines, dynamic
text and fluent Spanish/French review remain manual gates (#176/#192/#46).

## Critical coverage and date integrity

CI runs `npm run test:coverage`. Global floors are 85% statements/functions/lines
and 80% branches. Pure domain logic has 95% statement/function/line and 90%
branch floors. Store/migration/notification modules enforce individual floors;
native scheduling, storage and URL safety have their own risk-based floors.
These are deliberately below the measured all-source baseline (87.7% statements,
85.96% branches) and do not require 100%. Unimported application files are
included at zero; browser-owned bootstrap/worker entry points are exercised by
the built browser/worker/container gates. An intentional 100% URL-safety branch
floor was confirmed to fail at 81.81%.

Rollover tests execute isolated Node processes in Toronto, Los Angeles, Tokyo
and Auckland. All daily state follows the approved local 03:00 app-day policy,
including negative/positive offsets, midnight, DST boundaries, year changes
and leap-day arithmetic. This replaces the historical local-midnight proposal.

## Startup, route and precache budgets

Each build prints measured gzip JS/CSS, precache bytes and entry counts. Enforced limits: 210,000 bytes gzip JS,
30,000 bytes gzip CSS and 850,000 bytes precache. `npm run budgets` measures
actual files and the injected worker manifest; a missing manifest also fails.
An intentional 1-byte JS limit was confirmed to fail. These artifact budgets
protect size; they do not substitute for real-device Core Web Vitals.

The `/share` preview is a real lazy import. With workers disabled, startup must
not request its chunk. Installation intentionally precaches its approximately
3 kB raw chunk so an installed PWA can receive shared content while offline.
Vite explicitly empties the output directory to prevent stale bundles from
inflating an update. Notes and Preparation are also real lazy routes, precached for offline
navigation. The remaining screens are eager; no broad lazy-route claim is made.

## Worker install and update

`npm run offline:verify` serves the real build/worker from an isolated local
HTTP server with no-store responses. It installs the worker, records a routine,
and visits lazy Share, Notes and Preparation for the first time offline. Using
fabricated UI input, it creates a note/tags, a dated meeting with a prepared
section, and an assignment with a checked task. Reload and route changes must
retain the workspace, and preparation must not create routine activity.

The drill supplies a changed worker, checks the waiting update and activates it
through the actual Update button. Both routine and workspace values must remain
byte-for-byte unchanged through waiting, activation and offline route/reload
checks. Initial installation must not announce an available update. Workbox's
revision-aware `matchPrecache` serves the offline navigation fallback.

With install-prompt support disabled, updates also run from unknown/newer routine
recovery and separately from unknown/newer workspace recovery. The unknown bytes
and the other store must remain untouched. Offline Notes must retain its disabled
New note control and download an actual byte-exact copy of the unsupported
workspace. Service-worker update detection is independent of the optional
install-prompt API used by some browsers. These browser drills do not certify
native persistence, signed installs or physical-device update behaviour.

## Workflow and runtime policy

`node scripts/verify/workflow-policy.cjs` rejects mutable remote action/reusable
references. Its negative `actions/checkout@main` fixture was confirmed to fail.
Pins are updated through Dependabot PRs, reviewed with their version comments
and normal CI. Node 22 is the contributor/CI/Docker baseline; the app requires
22.12 or newer. The preinstall helper was tested with actual Node 18 and returns
an actionable error before attempting a build.

These gates complement the digest-specific container/PWA/public probes in
[production recovery](production-recovery.md), not store signing or a native
device pilot. Historical audit and listing documents are explicitly marked as
superseded by the current architecture and commitment ledger.

## Browser-engine compatibility

The Smoke workflow also runs independent Firefox and WebKit jobs against the real build: storage/onboarding smoke, complete user journeys and the same light/dark 320px axe/reflow matrix. Image publication requires both exact-commit checks in addition to Chromium and native compile checks. The service-worker update drill and screenshot generator remain Chromium-specific. These engine checks do not certify actual Safari/iOS WebViews, OS share targets, VoiceOver/TalkBack, or physical-device notifications.
