# jw-habits — Post-Merge Review (2026-07-23)

**Repo:** `camster91/jw-habits` · main · v4.2.0 · iOS build 421
**Subject:** PR #130 squash-merged as commit `d5d93f6` at 2026-07-23 19:29 UTC
**Reviewer:** Hermes (direct verification — subagent 401 retry avoided per memory rule)
**Method:** Re-ran every gate, re-verified every P0/P1/P2 fix landed, regression-injected the P0-4 fix to confirm smoke suite catches it on the merged build.

---

## TL;DR

**PR #130 landed cleanly.** All 6 P0s, all 5 P1s, all 3 P2s verified on `main`. Smoke 7/7. Audit 0 vulns. Zero merge artifacts (`git diff a44bf74..HEAD` is empty). Local HEAD == remote HEAD.

**No new issues introduced by the merge.** The two untracked docs (`REVIEW-2026-07-22-EVENING.md`, `ROADMAP-2026-07-23.md`) are intentional planning artifacts.

---

## Post-merge gate verification (just ran)

| Gate | Result |
|---|---|
| `npm run lint` | ✅ clean |
| `npm test` | ✅ 287/287 (was 284 pre-PR; +3 from streak regression tests) |
| `npm run format:check` | ✅ clean |
| `npm run build` | ✅ 14 entries / 493.02 KiB precache (vite-plugin-pwa deprecation warning is internal, deferred to dependabot) |
| `npm audit` | ✅ 0 vulnerabilities (was 6 pre-PR) |
| `npm run smoke:spawn` | ✅ 7/7 — including S3 (P0-4 regression detection) |
| `git diff a44bf74..HEAD` | ✅ empty (no merge artifacts) |
| Local HEAD vs remote HEAD | ✅ `d5d93f6` == `d5d93f6` |

---

## Per-fix re-verification (post-merge)

| Fix | Verification | Result |
|---|---|---|
| P0-1 runbook | `grep -rE "jwnews2024*" . --exclude-dir=.git` → empty | ✅ no literal leaks |
| P0-2 Dockerfile nginx | `COPY nginx.conf`, `USER nginx`, `HEALTHCHECK`, `nginx:1.27-alpine` | ✅ all present |
| P0-3 deploy workflows | `git ls-files .github/workflows/` shows only the 6 expected | ✅ 4 deleted, 1 added (smoke.yml) |
| P0-4 streak.js fix | `if (isDone(done, k)) count++` at line 112 | ✅ |
| P0-5 push-notifications | Not in package.json or capacitor.config.json | ✅ |
| P0-6 api-server block | Only the removal comment remains | ✅ |
| P1-1 CLAUDE.md rewrite | Contains updated stack, source tree, state model, routes | ✅ |
| P1-2 format gate | `npm run format:check` in ci.yml (line 50-55) | ✅ |
| P1-3 zustand | Not in package.json or package-lock.json | ✅ |
| P1-5 Dockerfile hardening | nginx:1.27-alpine pin, USER nginx, HEALTHCHECK | ✅ |
| P1-9 npm overrides + sharp | audit 0 vulns | ✅ |
| P2-10 lint.yml + format.yml | Deleted; folded into ci.yml (8 named steps: Checkout, Setup Node, Install, Lint, Unit tests, Build, Format check, gitleaks) | ✅ |
| P2-10a root cjs moves | scripts/verify/ + scripts/marketing/ populated; root empty | ✅ |
| New: smoke suite | scripts/verify/smoke.cjs has 7 tests S1-S7 | ✅ |
| New: smoke workflow | .github/workflows/smoke.yml runs on push + PR | ✅ |
| New: gitleaks | `gitleaks/gitleaks-action@v2` step in ci.yml | ✅ |
| Literal redaction | `grep -rE "jwnews2024(securerelease|secure|release)" . --exclude-dir=.git` → empty | ✅ |

---

## Regression detection re-verification

Already verified before PR creation, but re-confirmed on the merged build:

```
[PASS] S7: Home renders without console errors
[PASS] S1: Per-day reset wipes yesterday's done state
[PASS] S2: Done state persists across reload (new shape)
[PASS] S3: Note-only row (done:false, note:"in progress") does NOT count as done
[PASS] S4: Legacy boolean done shape (true/false) still counts correctly
[PASS] S5: New {done, note} shape round-trips through localStorage
[PASS] S6: First-launch hint visible before first tap, hidden after

[smoke] 7 passed, 0 failed (7 total)
```

---

## What I didn't find (good signs)

- ✅ **No new console.log / debugger statements** introduced in src/
- ✅ **No new TODOs / FIXMEs** in src/
- ✅ **No leftover zustand / push-notifications references** in source (only in `REVIEW-2026-07-22.md` historical documentation, which is correct)
- ✅ **No leftover deploy-coolify / deploy.yml references** in source (only in stale comment block in `deploy-ashbi.yml` — already flagged as P3-2 / issue #145, not fixed in this PR)
- ✅ **No merge artifacts** (squash merge produced a clean single commit on top of `main`)

---

## Outstanding items (now tracked in 15 GitHub issues)

All the deferred work from both prior reviews is now filed as `#132`-`#146` on `camster91/jw-habits`. Umbrella `#131` is closed with a full post-merge summary.

### Highest-priority follow-ups (in ship-order)

1. **#134 — gitleaks end-to-end verification** (10 min, code-reviewer) — unverified gate
2. **#138 — delete dead `storageErrorHandler.js`** (10 min) — pure dead-code cleanup
3. **#145 — trim deploy-ashbi.yml comment** (2 min) — cosmetic
4. **#146 — add @vitest/coverage-v8** (15 min) — coverage gate
5. **#144 — Dockerfile digest-pin** (5 min) — supply-chain hardening
6. **#135 — README rewrite** (30 min) — onboarding drift
7. **#142 — fix notificationScheduler test tautologies** (30 min) — test hygiene
8. **#137 — vite-plugin-pwa bump** (45 min) — deprecation fix
9. **#139 — PWA shortcut reconciliation** (1 hr) — UX
10. **#143 — ISO-week consolidation** (1-2 hr) — refactor
11. **#141 — jwLibraryLinks split** (3-4 hr) — refactor
12. **#140 — Home.jsx split** (6-8 hr) — refactor
13. **#136 — component tests** (4-6 hr, AFTER #140 lands) — coverage
14. **#132 — Google Play keystore rotation** (external, 7-day window)
15. **#133 — git history purge** (destructive, after #132)

Total: ~30 hours of code work + 2 external coordination items.

---

## Untracked artifacts (your call whether to commit)

These are intentionally untracked — same convention as `REVIEW-2026-07-22.md` (which got committed) and the prior docs:

- `REVIEW-2026-07-22-EVENING.md` — second audit
- `ROADMAP-2026-07-23.md` — ship-order with effort estimates
- `REVIEW-2026-07-22.md` — first audit (committed in PR #130)
- `REVIEW-2026-07-22-EVENING.md` (this file's sibling) — untracked
- `docs/keystore-rotation-2026-07.md` — committed in PR #130

My recommendation: commit `REVIEW-2026-07-22-EVENING.md` and `ROADMAP-2026-07-23.md` to preserve them — they're useful for future audits. Or .gitignore them with a `planning/` line. Either is fine.

---

## Kanban state

- `~/.hermes/kanban/camster91.state.json` — 230 open issues, 16 jw-habits (#131 closed, #132-146 open)
- `~/.hermes/kanban/camster91.md` — regenerated, jw-habits section visible
- `~/.hermes/kanban/dispatches.json` — top-5 batches written; jw-habits appears as batch 5/5 (secrets-history-scanner on the 3 P0s)
- Cron dispatcher will pick up jw-habits on its next 6h tick

---

## The 3 external items on Cam's plate

1. **#132 — Google Play keystore rotation** — generate new keystore + request upload-key reset (7-day window). Runbook at `docs/keystore-rotation-2026-07.md`.
2. **#133 — git history purge** — BFG/filter-repo after #132 completes.
3. **Merge PR #130** — done ✅ (this report)

Everything else is code work I can pick up whenever you say go. Standing by.