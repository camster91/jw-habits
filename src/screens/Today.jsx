import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../data/useStore.js';
import { BOOKS, portionSize } from '../domain/bible.js';
import { dueToday, isDone } from '../domain/routines.js';
import { scheduleOn } from '../domain/schedule.js';
import { addCheckIn, labelFor, removeCheckIn } from '../domain/store.js';
import { isWrapUpTime, wrapUp } from '../domain/wrapup.js';
import { pickEncouragement } from '../domain/encouragement.js';
import { whatsNewPageUrl } from '../domain/whatsNew.js';
import { linkLocale, routineLink } from '../domain/links.js';
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

const DISMISS_KEY = 'fd-wrapup-dismissed';
const ENCOURAGE_MS = 3000;
const CLOCK_MS = 30 * 1000;

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
    setLine({ text, ref: ref && `${BOOKS[ref.book - 1].name} ${ref.chapter}:${ref.verse}` });
    timer.current = setTimeout(() => setLine(null), ENCOURAGE_MS);
  };
  return [line, show];
}

export default function Today({ onOpenSettings = () => {} }) {
  const { t, i18n } = useTranslation();
  const { store, update, today } = useStore();
  const now = useNow();
  const [line, encourage] = useEncouragement(store.tone, today, t);
  const [expanded, setExpanded] = useState(false);
  const [dismissedOn, setDismissedOn] = useState(() => safeSessionGetItem(DISMISS_KEY));

  const language = i18n.language;
  const schedule = scheduleOn(store, today);
  const due = dueToday(store, today);
  const label = (id) => labelFor(store, id, t);
  const wrapping = isWrapUpTime(store, now);
  const dismissed = dismissedOn === today;
  const result = wrapping ? wrapUp(store, now, t) : null;
  const fresh = freshStart(today);
  const showList = !wrapping || expanded;

  const complete = (id) => {
    update((s) =>
      id === 'bibleReading'
        ? setChaptersRead(s, today, portionSize(s, today))
        : addCheckIn(s, { routine: id, day: today, value: true })
    );
    encourage(id);
  };
  // Undoing Bible reading also takes back a catch-up it made for yesterday.
  const undo = (id) =>
    update((s) =>
      id === 'bibleReading' ? setChaptersRead(s, today, 0) : removeCheckIn(s, id, today)
    );

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
    window.open(whatsNewPageUrl(linkLocale(language)), '_blank', 'noopener');
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
    if (id === 'personalStudy') {
      const progress = t('fd.wrapUp.studyMoved', studyProgress(store, today));
      return store.studyTopic ? `${progress} · ${store.studyTopic}` : progress;
    }
    return null;
  };

  const renderRow = (id) => {
    if (id === 'ministry') {
      return (
        <MinistryRow
          key={id}
          label={label(id)}
          value={ministryEntry(store, today)?.value ?? null}
          pioneer={store.pioneer}
          hoursGoal={store.hoursGoal}
          onChange={patchMinistry}
        />
      );
    }
    const firstChapter = id === 'bibleReading' ? todaysChapters(store, today)[0] : undefined;
    return (
      <RoutineRow
        key={id}
        label={label(id)}
        detail={detailOf(id)}
        done={isDone(store, id, today)}
        onComplete={() => complete(id)}
        onUndo={() => undo(id)}
        link={routineLink(store, id, language, firstChapter)}
      >
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
        <header>
          <div>
            <h1 className="text-3xl font-bold">{t('fd.today.title')}</h1>
            <p className="text-sm text-base-content/70">
              {new Intl.DateTimeFormat(language, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              }).format(dateOf(today))}
            </p>
          </div>
        </header>

        {fresh && <p className="text-base-content/80">{t(`fd.today.${fresh}`)}</p>}

        {store.whatsNew.enabled && store.whatsNew.newCount > 0 && (
          <WhatsNewBadge count={store.whatsNew.newCount} onOpen={openWhatsNew} />
        )}

        <div role="status" aria-live="polite" className="min-h-6 text-[var(--fd-accent-text)]">
          {line && (
            <>
              {line.text}
              {line.ref && <span className="ml-2 italic text-base-content/70">{line.ref}</span>}
            </>
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
            {due.map(renderRow)}
            {due.length === 0 && (
              <li className="text-center text-base-content/70">{t('fd.today.allClear')}</li>
            )}
          </ul>
        )}
      </div>
    </main>
  );
}
