# Faithful Days automated release gates

The current target is WCAG 2.2 AA. Automated checks are a release gate, not an
assertion of full conformance or physical-device assistive-technology support.

## Accessibility and reflow

`npm run a11y` scans the real build (served by `vite preview` as a test harness) at 320 px in light/dark and reduced-motion
mode: onboarding, Today, a completed routine, Settings, Plans, Progress, badges
and the Dates card, plus newer-schema recovery. The recovery case
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
the built-app gates (smoke, journeys, accessibility). An intentional 100% URL-safety branch
floor was confirmed to fail at 81.81%.

Rollover tests execute isolated Node processes in Toronto, Los Angeles, Tokyo
and Auckland. All daily state follows the approved local 03:00 app-day policy,
including negative/positive offsets, midnight, DST boundaries, year changes
and leap-day arithmetic. This replaces the historical local-midnight proposal.

## Bundle budgets

Each build prints measured gzip JS/CSS. Enforced limits: 210,000 bytes gzip JS
and 30,000 bytes gzip CSS. `npm run budgets` measures the actual files in
`dist/`. An intentional 1-byte JS limit was confirmed to fail. These artifact
budgets protect size; they do not substitute for real-device startup timing.
Vite explicitly empties the output directory to prevent stale bundles. Screens
are eager; no lazy-route claim is made. There is no service worker, precache or
offline-update drill: the app ships inside the native package.

## Workflow and runtime policy

`node scripts/verify/workflow-policy.cjs` rejects mutable remote action/reusable
references. Its negative `actions/checkout@main` fixture was confirmed to fail.
Pins are updated through Dependabot PRs, reviewed with their version comments
and normal CI. Node 22 is the contributor and CI baseline; the app requires
22.12 or newer. The preinstall helper was tested with actual Node 18 and returns
an actionable error before attempting a build.

These gates do not replace store signing or a native device pilot. Historical audit and listing documents are explicitly marked as
superseded by the current architecture and commitment ledger.

## Browser-engine compatibility

The Smoke workflow also runs independent Firefox and WebKit jobs against the real build as a test harness: storage/onboarding smoke, complete user journeys and the same light/dark 320px axe/reflow matrix. Image publication no longer exists; native compile checks gate the phone builds. The screenshot generator is Chromium-specific. These engine checks do not certify the iOS or Android WebView, VoiceOver/TalkBack, or physical-device notifications.

## Pages

Cloudflare Pages (project `faithful-days`, account with the `ashbi.ca` zone) publishes `site/` (privacy and support) from `main` to https://faithfuldays.ashbi.ca on every merge; there is no workflow in this repository for it.
