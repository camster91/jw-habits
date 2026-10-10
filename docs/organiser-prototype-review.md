# Connected organiser milestone review — 2026-10-10

## Delivered locally

ORG-01: actual shell navigation now resets scroll and focuses the screen heading after onboarding or new navigation. Lazy screens wait for their heading. History Back restores the saved position. The browser owns manual restoration while the shell is mounted; unmount restores its prior policy. The change preserves existing stores and routine completion semantics.

ORG-02: [data contract](organiser-data-contract.md) selects a separate organiser store, typed relation ownership, civil versus app-day dates, recurrence exceptions and a distinct backup envelope/recoverable restore boundary. This is a proposed contract. Pure validators, fault-injection fixtures, notification reconciliation and durable storage remain implementation work.

ORG-03: interactive, memory-only connected organiser prototype at http://127.0.0.1:4193. Source and screenshots retained in the task's `outputs/faithful-days-review/organiser-prototype/` folder, outside the shipped app. It covers Today, Plan agenda/week/month/tasks, linked note capture/search, task completion/undo/rescheduling, quick Add, separate task/routine progress and theme preview. All sample dates use October 2026; reload resets fabricated records.

Try Today → Prepare for tomorrow's meeting → Add meeting note → save → complete/Undo. Plan → Sunday October 11 → Weekend meeting shows the same note. Notes search finds it. The edited-note close flow preserves or deliberately discards its draft.

## Verification

- Full application suite: 914 tests / 66 files; global and critical-module coverage gates pass. Focused shell/navigation tests verify setup completion, lazy route focus, Back restoration and cleanup.
- Actual built Chromium journey: onboarding starts at scroll zero and focuses Today; Plans starts at top; Back restores the previous Today position; lazy Notes starts at top and focuses its heading.
- Application lint, format, build and size budgets pass; dependency audit reports zero vulnerabilities. Chromium smoke: nine pass. Full responsive journeys pass. Existing 320px light/dark application accessibility scans report zero automated violations/overflow.
- Prototype checks: linked task/meeting/note path, completion/undo, dated task creation, calendar date/week selection, search, edited draft return/discard; all five destinations at 320px light/dark have zero automated accessibility violations and horizontal overflow. Note editor also scanned. No page errors. Retained screenshots inspected visually at 390px and 320px.

These checks do not prove physical-device or assistive-technology acceptance. The prototype has no recurrence engine, actual reminders, backup/restore, external references, full settings or native storage. It is not an installed update. User review of the connected direction remains distinct from automated checks.

## Next bounded action

ORG-04: implement pure organiser models and compatibility/failure fixtures, then its durable client and backup integration before connecting the app screens. Follow [the full plan](connected-organiser-plan.md). Keep navigation fixes, prototype, persisted slice, physical-device review and distribution as distinct evidence. No pushes, issue posting, signing, TestFlight upload or public launch occurred in this milestone.
