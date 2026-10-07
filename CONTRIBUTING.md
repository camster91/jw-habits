# Contributing to Faithful Days

Read `CLAUDE.md` for the current architecture and `docs/roadmap.md` for active commitments. Historical audits describe earlier builds.

Use Node 22 (`.nvmrc`), then `npm ci`. Unsupported engines fail installation. Run lint, tests, format check, build, audit, smoke and responsive journeys for changes to application behavior. Native changes also need the Android debug and iOS simulator compile checks; unsigned compile does not replace physical-device QA or signing.

Create `agent/<issue-number>-short-description` branches and draft PRs for one reviewable slice. Never push to main directly. Link the controlling issue, explain the resulting behavior, include evidence, and provide state migration and rollback details. Merge only after applicable checks pass on the actual head and review findings are resolved. Close issues only when their target-environment acceptance criteria pass. Record blocked account/device work explicitly.

All activity stays on-device. Use the durable store adapter and pure domain writers, validate persisted schema changes, preserve migration backups, and never commit private notes, keys or credentials. No JW-owned content or logos may be bundled.

Main requires the `Build + Lint + Test`, `Playwright smoke`, image build and relevant native compile checks. The repository currently has no ruleset: enabling enforceable protection is the remaining administrator action in #175. Written policy does not imply GitHub enforcement.
