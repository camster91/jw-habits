# Release platform targets and evidence

This separates configured build minimums, tested automation and manual release
targets. Owner: Cameron / Ashbi Design. Revisit each release; deprecations require
release notes and an explicit compatibility/data-export review.

| Surface | Current configuration/evidence | Release gate |
|---|---|---|
| iOS/iPadOS app | Xcode project minimum iOS 15; unsigned simulator compile passes | Signed physical iPhone/iPad install, offline/backup, reminders, safe areas and large text |
| iOS widget | WidgetKit extension minimum iOS 17; embedded target and App Group entitlements compile | Signed App Group access, row check-in, rollover and widget reinstall on a device |
| Android app/widget | Project min SDK 24, target/compile 36; debug compilation passes | Physical install, current WebView, widget sizing/taps, notification permissions and restart/rollover |
| Chromium browser | CI Chrome 151; smoke/journeys, 320px light/dark axe/reflow and SW offline/update | Physical Android/desktop spot checks and large text |
| Firefox engine | Playwright 1.62 bundled engine passes real-build smoke/journeys and light/dark 320px axe/reflow on Ubuntu | Physical browser/keyboard and platform-specific PWA/notification checks |
| WebKit engine | Playwright 1.62 bundled engine passes the same real-build compatibility matrix on Ubuntu | Actual Safari/macOS/iOS WebView and OS share/keyboard/AT checks |
| Safari and Edge applications | Target current stable versions; actual applications not certified by engine automation | Device/application spot checks, PWA differences and offline/update evidence |
| Legacy browsers/OS below configured native minimums | No release commitment | Not covered by current release gates |

Viewport targets: 320 px minimum CSS width; phone portrait and landscape,
tablet and desktop; 200% browser zoom and OS dynamic/large text. Existing
journeys cover 390/768/1440 px, with automated accessibility/reflow at 320 px.
Landscape/virtual keyboard, zoom, long translated text and native safe-area
checks require the remaining matrix. Do not force an unsupported landscape
promise from portrait-only screenshots.

Interaction targets: visible keyboard focus, native radio/checkbox behavior,
non-color completion cues, WCAG 2.2 AA contrast/reflow and reduced motion.
VoiceOver and TalkBack must be exercised on physical devices; automated axe
cannot certify those flows. Cameron owns recruitment/device sign-off; CI owns
the repeatable build/browser gates.

PWA target: install where the browser supports it; offline app navigation and
lazy shared-content preview after successful install; user-controlled update
activation preserving storage. Browser notification support remains distinct
from native local reminders. Custom-protocol/JW Library installed/absent
fallbacks require device verification before advertising support.

#183 remains a reviewed-target decision until the owner accepts the matrix;
#176/#181/#192/#197/#251 track implementation/manual evidence. Compilation and
web checks do not establish signed native or store readiness.
