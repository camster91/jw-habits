# Current visual foundation

The two DaisyUI theme blocks in src/index.css define neutral surfaces and brand
control colors once per light/dark theme. applyTheme owns the user's accent,
its accessible text shade and resolved appearance before screen paint. Plan
colors and their light/dark text shades are defined in theme/planColours.js.

| Role | Source | Use |
|---|---|---|
| Neutral page/card/text hierarchy | DaisyUI base theme variables | Current screens, sheets, prompts, recovery and local warnings |
| Brand primary controls | DaisyUI primary light/dark values | Shared button/control feedback |
| User accent and contrast-safe accent text | applyTheme / --fd-accent / --fd-accent-text | Routine, progress, garden and widget feedback |
| Plan identity and contrast-safe plan text | planColours / planStyle | Trails, study/family plan summaries and links |
| Share title/group surface | Two retained ios-* primitives | Existing Share appearance; one label token source, no retired Home row/switch system |
| Device safe areas | env(safe-area-inset-*) | Current native screens/sheets/tab bar and PWA banner helper |
| Decorative motion | fd-celebrate, confetti.css, install slide-down | Finite feedback; reduced-motion policy suppresses decorative movement |

Retired Home rows/icons/switches, segmented pickers, floating/tab helpers,
achievement/level/flame/points animations and duplicate iOS token blocks are
removed. Current app-day, log, settings, recovery and theme behavior is unchanged.
The separate original garden/confetti styles are active and retained.

Automated references: the Smoke workflow captures 40 synthetic current-UI PNGs
and runs real-build journeys plus light/dark 320px axe/reflow in Chromium,
Firefox and WebKit. Worker update/offline state preservation remains a separate
Chromium gate. Capture artifacts are references, not an approved pixel baseline.

#196 remains open for an approved complete visual state matrix and physical
landscape/zoom/AT review (#176/#192/#251). In particular, screenshot automation
must not be mistaken for review of install/update/connectivity/recovery, every
focus/disabled/error state or long translated copy. Full es/fr UI is deferred
under #46; the initial UI is English-only (#259).
