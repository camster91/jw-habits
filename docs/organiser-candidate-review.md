# Faithful Days 5.3.0 organiser candidate

Prepared locally 2026-10-10 on `agent/261-colour-and-jw-links`. Source identity and
artifact hashes are recorded in the external delivery ledger after the local commit.
This record distinguishes implementation, host verification and physical/store acceptance.

## Implemented behavior

- Today: short agenda, due tasks, tap/undo routines, manual additional routines and separate references. The evening review never hides routines.
- Plan: Agenda, Week, Month and Tasks, date selection, selected-day month agenda, task search/filter, recurring items, skip/reschedule/future edits, completion/undo and archive/restore.
- Notes: quick body capture, optional metadata, typed task/event attachments, related filters, task-from-note and stable retry IDs. An untouched starter closes immediately; edited drafts expose visible Keep editing/Discard choices.
- Preparation: workspace meetings and assignment checklists remain their owning records. Existing study/family next steps remain available; future family weeks and completed plans expand on request.
- Setup/settings: selected-routine fast path with own-pace new reading; guided setup; tracking-date explanation and interactive example; clock times distinct from cues; grouped settings and direct Backup shortcut.
- Recovery: distinct three-store backup envelope, legacy import compatibility, pre-import recovery copy, journal, per-store readback, startup gate and recovery/export after interrupted restore. Unsupported data is retained and exportable.
- Time/reminders: civil task/event dates, device-local event display, fixed IANA event recurrence, floating task times, DST resolution preview, quiet-hours planning and serialized native reconciliation. Version/build defaults are 5.3.0/530; store availability of build 530 has not been checked.
- Presentation: existing original illustrations and warm activity colors retained; useful weekly/reading information precedes the optional garden; reduced motion and narrow layouts preserved. CSS discovery is restricted to application sources to keep the offline bundle within its existing budget.

## Verification record

The unit/coverage, lint, formatting, audit, build/budgets and exact final browser
results are written to the delivery ledger. The repository's `organiser:verify`
script uses fabricated data and covers fast setup → recurring event → linked
preparation task → note → task-from-note → complete/undo → reload → full backup
restore at 320/390/768px in light/dark, with automated accessibility and network/console checks.
Existing smoke/journeys/accessibility and the real service-worker offline/update
script remain required. The worker test now also preserves organiser edits.

Current jw.org terms were read on 2026-10-10:
[Terms of Use](https://www.jw.org/en/terms-of-use/). The optional What's New routine
records only the user's manual check-in and opens the official link separately.
No site collection, copied publications, publisher graphics/logos or unseen-update
claims were added. This is the implementation boundary, not a legal certification.

## Remaining limits and release gates

- Recurring list windows cover past 90/next 180 days; the calendar can inspect other dates. Events span at most one year. Monthly absent dates are skipped.
- Future-series splits preserve historical exceptions; existing note/preparation relations remain with their original segment. This behavior is explicit rather than silently moving past preparation.
- A nonrepeat record can be rescheduled while retaining identity. Making it recurring is an explicit new record. Weekly personal routines retain deliberate day entries with weekly totals.
- Three-key restore is recoverable sequential work, not atomic. A journal/backup that cannot be written blocks restore. Legacy routine storage retains its existing conflict behavior.
- Native reminder planning is tested on the host; physical permission, timing, DST/travel delivery, background behavior, widget and notification-capacity refresh are unverified.
- OS capture/share extensions, physical assistive technology, household pilot and store acceptance are not proven by the web UI.
- Native compile requires GitHub Actions. Push/PR publication, signing/upload and store submission require exact owner authorization and available credentials. No new APK/IPA/TestFlight build is represented by this web candidate.

## Rollback

Export all three stores before moving to an older app. Older clients reject the
new backup envelope and do not read the organiser key; downgrading does not make
organiser data usable there. A legacy routine/workspace import keeps organiser
data. Recovery restores the validated pre-import snapshot; no silent truncation,
reset or cross-store cascade is used. Cameron owns physical-device backup/restore
acceptance and the signed distribution/account gates.
