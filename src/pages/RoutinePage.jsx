import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Heart, PenLine, Check, ChevronRight, Sparkles } from 'lucide-react';
import { getDailyTextLink } from '../utils/jwLibraryLinks';
import { haptics } from '../utils/native';
import { useToast } from '../components/Toast';

const DATE_KEY = () => new Date().toISOString().slice(0, 10);

/**
 * The morning routine — a single primary action the app does for
 * its users. The flow: 4 steps, each one a card that opens an
 * external jw.org surface (or a local reflection textarea). No
 * streaks, no XP, no timer. State is per-day localStorage flags
 * so a returning user sees their progress from earlier today.
 *
 * Why this exists: the 6-row launchpad was a directory, not a
 * tool. The morning routine is the thing jw-habits is FOR —
 * open the app at 6am, do the 3 things, close. Everything else
 * (the directory of 6 link-out rows) is now secondary surface
 * area, accessible from the side drawer and a single "All
 * habits" link in the home footer.
 */

const ROUTINE_KEY = 'jw-routine-state';

function getRoutineState() {
  try {
    const raw = localStorage.getItem(ROUTINE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Discard any state from a previous date — the routine is
    // per-day, and we don't want yesterday's "done" to count.
    if (parsed.date !== DATE_KEY()) return {};
    return parsed;
  } catch {
    return {};
  }
}

function setRoutineState(patch) {
  try {
    const cur = getRoutineState();
    const next = { ...cur, date: DATE_KEY(), ...patch };
    localStorage.setItem(ROUTINE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

function RoutinePage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [state, setState] = useState(() => getRoutineState());
  const [reflection, setReflection] = useState(state.reflection || '');
  const [showReflection, setShowReflection] = useState(false);
  const reflectionTimer = useRef(null);

  // Auto-save the reflection 800ms after the user stops typing.
  // The previous "what's on your mind" textarea was lossy on
  // every page navigation; this is the fix.
  useEffect(() => {
    if (reflectionTimer.current) clearTimeout(reflectionTimer.current);
    if (!reflection) return;
    reflectionTimer.current = setTimeout(() => {
      setRoutineState({ reflection });
    }, 800);
    return () => {
      if (reflectionTimer.current) clearTimeout(reflectionTimer.current);
    };
  }, [reflection]);

  // Step 1: read text. Persists when the user taps "I read it".
  // The daily-text link is generated fresh on each visit so the
  // URL always points at today's date.
  const markTextRead = () => {
    haptics.success();
    setState((s) => ({ ...s, textRead: true }));
    setRoutineState({ textRead: true });
    toast.success(t('routine.textMarked', 'Marked as read.'));
  };

  // Step 2: prayer. The button doesn't open anything — prayer is
  // something you do in your own head. The tap is an
  // acknowledgement, not a check-box.
  const markPrayed = () => {
    haptics.success();
    setState((s) => ({ ...s, prayed: true }));
    setRoutineState({ prayed: true });
  };

  // Step 3: reflection. Optional textarea. Auto-saves as you type.
  // Marking it "done" is just a button — the user is in charge.
  const markReflected = () => {
    haptics.success();
    setState((s) => ({ ...s, reflected: true }));
    setRoutineState({ reflected: true });
    setShowReflection(false);
  };

  // Reset today's routine. Destructive — the user has to confirm
  // a state reset because it wipes their reflection text.
  const resetRoutine = () => {
    if (!window.confirm(t('routine.resetConfirm', 'Reset today\'s routine? Your reflection text will be cleared.'))) return;
    haptics.medium?.() || haptics.light();
    localStorage.removeItem(ROUTINE_KEY);
    setState({});
    setReflection('');
    setShowReflection(false);
    toast.info(t('routine.reset', 'Routine reset.'));
  };

  const allDone = state.textRead && state.prayed && state.reflected;
  const stepsDone = (state.textRead ? 1 : 0) + (state.prayed ? 1 : 0) + (state.reflected ? 1 : 0);
  const stepsTotal = 3;
  const dailyTextLink = getDailyTextLink(); // resolves to today's URL at render time

  return (
    <div className="min-h-screen bg-base-200 pb-16">
      {/* iOS large title */}
      <h1 className="ios-large-title">
        {t('routine.title', 'Morning routine')}
        {allDone ? (
          <span className="sub">{t('routine.doneSub', "Today's routine complete. See you tomorrow.")}</span>
        ) : (
          <span className="sub">
            {stepsDone === 0
              ? t('routine.freshSub', 'Three quiet things, in any order.')
              : t('routine.inProgressSub', { defaultValue: `${stepsDone} of ${stepsTotal} done. One more step when you can.`, done: stepsDone, total: stepsTotal })}
          </span>
        )}
      </h1>

      <div className="container mx-auto px-4 max-w-2xl space-y-3">
        {/* Step 1: Read text */}
        <div className={`ios-grouped ${allDone ? 'opacity-70' : ''}`}>
          <a
            href={dailyTextLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`ios-row ${state.textRead ? 'opacity-60' : ''}`}
            aria-label={t('routine.step1Aria', "Read today's text on jw.org")}
          >
            <div className={`ios-icon ${state.textRead ? 'green' : 'blue'}`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="body">
              <div className="title">
                {t('routine.step1', 'Read today\'s text')}
                {state.textRead && (
                  <span className="ml-2 text-xs text-base-content/60 font-normal">
                    {t('routine.doneTag', 'done')}
                  </span>
                )}
              </div>
              <div className="sub">
                {t('routine.step1Sub', "Today's scripture passage on jw.org (3 min)")}
              </div>
            </div>
            {!state.textRead && <ChevronRight className="ios-chev" />}
            {state.textRead && <Check className="ios-chev" />}
          </a>
          {!state.textRead && (
            <button
              onClick={markTextRead}
              className="w-full text-left px-4 py-3 text-sm text-primary border-t border-base-300/30 hover:bg-base-200/50"
            >
              {t('routine.alreadyRead', 'I read it on jw.org → mark as read')}
            </button>
          )}
        </div>

        {/* Step 2: Prayer */}
        <div className={`ios-grouped ${allDone ? 'opacity-70' : ''}`}>
          <button
            type="button"
            onClick={markPrayed}
            className={`ios-row w-full text-left ${state.prayed ? 'opacity-60' : ''}`}
            aria-label={t('routine.step2Aria', 'Mark prayer as done')}
            disabled={state.prayed}
          >
            <div className={`ios-icon ${state.prayed ? 'green' : 'orange'}`}>
              <Heart className="w-4 h-4" />
            </div>
            <div className="body">
              <div className="title">
                {t('routine.step2', 'Pray')}
                {state.prayed && (
                  <span className="ml-2 text-xs text-base-content/60 font-normal">
                    {t('routine.doneTag', 'done')}
                  </span>
                )}
              </div>
              <div className="sub">
                {t('routine.step2Sub', 'A moment of conversation with Jehovah. No timer — just a tap.')}
              </div>
            </div>
            {!state.prayed && <ChevronRight className="ios-chev" />}
            {state.prayed && <Check className="ios-chev" />}
          </button>
        </div>

        {/* Step 3: Reflection (optional, expandable) */}
        <div className={`ios-grouped ${allDone ? 'opacity-70' : ''}`}>
          <button
            type="button"
            onClick={() => setShowReflection((v) => !v)}
            className={`ios-row w-full text-left ${state.reflected ? 'opacity-60' : ''}`}
            aria-label={t('routine.step3Aria', 'Reflect (optional)')}
          >
            <div className={`ios-icon ${state.reflected ? 'green' : 'indigo'}`}>
              <PenLine className="w-4 h-4" />
            </div>
            <div className="body">
              <div className="title">
                {t('routine.step3', 'Reflect (optional)')}
                {state.reflected && (
                  <span className="ml-2 text-xs text-base-content/60 font-normal">
                    {t('routine.doneTag', 'done')}
                  </span>
                )}
              </div>
              <div className="sub">
                {t('routine.step3Sub', 'A thought from your study. Saved on this device only.')}
              </div>
            </div>
            {!state.reflected && <ChevronRight className="ios-chev" />}
            {state.reflected && <Check className="ios-chev" />}
          </button>
          {showReflection && !state.reflected && (
            <div className="border-t border-base-300/30 p-4 space-y-3">
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder={t('routine.reflectionPlaceholder', "What's on your mind today?")}
                rows={4}
                className="textarea textarea-bordered w-full text-sm"
                maxLength={2000}
                aria-label={t('routine.reflectionAria', 'Reflection textarea')}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-base-content/60">
                  {t('routine.autoSave', 'Auto-saves as you type.')}
                </span>
                <button
                  type="button"
                  onClick={markReflected}
                  disabled={!reflection.trim()}
                  className="btn btn-primary btn-sm"
                >
                  {t('routine.saveReflection', 'Save reflection')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reset */}
        {!allDone && (stepsDone > 0 || reflection) && (
          <div className="pt-2">
            <button
              type="button"
              onClick={resetRoutine}
              className="btn btn-ghost btn-sm w-full text-base-content/60"
            >
              {t('routine.resetLink', 'Reset today’s routine')}
            </button>
          </div>
        )}

        {/* Done state — collapsed card */}
        {allDone && (
          <div className="ios-grouped mt-6">
            <div className="p-6 text-center">
              <div className="ios-icon mx-auto" style={{ background: 'var(--ios-green, #34C759)' }}>
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold mt-3">
                {t('routine.completeHeading', 'Routine complete')}
              </h2>
              <p className="text-sm text-base-content/70 mt-1">
                {t('routine.completeBody', 'Tomorrow morning, this card will be ready again.')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RoutinePage;
