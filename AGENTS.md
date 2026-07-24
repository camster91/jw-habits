# AGENTS.md

The authoritative architecture/state reference for this repo is `CLAUDE.md`. Read it first for how the app, routes, and localStorage state model work. Standard dev commands are in `package.json` scripts and `README.md`.

## Cursor Cloud specific instructions

- This is a client-only Vite + React PWA. There is no backend, no database, no auth, and no env vars are required to run it — all state lives in the browser's `localStorage`. Ignore the `VITE_API_URL` / `VITE_NOTIFICATION_KEY` example env block in `README.md`; nothing in `src/` reads them.
- Dev server: `npm run dev` serves on `http://localhost:5173/` (not 4173). The single user-facing page is the home habit list; the "hello world" flow is tapping a row's checkbox to mark a habit done, which reveals the streak/progress line and fills today's weekly dot.
- Lint / test / build: `npm run lint`, `npm run test` (Vitest, jsdom — no browser needed, 273 tests / 17 files as of 2026-07-24), `npm run build`.
- `npm run build` prints a harmless `inlineDynamicImports option is deprecated` warning from vite-plugin-pwa 1.3 — this is a known upstream deprecation, not a build failure.
- The Playwright-based smoke/persona scripts (`npm run smoke`, `npm run verify:persona`) additionally require a one-time `npx playwright install chromium`; they are not part of normal lint/test/build.
- Capacitor iOS/Android (`cap:*`, `mobile:*`, `android:*`) needs Xcode / Android Studio and does not run in this Linux VM; stick to the web PWA for verification here.
