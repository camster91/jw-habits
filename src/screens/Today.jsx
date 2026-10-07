import Garden from '../components/fun/Garden.jsx';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../data/useStore.js';
import { BOOKS, finderUrl, portionSize } from '../domain/bible.js';
import { dueToday, isDone } from '../domain/routines.js';
import { scheduleOn } from '../domain/schedule.js';
import { addCheckIn, labelFor, removeCheckIn } from '../domain/store.js';
import { weekStart } from '../domain/day.js';
import { agendaFor } from '../domain/agenda.js';
import { progress, setActiveStudy } from '../domain/plans.js';
import {
  checkInFamily,
  checkInStudy,
  todaysStudyStep,
  undoFamily,
  undoStudy,
} from '../domain/planCheckins.js';
import { planStyle } from '../theme/planColours.js';
import { isWrapUpTime, wrapUp } from '../domain/wrapup.js';
import { pickEncouragement } from '../domain/encouragement.js';
import { whatsNewPageUrl } from '../domain/whatsNew.js';
import { linkLocale, routineLink } from '../domain/links.js';
import { openLink } from '../native/openLink.js';
import {
  chaptersLabel,
  chaptersReadOn,
  encouragementSeed,
  freshStart,
  meetingDayFor,
  ministryEntry,
  setChaptersRead,
  setMinistry,
  studyProgress,
  todaysChapters,
} from '../domain/today.js';
import { safeSessionGetItem, safeSessionSetItem } from '../utils/safeStorage.js';
import RoutineRow from '../components/RoutineRow.jsx';
import MinistryRow from '../components/MinistryRow.jsx';
import Stepper from '../components/Stepper.jsx';
import WrapUpCard, { WrapUpSummary } from '../components/WrapUpCard.jsx';
import MeetingDaysCard from '../components/MeetingDaysCard.jsx';
import WhatsNewBadge from '../components/WhatsNewBadge.jsx';
import PlanIcon from '../components/plans/PlanIcon.jsx';
import TodayAgenda from '../components/plans/TodayAgenda.jsx';
import SomethingElseSheet from '../components/plans/SomethingElseSheet.jsx';
import PlanFinishedCard from '../components/plans/PlanFinishedCard.jsx';

const DISMISS_KEY = 'fd-wrapup-dismissed';
const ENCOURAGE_MS = 3000;
const CLOCK_MS = 30 * 1000;

/** An agenda item's title, link, plan and done state; null for a step that is gone. */
function describe(item, store) {
  if (item.kind === 'free') return { title: item.title, link: item.link, plan: null, done: false };
  const plan = store.plans.find((p) => p.id === item.planId);
  const step = plan?.steps.find((s) => s.id === item.stepId);
  if (!step) return null;
  return { title: step.title, link: step.link, plan, done: step.doneOn !== null };
}

/** The items that can be shown (a step deleted since is skipped), with what each shows. */
const agendaRows = (items, store) =>
  items.map((item) => ({ item, info: describe(item, store) })).filter((x) => x.info);

/** The plan a change archived (a check-in finishing its last step), else null. */
const finishedBy = (before, after) =>
  after.plans.find(
    (p) => p.archivedOn !== null && before.plans.find((b) => b.id === p.id)?.archivedOn === null
  ) ?? null;

/** Local noon on an app day, for formatting. */
const dateOf = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

/** The current time, refreshed every 30 s so the wrap-up opens on time. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), CLOCK_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** The line shown after a check-in, cleared after 3 s. */
function useEncouragement(tone, today, t) {
  const [line, setLine] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = (id) => {
    const { text, ref } = pickEncouragement(tone, encouragementSeed(today, id), t);
    clearTimeout(timer.current);
    if (!text) return setLine(null);
    const label = ref && `${BOOKS[ref.book - 1].name} ${ref.chapter}:${ref.verse}`;
    setLine({ text, ref: ref && { ...ref, label } });
    timer.current = setTimeout(() => setLine(null), ENCOURAGE_MS);
  };
  return [line, show];
}

/** The encouragement line's reference, opening that chapter on jw.org. */
function ScriptureLink({ label, url }) {
  const open = (e) => {
    e.preventDefault();
    openLink(url);
  };
  return (
    <a href={url} className="ml-2 italic text-base-content/70 underline" onClick={open}>
      {label}
    </a>
  );
}

export default function Today({ onOpenSettings = () => {} }) {
  const { t, i18n } = useTranslation();
  const { store, update, today } = useStore();
  const now = useNow();
  const [line, encourage] = useEncouragement(store.tone, today, t);
  const [expanded, setExpanded] = useState(false);
  const [dismissedOn, setDismissedOn] = useState(() => safeSessionGetItem(DISMISS_KEY));
  // The plan a check-in just finished: {planId, started} (started: the next project's title).
  const [finished, setFinished] = useState(null);
  const [choosing, setChoosing] = useState(false);
  const [sheetError, setSheetError] = useState(null);
  // The routine whose plan check-in was just refused (its row says so).
  const [refusedId, setRefusedId] = useState(null);
  // Set when the finished card closes, so the next render moves focus to the study row.
  const refocusRow = useRef(false);
  useEffect(() => {
    if (!refocusRow.current) return;
    refocusRow.current = false;
    const target =
      document.querySelector('[data-testid="row-personalStudy"] button') ??
      document.querySelector('[data-testid="today"] h1');
    target?.focus();
  });

  const language = i18n.language;
  const schedule = scheduleOn(store, today);
  const due = dueToday(store, today);
  const label = (id) => labelFor(store, id, t);
  const wrapping = isWrapUpTime(store, now);
  const dismissed = dismissedOn === today;
  const result = wrapping ? wrapUp(store, now, t) : null;
  const fresh = freshStart(today);
  const showList = !wrapping || expanded;
  const study = todaysStudyStep(store);
  const studyEntry = store.log.find((e) => e.routine === 'personalStudy' && e.day === today);
  // What the study row shows. While today is checked in: the step that check-in
  // ticked, or (a plain session) the project alone. Otherwise the next step.
  // Null means no active project: the v5.0 row.
  const studyView = (() => {
    if (studyEntry && studyEntry.value !== true) {
      const { stepId } = studyEntry.value;
      const plan = store.plans.find(
        (p) => p.kind === 'study' && p.steps.some((x) => x.id === stepId)
      );
      if (plan) return { plan, step: plan.steps.find((x) => x.id === stepId), done: true };
    }
    if (!study) return null;
    return studyEntry ? { plan: study.plan, step: null, done: true } : { ...study, done: false };
  })();
  const finishedPlan = finished && store.plans.find((p) => p.id === finished.planId);
  // Study projects waiting their turn: the next-project offer picks from these.
  const waiting = store.plans.filter(
    (p) => p.kind === 'study' && p.archivedOn === null && p.id !== store.activePlan.personalStudy
  );

  /**
   * Runs a plan check-in: a refusal (the store itself back) changes nothing
   * and returns false; a check-in that finishes a plan shows the card.
   */
  const planCheckIn = (fn) => {
    const next = fn(store);
    if (next === store) return false;
    const done = finishedBy(store, next);
    if (done) setFinished({ planId: done.id, started: null });
    update(fn);
    return true;
  };

  const checkIns = {
    bibleReading: (s) => setChaptersRead(s, today, portionSize(s, today)),
    // With an active project the hold ticks its next step; with none, a session (v5.0).
    personalStudy: (s) => checkInStudy(s, today, study ? study.step.id : null),
    familyWorship: (s) => checkInFamily(s, today),
  };

  const complete = (id) => {
    if (id === 'personalStudy' || id === 'familyWorship') {
      // A refusal changes nothing: say so on the row, with no encouragement.
      const ok = planCheckIn(checkIns[id]);
      setRefusedId(ok ? null : id);
      if (!ok) return;
    } else {
      update(checkIns[id] ?? ((s) => addCheckIn(s, { routine: id, day: today, value: true })));
    }
    encourage(id);
  };

  // Undo reverses exactly what the check-in did: Bible reading also takes back
  // a catch-up it made for yesterday; study and family clear the plan steps
  // they ticked (and restore a project the check-in finished).
  const undos = {
    bibleReading: (s) => setChaptersRead(s, today, 0),
    personalStudy: (s) => undoStudy(s, today),
    familyWorship: (s) => undoFamily(s, today),
  };
  const undo = (id) => {
    if (id === 'personalStudy' || id === 'familyWorship') {
      setFinished(null);
      setRefusedId(null);
    }
    update(undos[id] ?? ((s) => removeCheckIn(s, id, today)));
  };

  // 'Did something else': tick another step of the project, or just log a session.
  const pickOther = (stepId) => {
    if (!planCheckIn((s) => checkInStudy(s, today, stepId))) {
      setSheetError(t('fd.today.refused'));
      return;
    }
    setChoosing(false);
    setSheetError(null);
    encourage('personalStudy');
  };

  const startNext = (planId) => {
    if (setActiveStudy(store, planId) === store) return false;
    const title = store.plans.find((p) => p.id === planId)?.title;
    update((s) => setActiveStudy(s, planId));
    setFinished((f) => f && { ...f, started: title });
    return true;
  };

  const setChapters = (n) => {
    if (chaptersReadOn(store, today) === 0 && n > 0) encourage('bibleReading');
    update((s) => setChaptersRead(s, today, n));
  };

  const patchMinistry = (patch) => {
    if (patch.shared === true && !ministryEntry(store, today)?.value.shared) encourage('ministry');
    update((s) => setMinistry(s, today, patch));
  };

  // Opening the page zeroes the count; the checks already keep every guid seen.
  const openWhatsNew = () => {
    openLink(whatsNewPageUrl(linkLocale(language)));
    update((s) => ({ ...s, whatsNew: { ...s.whatsNew, newCount: 0 } }));
  };

  const dismiss = () => {
    safeSessionSetItem(DISMISS_KEY, today);
    setDismissedOn(today);
    setExpanded(false);
  };

  const detailOf = (id) => {
    if (id === 'bibleReading') return chaptersLabel(todaysChapters(store, today));
    if (id === 'meetingPrep') {
      const day = new Intl.DateTimeFormat(language, { weekday: 'long' }).format(
        dateOf(meetingDayFor(store, today))
      );
      return t('fd.today.meetingFor', { day });
    }
    if (id === 'personalStudy' && studyView) {
      const { plan, step } = studyView;
      return (
        <span className="flex min-w-0 items-center gap-2" style={planStyle(plan.colour)}>
          <span
            aria-hidden="true"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--plan)] text-white"
          >
            <PlanIcon icon={plan.icon} className="h-4 w-4" />
          </span>
          <span className="fd-plan-text truncate font-medium">
            {step ? t('fd.today.study.line', { plan: plan.title, step: step.title }) : plan.title}
          </span>
        </span>
      );
    }
    if (id === 'personalStudy') {
      const progress = t('fd.wrapUp.studyMoved', studyProgress(store, today));
      const topic = store.plans.find((p) => p.id === store.activePlan.personalStudy)?.title;
      return topic ? `${progress} · ${topic}` : progress;
    }
    return null;
  };

  // Shared on an earlier day this month: no longer due, but kept (collapsed)
  // all month so the studies count stays editable.
  const month = ministryEntry(store, today);
  const sharedEarlier = month?.value.shared === true && month.day < today;
  const rows =
    schedule.enabled.ministry && sharedEarlier && !due.includes('ministry')
      ? [...due, 'ministry']
      : due;

  const renderRow = (id) => {
    if (id === 'ministry') {
      return (
        <MinistryRow
          key={id}
          label={label(id)}
          value={month?.value ?? null}
          pioneer={store.pioneer}
          hoursGoal={store.hoursGoal}
          onChange={patchMinistry}
          collapsed={sharedEarlier && !store.pioneer}
        />
      );
    }
    const firstChapter = id === 'bibleReading' ? todaysChapters(store, today)[0] : undefined;
    const project = id === 'personalStudy' ? studyView : null;
    // A plain session names no step, so there is no step link either.
    const projectLink = project?.step?.link ?? null;
    const agenda =
      id === 'familyWorship' ? agendaRows(agendaFor(store, weekStart(today)), store) : [];
    return (
      <RoutineRow
        key={id}
        testId={`row-${id}`}
        label={label(id)}
        detail={detailOf(id)}
        done={isDone(store, id, today)}
        onComplete={() => complete(id)}
        onUndo={() => undo(id)}
        link={project ? projectLink : routineLink(store, id, language, firstChapter, today)}
        linkName={
          projectLink ? t('fd.today.study.openStep', { title: project.step.title }) : undefined
        }
      >
        {project && (
          <div
            className="flex flex-wrap items-center gap-x-3 text-sm"
            style={planStyle(project.plan.colour)}
          >
            <span className="fd-plan-text font-medium">
              {t('fd.plans.progress', progress(project.plan))}
            </span>
            <span className="text-base-content/70">
              {t('fd.wrapUp.studyMoved', studyProgress(store, today))}
            </span>
            {!project.done && (
              <button
                type="button"
                className="btn btn-link btn-sm min-h-11 px-0 text-[var(--fd-accent-text)]"
                onClick={() => {
                  setSheetError(null);
                  setChoosing(true);
                }}
              >
                {t('fd.today.study.somethingElse')}
              </button>
            )}
          </div>
        )}
        {refusedId === id && (
          <p role="alert" className="text-sm text-error">
            {t('fd.today.refused')}
          </p>
        )}
        {agenda.length > 0 && <TodayAgenda rows={agenda} />}
        {id === 'bibleReading' && (
          <Stepper
            label={t('fd.today.chaptersRead')}
            value={chaptersReadOn(store, today)}
            max={Math.max(3, portionSize(store, today) * 3)}
            onChange={setChapters}
          />
        )}
      </RoutineRow>
    );
  };

  return (
    <main
      data-testid="today"
      className="min-h-screen bg-base-200 px-4 pb-24 pt-[max(env(safe-area-inset-top),1rem)]"
    >
      <div className="mx-auto max-w-md space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 tabIndex={-1} className="text-3xl font-bold focus:outline-none">
              {t('fd.today.title')}
            </h1>
            <p className="text-sm text-base-content/70">
              {new Intl.DateTimeFormat(language, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              }).format(dateOf(today))}
            </p>
          </div>
          <Garden stage={1} small />
        </header>

        {fresh && <p className="text-base-content/80">{t(`fd.today.${fresh}`)}</p>}

        {store.whatsNew.enabled && store.whatsNew.newCount > 0 && (
          <WhatsNewBadge count={store.whatsNew.newCount} onOpen={openWhatsNew} />
        )}

        <div role="status" aria-live="polite" className="min-h-6 text-[var(--fd-accent-text)]">
          {line && (
            <>
              {line.text}
              {line.ref && (
                <ScriptureLink
                  label={line.ref.label}
                  url={finderUrl(linkLocale(language), line.ref.book, line.ref.chapter)}
                />
              )}
            </>
          )}
        </div>

        <div aria-live="polite" data-testid="plan-finished-live" className="empty:mb-0">
          {finishedPlan && (
            <PlanFinishedCard
              key={finishedPlan.id}
              plan={finishedPlan}
              tone={store.tone}
              waiting={waiting}
              started={finished.started}
              onStart={startNext}
              onClose={() => {
                refocusRow.current = true;
                setFinished(null);
              }}
            />
          )}
        </div>

        {schedule.enabled.meetingPrep && schedule.meetingDays.length === 0 && (
          <MeetingDaysCard onOpen={onOpenSettings} />
        )}

        {wrapping && !dismissed && (
          <WrapUpCard
            day={today}
            result={result}
            labelOf={label}
            tone={store.tone}
            expanded={expanded}
            onToggle={() => setExpanded((x) => !x)}
            onStillTime={() => setExpanded(true)}
            onDone={dismiss}
          />
        )}

        {wrapping && dismissed && (
          <WrapUpSummary
            count={result.done.length}
            expanded={expanded}
            onToggle={() => setExpanded((x) => !x)}
          />
        )}

        {showList && (
          <ul className="space-y-3">
            {rows.map(renderRow)}
            {rows.length === 0 && (
              <li className="text-center text-base-content/70">{t('fd.today.allClear')}</li>
            )}
          </ul>
        )}
      </div>
      {choosing && study && !studyEntry && (
        <SomethingElseSheet
          plan={study.plan}
          onPick={pickOther}
          onClose={() => setChoosing(false)}
          error={sheetError}
          fallbackFocus={() => document.querySelector('[data-testid="row-personalStudy"] button')}
        />
      )}
    </main>
  );
}
