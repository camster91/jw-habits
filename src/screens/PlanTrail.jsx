import QuickGuide from '../components/QuickGuide.jsx';
import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Plus, RotateCcw, Star, Trash2 } from 'lucide-react';
import { useStore } from '../data/useStore.js';
import {
  addStep,
  deletePlan,
  nextStep,
  progress,
  restorePlan,
  setActiveStudy,
} from '../domain/plans.js';
import { MAX_STEPS, MAX_TITLE } from '../domain/ids.js';
import { planColour, planStyle } from '../theme/planColours.js';
import PlanIcon from '../components/plans/PlanIcon.jsx';
import StepSheet from '../components/plans/StepSheet.jsx';

/** Vertical distance between stops, in px; the trail is ROW × steps tall. */
const ROW = 76;
/** Horizontal stop positions (% of the width), repeating: the path winds. */
const XS = [50, 76, 50, 24];

const stopX = (i) => XS[i % XS.length];
const stopY = (i) => ROW / 2 + i * ROW;

/** One smooth curve from stop i-1 to stop i (viewBox x is 0–100, y is px). */
function segment(i) {
  const [x0, y0, x1, y1] = [stopX(i - 1), stopY(i - 1), stopX(i), stopY(i)];
  const mid = (y0 + y1) / 2;
  return `M ${x0} ${y0} C ${x0} ${mid} ${x1} ${mid} ${x1} ${y1}`;
}

/**
 * The steps as stops on a winding SVG path. Done stops are filled with the
 * plan colour, the path between two done stops is coloured too, and the next
 * stop glows (motion-safe only).
 */
function Trail({ plan, onOpen }) {
  const { t } = useTranslation();
  const next = nextStep(plan);
  const height = plan.steps.length * ROW;
  const state = (s) => (s.doneOn ? 'done' : s === next ? 'next' : 'notYet');

  return (
    <div className="relative" style={{ height }}>
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
      >
        {plan.steps.slice(1).map((s, k) => {
          const lit = s.doneOn && plan.steps[k].doneOn;
          return (
            <path
              key={s.id}
              d={segment(k + 1)}
              fill="none"
              stroke={lit ? 'var(--plan)' : 'currentColor'}
              strokeWidth={lit ? 6 : 4}
              strokeLinecap="round"
              strokeDasharray={lit ? undefined : '2 8'}
              vectorEffect="non-scaling-stroke"
              className={lit ? undefined : 'text-base-content/25'}
            />
          );
        })}
      </svg>
      <ol aria-label={t('fd.plans.trail.steps')} className="absolute inset-0">
        {plan.steps.map((s, i) => {
          const st = state(s);
          const labelRight = stopX(i) <= 50;
          const centre =
            'absolute left-0 top-0 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full';
          return (
            <li
              key={s.id}
              className="absolute h-0 w-0"
              style={{ left: `${stopX(i)}%`, top: stopY(i) }}
            >
              {st === 'next' && (
                <span
                  data-glow
                  aria-hidden="true"
                  className={`${centre} pointer-events-none bg-[var(--plan)] opacity-40 motion-safe:animate-ping`}
                />
              )}
              <button
                type="button"
                aria-label={t('fd.plans.trail.stop', {
                  title: s.title,
                  state: t(`fd.plans.trail.state.${st}`),
                })}
                className={`${centre} flex items-center justify-center font-semibold ${
                  st === 'done'
                    ? 'text-white'
                    : st === 'next'
                      ? 'fd-plan-text border-4 border-[var(--plan)] bg-base-100 shadow-md'
                      : 'border-2 border-base-content/25 bg-base-100 text-base-content/70'
                }`}
                style={st === 'done' ? { backgroundColor: planColour(plan.colour) } : undefined}
                onClick={() => onOpen(s.id)}
              >
                {st === 'done' ? <Check aria-hidden="true" className="h-5 w-5" /> : i + 1}
              </button>
              <span
                aria-hidden="true"
                className={`absolute top-0 block w-max max-w-[8.5rem] -translate-y-1/2 truncate text-sm ${
                  labelRight ? 'left-8' : 'right-8 text-right'
                } ${st === 'next' ? 'fd-plan-text font-semibold' : st === 'done' ? '' : 'text-base-content/70'}`}
              >
                {s.title}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function AddStep({ plan }) {
  const { t } = useTranslation();
  const { update } = useStore();
  const id = useId();
  const hintId = useId();
  const [title, setTitle] = useState('');
  const full = plan.steps.length >= MAX_STEPS;
  const add = (e) => {
    e.preventDefault();
    if (!title.trim() || full) return;
    update((s) => addStep(s, plan.id, { title }));
    setTitle('');
  };
  return (
    <form className="flex items-start gap-2" onSubmit={add}>
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor={id} className="text-sm font-medium">
          {t('fd.plans.trail.addStep')}
        </label>
        <input
          id={id}
          type="text"
          maxLength={MAX_TITLE}
          className="input input-bordered min-h-11 w-full"
          value={title}
          disabled={full}
          aria-describedby={full ? hintId : undefined}
          onChange={(e) => setTitle(e.target.value)}
        />
        {full && (
          <p id={hintId} className="text-sm text-base-content/70">
            {t('fd.plans.trail.full')}
          </p>
        )}
      </div>
      <button type="submit" className="btn btn-primary mt-6 min-h-11" disabled={full}>
        <Plus aria-hidden="true" className="h-5 w-5" />
        {t('fd.plans.trail.add')}
      </button>
    </form>
  );
}

function DeletePlan({ plan }) {
  const { t } = useTranslation();
  const { update } = useStore();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn-ghost min-h-11 w-full text-error"
        onClick={() => setConfirming(true)}
      >
        <Trash2 aria-hidden="true" className="h-5 w-5" />
        {t('fd.plans.trail.deletePlan')}
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-2xl bg-base-100 p-3">
      <p>{t('fd.plans.trail.confirmDeletePlan')}</p>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-error min-h-11 flex-1"
          onClick={() => {
            update((s) => deletePlan(s, plan.id));
            navigate('/plans');
          }}
        >
          {t('fd.plans.trail.confirmDelete')}
        </button>
        <button
          type="button"
          className="btn btn-ghost min-h-11 flex-1"
          onClick={() => setConfirming(false)}
        >
          {t('fd.plans.trail.keep')}
        </button>
      </div>
    </div>
  );
}

function BackLink() {
  const { t } = useTranslation();
  return (
    <Link
      to="/plans"
      className="inline-flex min-h-11 items-center gap-1 font-medium text-[var(--fd-accent-text)]"
    >
      <ArrowLeft aria-hidden="true" className="h-5 w-5" />
      {t('fd.plans.trail.back')}
    </Link>
  );
}

/**
 * One plan as a trail of stops. Each stop opens its StepSheet. A completed
 * plan is read-only until it is restored.
 */
export default function PlanTrail() {
  const { t } = useTranslation();
  const { planId } = useParams();
  const { store, update } = useStore();
  // The step whose sheet is open. The sheet follows the plan live: once the
  // plan is archived (even by finishing its last step there) only Done/Undone
  // stays. Focus lands on the heading when the sheet deleted its own stop.
  const [open, setOpen] = useState(null);
  const headingRef = useRef(null);
  const plan = store.plans.find((p) => p.id === planId);

  const shell = (children) => (
    <main
      data-testid="plan-trail"
      className="min-h-screen bg-base-200 px-4 pb-24 pt-[max(env(safe-area-inset-top),1rem)]"
    >
      <div className="mx-auto max-w-md space-y-4">{children}</div>
    </main>
  );

  if (!plan) {
    return shell(
      <>
        <BackLink />
        <p className="text-base-content/70">{t('fd.plans.trail.notFound')}</p>
      </>
    );
  }

  const archived = plan.archivedOn !== null;
  const { done, total } = progress(plan);
  const isActive = store.activePlan.personalStudy === plan.id;

  return shell(
    <>
      <BackLink />
      <QuickGuide
        title="Take your plan one step at a time"
        steps={[
          {
            title: 'Shape the trail',
            body: 'Add or edit steps in your own words, with reference links when helpful.',
          },
          {
            title: 'Use on Today',
            body: 'A current study plan supplies the next Personal study step. Today records what you actually do.',
          },
          {
            title: 'Pause when you need',
            body: 'Planning is not a commitment to a streak. Return to your next step at your own pace.',
          },
        ]}
      />
      <header
        style={{ ...planStyle(plan.colour), backgroundColor: 'var(--plan)' }}
        className="space-y-3 rounded-3xl p-5 text-white"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20"
          >
            <PlanIcon icon={plan.icon} className="h-6 w-6" />
          </span>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="min-w-0 break-words text-2xl font-bold focus:outline-none"
          >
            {plan.title}
          </h1>
        </div>
        {total > 0 && (
          <>
            <p className="font-medium">{t('fd.plans.progress', { done, total })}</p>
            <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${(done / total) * 100}%` }}
              />
            </div>
          </>
        )}
        {plan.kind === 'study' &&
          !archived &&
          (isActive ? (
            <p className="flex items-center gap-1 text-sm font-medium">
              <Star aria-hidden="true" className="h-4 w-4" />
              {t('fd.plans.trail.active')}
            </p>
          ) : (
            <button
              type="button"
              // Solid white with the plan colour as text: every plan colour
              // reads at 4.5:1 or better on white, hovered or not.
              className="btn btn-sm min-h-11 border-0 bg-white hover:bg-white hover:shadow-md"
              style={{ color: planColour(plan.colour) }}
              onClick={() => update((s) => setActiveStudy(s, plan.id))}
            >
              <Star aria-hidden="true" className="h-4 w-4" />
              {t('fd.plans.trail.makeActive')}
            </button>
          ))}
      </header>

      {archived && (
        <div className="flex items-center gap-3 rounded-2xl bg-base-100 p-4">
          <p className="flex-1">{t('fd.plans.trail.completed')}</p>
          <button
            type="button"
            className="btn btn-outline min-h-11"
            onClick={() => update((s) => restorePlan(s, plan.id))}
          >
            <RotateCcw aria-hidden="true" className="h-5 w-5" />
            {t('fd.plans.trail.restore')}
          </button>
        </div>
      )}

      <div style={planStyle(plan.colour)} className="rounded-3xl bg-base-100 px-2 py-4">
        <Link
          className="inline-flex min-h-11 items-center px-2 underline"
          to={`/notes?new=1&context=plan&id=${encodeURIComponent(plan.id)}`}
        >
          Keep a note about this plan
        </Link>
        {total > 0 ? (
          <Trail plan={plan} onOpen={setOpen} />
        ) : (
          <p className="px-2 text-base-content/70">{t('fd.plans.trail.empty')}</p>
        )}
      </div>

      {!archived && <AddStep plan={plan} />}
      <DeletePlan plan={plan} />

      {open && (
        <StepSheet
          key={open}
          planId={plan.id}
          stepId={open}
          onClose={() => setOpen(null)}
          fallbackFocus={() => headingRef.current}
        />
      )}
    </>
  );
}
