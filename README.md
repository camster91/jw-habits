# Faithful Days

A calm, private routine tracker for iOS, Android and the web. Faithful Days keeps six spiritual routines in one place (the daily text, Bible reading, meeting prep, family worship, personal study and the ministry): Today shows what is due and a long press checks it off, Progress shows how the weeks are going, and gentle reminders and home-screen widgets are optional. There is no account, no backend and no tracking, and everything stays on the device. It is an independent app and contains no third-party content.

## Tech stack

| Layer | Technology |
|---|---|
| UI | React 19, React Router 7 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4, DaisyUI 5, lucide-react icons |
| i18n | i18next, react-i18next |
| Mobile | Capacitor 8 (iOS + Android), local notifications, home-screen widgets |
| PWA | vite-plugin-pwa, Workbox (custom `src/sw.js`) |
| Testing | Vitest, Testing Library, Playwright |
| Quality | ESLint 9, Prettier 3, CodeQL, gitleaks |
| Container | Multi-stage Docker build (Node builder, nginx runtime) |

## Getting started

Requires Node 22.12 or newer. `.nvmrc` selects Node 22.

```bash
git clone https://github.com/camster91/jw-habits.git
cd jw-habits
npm install
npm run dev
```

Then open http://localhost:5173. If the `sharp` native build fails on macOS, use `npm install --ignore-scripts`.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build to `dist/` (includes the service worker) |
| `npm run preview` | Serve the production build at http://localhost:4173 |
| `npm run lint` | ESLint |
| `npm run format:check` | Prettier check (`npm run format` to write) |

### Mobile

```bash
npm run mobile:ios       # build, sync and open Xcode
npm run mobile:android   # build, sync and open Android Studio
```

The iOS widget needs a one-time Xcode setup: see [docs/ios-widget-setup.md](./docs/ios-widget-setup.md). Run [docs/release-checklist.md](./docs/release-checklist.md) on a real device before every store release.

## Testing

```bash
npm test                 # unit tests (Vitest)
npm run test:coverage    # unit tests with v8 coverage
npm run smoke:spawn      # Playwright smoke suite, starts vite preview itself
npm run journeys         # end-to-end UI journeys (run `npm run preview` first)
```

The journey suite drives the real UI with the browser clock pinned: onboarding (full and skip paths), hold-to-check and undo, switching a routine off, renaming one, the ministry toggle, and the evening wrap-up at 21:00. See [CLAUDE.md](./CLAUDE.md) for the source layout and the rules for changes.

## Design notes

- **No backend, no auth, no sync.** The app is a personal memory aid and keeps everything on the device. Clearing site data clears your history.
- **No third-party content.** Links to jw.org and JW Library are built from public facts or entered by the user; the optional What's New check reads only dates from jw.org's public feed.
- **Storage keys are stable.** The `jw-` prefixed storage keys are persistence keys used by existing installs and are kept for backward compatibility.
- **No analytics, telemetry, ads or in-app purchases.**

See [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) for the privacy policy.

## License

MIT, see [LICENSE](./LICENSE).


### Faithful Days 5.1

Create study projects and family worship plans from the Plans tab. Today shows
the next study step and the week's agenda, with check-in and undo. Progress adds
a growing garden, optional points and levels, and a collection of 18 badges.
Share encouragement cards from a finished project, earned badge, Progress or
Sunday recap. Cards are created on-device; the web version downloads PNGs.
Settings → Look controls points/levels and sharing. Existing version 2 data
upgrades automatically and the original is preserved as a backup.

Native JW Library hand-off and card sharing need the device release checklist
before a mobile release. The widget remains subject to its existing device checks.
