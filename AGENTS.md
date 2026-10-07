# AGENTS.md

The authoritative architecture/state reference for this repo is `CLAUDE.md`. Read it first for how the app, routes, and localStorage state model work. Standard dev commands are in `package.json` scripts and `README.md`.

## Development contract

Read `CONTRIBUTING.md` and `docs/roadmap.md`. Use Node 22 (`.nvmrc`), `npm ci`, and the scripts in package.json. The current app is Faithful Days: Today, Plans, Progress and Settings, with v3 state under the frozen `jw-habits-v2` key. The app day rolls at local 03:00. No backend or app secrets are needed for web development.

Use web unit/lint/build checks locally. Native compilation runs in GitHub Actions with JDK/SDK and macOS/Xcode; physical-device checks and store signing remain separate release gates. Do not report them complete from web tests.
