# Habit Tracker

A private, offline-first daily habit tracker for iOS, Android and the web. No account, no backend, no tracking.

## What it does

Habit Tracker is a mobile-first progressive web app, also packaged for iOS and Android with Capacitor. The home screen is a short, iOS-style list of daily routine rows (daily reading, Bible reading, meeting prep, family worship, this week, events). Tap a row to open a link you saved for it; tap the checkbox to mark it done for today.

The app ships with no destination links or content of its own. Each row opens a link the user enters in Settings, or nothing at all if the slot is left empty, so the rows also work as a plain checklist. All state lives on the device in `localStorage`; there is no server, no login and no analytics.

## Features

- **Daily checklist** with per-row notes (up to 200 characters) that resets at local midnight
- **Streaks**: current streak, all-time best, and a 7-day dot strip on the home screen
- **User-defined links**: each row opens a link you save yourself, validated before it is opened
- **Bible-reading schedule**: a bundled 366-entry reading plan (labels only) with its own daily tracker
- **Meeting-day aware**: the "Today" row label follows your midweek and weekend meeting-day settings
- **Reminders** with a configurable time and quiet hours
- **Share target**: links shared from other apps can be received, and only opened if the host matches one of your saved links
- **Installable PWA** with a Workbox service worker, offline support and an update prompt
- **Native shells** for iOS and Android with haptics, status bar, keyboard and splash screen handling
- **Three languages**: English, Spanish and French (auto-detected)
- **Light and dark mode**

## Tech stack

| Layer | Technology |
|---|---|
| UI | React 19, React Router 7 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4, DaisyUI 5, lucide-react icons |
| i18n | i18next, react-i18next |
| Dates | date-fns |
| Mobile | Capacitor 8 (iOS + Android) |
| PWA | vite-plugin-pwa, Workbox (custom `src/sw.js`) |
| Testing | Vitest, Testing Library, Playwright |
| Quality | ESLint 9, Prettier 3, CodeQL, gitleaks |
| Container | Multi-stage Docker build (Node builder, nginx runtime) |

## Getting started

Requires Node 18 or newer.

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

## Testing

```bash
npm test                 # unit tests (Vitest)
npm run test:coverage    # unit tests with v8 coverage
npm run smoke:spawn      # Playwright smoke suite, starts vite preview itself
npm run journeys         # end-to-end UI journeys (run `npm run preview` first)
```

The journey suite drives the real UI: it saves a link in Settings, checks that the rows pick it up, enters an invalid link and checks the warning, ticks a checkbox, reloads, and confirms the state survived.

## Project structure

```
src/
├── App.jsx              # Router (home, /share, catch-all) and PWA chrome
├── sw.js                # Workbox service worker
├── pages/
│   ├── Home.jsx         # The main (and only) screen
│   └── Share.jsx        # Share-target landing
├── components/          # Settings accordion, install/update prompts, error boundary
├── hooks/               # useHabitState (per-day state, streaks), usePWA
├── locales/             # en, es, fr
└── utils/               # streaks, reading schedule, link validation, settings store, native wrappers
android/                 # Capacitor Android project
ios/                     # Capacitor iOS project
scripts/verify/          # Playwright smoke and journey suites
```

## Design notes

- **No backend, no auth, no sync.** The app is a personal memory aid and keeps everything on the device. Clearing site data clears your history.
- **No bundled external links.** Destinations come only from the user's own settings.
- **Storage keys are stable.** The `jw-` prefixed `localStorage` keys are persistence keys used by existing installs and are kept for backward compatibility.
- **No analytics, telemetry, ads or in-app purchases.**

See [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) for the privacy policy.

## License

MIT, see [LICENSE](./LICENSE).
