# Faithful Days product review and proposed target

Reviewed 2026-10-09 against local head c82729e201a9092e64f24b077d879d81daae973c at http://127.0.0.1:4189/. This is the local web candidate, not a new APK or TestFlight build. Used the in-app browser at 390×844 with fabricated review data only. No production, store or account changes. No application code changed in this audit.

## Verdict

Functional foundation, unfinished product experience. The core study-plan → Today → recorded check-in → Progress path works, and contextual notes work. The app still makes the user interpret its architecture: different activity frequencies look alike, configuration comes before value, help labels imply actions they do not perform, and navigation can land below the screen introduction. More colour and explanatory paragraphs have improved presentation without resolving those product decisions.

## Why it feels half baked

1. Feature completeness was treated as a substitute for a coherent daily journey. Tests can verify the chosen behavior, including an unwanted automatic collapse, without proving that it is good product behavior. This is a process diagnosis inferred from the present UX and recent changes, not a claim that the technical work is fake.
2. The model fixes six routines, while the product language promises Make it your own. Existing customization means choosing, renaming and scheduling those six; it does not add an Explore what’s new habit. That mismatch is a product decision, not evidence that linking and recording a self-reported action must be excluded.
3. Daily routines, weekly goals, scheduled events and monthly ministry records share a checklist and a daily-steps count. The screen does not clearly communicate what each check-in means or when it resets.
4. Help and reassurance have become additional page content instead of contextual teaching attached to an action. The misleading Make Today your own label is still present; the proposed rename has not been implemented.
5. Some launch evidence is about code/tests rather than the experience on the phone. Four newer local commits are ahead of the delivered bc5df60 APK; mixing these states obscures what the user is actually testing.

## What the app should be

An independent, private spiritual-routine companion: open it, see the next useful thing, open your own or official reference, record what you did, capture an idea if useful, and return tomorrow without pressure. Today answers What can I do now? Plans answers What am I preparing for? Notes preserves my thinking. Progress shows useful patterns. Settings supports these tasks instead of becoming a second onboarding.

- Today: routine cards first, explicit completion action and clear daily/weekly/monthly labels. Show the active study step and upcoming preparation where relevant. Review is optional and never blocks activities.
- Routine choice: keep the six built-in routines; propose optional Explore what’s new with a chosen cadence and a manual check-in. Opening a page alone is not completion. Consider additional personal routines only through a documented, backward-compatible extension; preserve old check-ins and exports.
- First use: choose a few routines, then do one useful action. Add schedule, reminders and appearance when relevant; retain an advanced setup path rather than forcing all configuration.
- Plans: show current study, this week’s family agenda and next preparation date before catalogues/forms. Every plan offers a clear next step and contextual notes.
- Progress: weekly recorded activity and personal reading position first; optional garden/celebration underneath. No ranking or claim that activity measures spirituality.
- Character: a consistent original illustration vocabulary and distinct routine colours; brief helpful responses, gentle motion, useful empty-state starters. Repeated artwork and larger cards alone do not provide personality.
- Trust: activity stays on-device, backup is easy to find, reminder state is explicit, and official material opens externally. This audit is not a legal determination of publisher terms.

## Proposed completion order and acceptance gates

### P0: make the core experience coherent

1. Fix scroll/focus when finishing onboarding and changing top-level screens. Acceptance: a fresh phone journey reaches the intended heading and first action, not the old scroll position.
2. Finish Today hierarchy and completion semantics, replace the misleading help label, and decide whether Explore what’s new is a supported optional routine. Acceptance: a user can distinguish open reference, help, customize and complete without guessing; midnight/03:00, weekly and monthly records retain correct meaning.
3. Simplify first use and default choices. Acceptance: choose routines → record first action without required theme/reminder configuration; later preferences preserve history.
4. Unify reminder preferences. Acceptance: selected cue, clock, global enabled state, routine exclusions, quiet hours and native permission are understandable together; no promises that the app detects life events.

### P1: connect the helpful features

5. Show the next study/preparation/family action, fold repeated empty weeks, shorten note forms, and replace passive feature guides with task-specific starters. Acceptance: study/agenda/preparation → Today → optional note → Progress is understandable with no invented completion.
6. Group Settings and put useful progress ahead of the reward panel. Acceptance: backup and reminder status are easy to locate; a new user sees useful guidance instead of a wall of annual zero counts.
7. Apply consistent imagery, colour, copy and motion after those flows work. Acceptance: visual elements distinguish tasks, fit both themes, remain readable at 320px and do not bury the primary action.

### P2: release the reviewed product

8. Freeze one candidate, run affected regression/accessibility/offline/backup checks, build native CI for that exact head, and perform physical Android/iPhone journey and export/restore checks. Signed upload/processing, actual TestFlight access and store acceptance remain separate evidence. No launch-ready claim from this review.

## Scope and evidence limits

Captured all six onboarding steps and the main screens, plus a populated study plan and one contextual note. Demonstrated plan creation, note save, a deliberate study check-in, next-step advancement and visible Progress. Meeting/assignment and family screens were inspected, not fully submitted. Current run used the light browser theme; user-provided earlier dark screenshots are context rather than this run’s audit evidence. Native reminders, permission dialogs, physical-device touch/voice/screen-reader behavior, signing and restore were not exercised. Contrast, target size, dense scrolling and focus are visible risks; this review does not certify WCAG compliance. External publisher pages were not opened or scraped.

## Screenshot walkthrough

1. **Welcome — Needs simplification.** Warm original artwork and an honest local-data notice. Several explanatory blocks and six-step/default paths compete before a useful action; primary buttons are below the initial phone view. Reduce initial setup to selecting routines and beginning.

2. **Routine selection — Useful but limited.** Descriptions and switches explain the six built-in routines. All six start selected; rename is the only kind of routine customization. Proposed additional routines need a supported data extension, not relabeling an existing routine or silently changing frozen IDs.

3. **Weekly schedule — Mostly clear.** Meeting and family days are understandable. No meeting days is allowed, creating a later setup prompt. Ask only for schedules relevant to selected routines; retain later editing.

4. **Reading setup — Useful, demanding default.** Year plan and own pace are explained. Whole Bible in a year starts selected. Make pace an intentional choice or offer own pace as a gentler starting point; do not present zero chapters as immediately behind.

5. **Rhythm and reminders — Too much in one step.** The cue/clock correction is visible. The first phone viewport is consumed by that section; evening review, encouragement and notification explanation follow. Offer reminders after the first useful action and separate reminder controls from review preferences.

6. **Appearance and confirmation — Useful confirmation, late payoff.** The preview is clearly decorative and the draft summary is honest. Appearance still occupies a full guided step before the first routine action, though Skip and Start with defaults are available; offer choosing a look later.

7. **Today first arrival — Needs navigation and hierarchy fixes.** After Start my first day, the observed viewport landed near the bottom of Today, showing the review, guide and shortcut. Capture 07b-today-top.png shows the top after manual scrolling. Recent source now keeps routines present, but navigation scroll continuity still undermines the first impression. Daily steps also mixes daily/weekly/monthly activity.

8. **Plans entry — Capable, too many competing paths.** Study, family plans, weekly family agendas and preparation have separate entry points. Their distinctions are accurate but require reading. Present the next upcoming event or active study first, then clear creation choices.

9. **Populated study plan — Working connection, sparse action guidance.** Created a fabricated Mark plan with sixteen steps. It became the current study plan, supplied Mark 1 on Today, and advanced to Mark 2 after a real check-in. The long trail and help panel precede clear study actions; prioritize next step, open reference, capture note and check-in.

10. **Contextual notes — Working, too much metadata up front.** A note created from the plan saved and retained its plan context (10b-saved-note.png). Title/body are useful; tags, link counts and limits dominate a first note form. Fold optional metadata and make the attached plan visible while composing.

11. **Meeting and assignment preparation — Useful but form-heavy.** Real type/date/checklist controls exist. The empty screen opens both meeting and assignment forms; headings and explanatory caveats consume much of the viewport. Offer Add meeting or Add assignment with an upcoming-event summary; this pass did not submit either form.

12. **Family worship weeks — Repetitive empty state.** Nine week sections are present in the observed DOM, mostly Nothing planned for this week. Lead with this week and one simple agenda starter; show future weeks on demand. No family agenda was saved during this review.

13. **Routine check-in — Functional; interaction needs clearer invitation.** A short keyboard press did not record activity; an 800ms hold on Personal study did. Today showed 1 of 5, study plan 1 of 16, and 1 of 3 this week. The hold behavior is deliberate, not a failed tap. Make the action discoverable in the card and offer an explicit accessible completion path.

14. **Progress — Accurate activity, weak emphasis.** The actual check-in appeared as one check-in on one day. The seed/XP/share panel then fills much of the phone, followed by annual zero totals. Prioritize weekly patterns and next useful adjustments; keep the garden optional and expressive, without implying a spirituality score.

15. **Settings — Overloaded, reused setup copy.** The modal contains routines, week, reading, rhythm, reminders, quiet hours, look, links, What’s New, backup and about. Routine copy says You can change these in Settings later while already inside Settings. Group preferences into navigable sections; put backup and reminder status within easy reach.

Evidence retained outside the repository in outputs/faithful-days-review/product-audit/review.html. This is a proposed product target, not a replacement of the approved schema or a release completion record.
