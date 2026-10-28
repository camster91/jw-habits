# Release platform targets and evidence

Faithful Days is a phone-only app (iOS and Android) as of 5.3.0. This separates
configured build minimums, tested automation and manual release targets. Owner: Cameron / Ashbi Design. Revisit each release; deprecations require
release notes and an explicit compatibility/data-export review.

| Surface | Current configuration/evidence | Release gate |
|---|---|---|
| iOS/iPadOS app | Xcode project minimum iOS 15; unsigned simulator compile passes | Signed physical iPhone/iPad install, offline/backup, reminders, safe areas and large text |
| iOS widget | WidgetKit extension minimum iOS 17; embedded target and App Group entitlements compile | Signed App Group access, row check-in, rollover and widget reinstall on a device |
| Android app/widget | Project min SDK 24, target/compile 36; debug compilation passes | Physical install, current WebView, widget sizing/taps, notification permissions and restart/rollover |
| Chromium engine (test harness) | CI Chrome 151 runs smoke/journeys and 320px light/dark axe/reflow against `vite preview` | Not a product surface; stands in for the Android WebView until devices are checked |
| Firefox engine (test harness) | Playwright 1.62 bundled engine passes the same smoke/journeys and axe/reflow matrix on Ubuntu | Not a product surface |
| WebKit engine (test harness) | Playwright 1.62 bundled engine passes the same matrix on Ubuntu | Actual iOS WKWebView, keyboard and VoiceOver checks on a device |
| Legacy browsers/OS below configured native minimums | No release commitment | Not covered by current release gates |

Viewport targets: 320 px minimum CSS width; phone portrait and landscape and
OS dynamic/large text. Existing journeys cover 390/768/1440 px, with automated
accessibility/reflow at 320 px. Landscape/virtual keyboard, long translated
text and native safe-area checks require the remaining matrix. Do not force an unsupported landscape
promise from portrait-only screenshots.

Interaction targets: visible keyboard focus, native radio/checkbox behavior,
non-color completion cues, WCAG 2.2 AA contrast/reflow and reduced motion.
VoiceOver and TalkBack must be exercised on physical devices; automated axe
cannot certify those flows. Cameron owns recruitment/device sign-off; CI owns
the repeatable build/browser gates.

There is no web or PWA target: the website was retired on 2026-10-28 and the
app bundle is served only from inside Capacitor's WebView. Custom-protocol/JW
Library installed/absent fallbacks require device verification before
advertising support.

#183 remains a reviewed-target decision until the owner accepts the matrix;
#176/#181/#192/#197/#251 track implementation/manual evidence. Compilation and
browser-harness checks do not establish signed native or store readiness.
