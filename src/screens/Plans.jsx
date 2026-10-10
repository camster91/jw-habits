import OrganiserBoard from '../components/organiser/OrganiserBoard.jsx';
import QuickGuide from '../components/QuickGuide.jsx';
import ScreenIntro from '../components/ScreenIntro.jsx';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Plus, RotateCcw } from 'lucide-react';
import { useStore } from '../data/useStore.js';
import { nextStep, progress, restorePlan, setActiveStudy } from '../domain/plans.js';
import { planStyle } from '../theme/planColours.js';
import PlanIcon from '../components/plans/PlanIcon.jsx';
import NewPlanSheet from '../components/plans/NewPlanSheet.jsx';

function Section({ title, children }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** "3 of 12" with a bar, or "No steps yet". */
function ProgressLine({ plan, className = '' }) {
  const { t } = useTranslation();
  const { done, total } = progress(plan);
  if (total === 0) return <p className={`text-sm ${className}`}>{t('fd.plans.noSteps')}</p>;
  return (
    <div className={`space-y-1 ${className}`}>
      <p className="text-sm font-medium">{t('fd.plans.progress', { done, total })}</p>
      <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-base-content/10">
        <div
          className="h-full rounded-full bg-[var(--plan)]"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

/** A plan as a card linking to its trail; `status` is an optional pill ("Active"). */
function PlanCard({ plan, status, children }) {
  const { t } = useTranslation();
  const next = nextStep(plan);
  return (
    <li
      style={planStyle(plan.colour)}
      className="overflow-hidden rounded-2xl bg-base-100 shadow-sm"
    >
      <Link to={`/plans/${plan.id}`} className="flex min-h-11 items-start gap-3 p-4">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--plan)] text-white"
        >
          <PlanIcon icon={plan.icon} />
        </span>
        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex items-center gap-2">
            <span className="break-words text-lg font-semibold">{plan.title}</span>
            {status && (
              <span className="fd-plan-text shrink-0 rounded-full border border-current px-2 text-xs font-medium">
                {status}
              </span>
            )}
          </span>
          {next && plan.archivedOn === null && (
            <span className="block break-words text-sm text-base-content/70">
              {t('fd.plans.next', { title: next.title })}
            </span>
          )}
          <ProgressLine plan={plan} />
        </span>
        <ChevronRight aria-hidden="true" className="mt-3 h-5 w-5 shrink-0 text-base-content/50" />
      </Link>
      {children && <div className="border-t border-base-content/10 px-4 py-2">{children}</div>}
    </li>
  );
}

function NewButton({ label, onClick }) {
  return (
    <button type="button" className="btn btn-outline min-h-11 w-full" onClick={onClick}>
      <Plus aria-hidden="true" className="h-5 w-5" />
      {label}
    </button>
  );
}

/**
 * The Plans tab: study projects (the active one, then those waiting), family
 * worship (the weeks view and family plans) and the Completed shelf.
 */
export default function Plans() {
  const { t } = useTranslation();
  const { store, update } = useStore();
  const [creating, setCreating] = useState(null);

  const open = store.plans.filter((p) => p.archivedOn === null);
  const activeId = store.activePlan.personalStudy;
  const active = open.find((p) => p.id === activeId && p.kind === 'study');
  const waiting = open.filter((p) => p.kind === 'study' && p !== active);
  const family = open.filter((p) => p.kind === 'family');
  const completed = store.plans
    .filter((p) => p.archivedOn !== null)
    .sort((a, b) => (a.archivedOn < b.archivedOn ? 1 : a.archivedOn > b.archivedOn ? -1 : 0));

  return (
    <main
      data-testid="plans"
      className="min-h-screen bg-base-200 px-4 pb-24 pt-[max(env(safe-area-inset-top),1rem)]"
    >
      <div className="mx-auto max-w-md space-y-6">
        <ScreenIntro
          title={t('fd.plans.title')}
          subtitle="Make room for what matters. One small step is a good start."
          art="plans"
          tone="lavender"
        />
        <OrganiserBoard />
        <QuickGuide
          title="Build your first plan"
          steps={[
            {
              title: 'Choose a focus',
              body: 'Start a study or family plan. Give it a title that means something to you.',
            },
            {
              title: 'Make it manageable',
              body: 'Add your own steps, or use the chapter, lesson or weekly step generator. You can add safe links to your references.',
            },
            {
              title: 'Bring it into your day',
              body: 'Use on Today makes a study plan current. Tap Personal study on Today to record the next step; planning alone never records activity.',
            },
          ]}
        />
        <p className="text-base-content/80">{t('fd.plans.intro')}</p>
        <Link
          to="/plans/preparation"
          className="flex min-h-11 items-center gap-3 rounded-2xl bg-base-100 p-4 font-medium shadow-sm"
        >
          <CalendarDays aria-hidden="true" className="h-5 w-5" />
          <span className="flex-1">Prepare for meetings and assignments</span>
          <ChevronRight aria-hidden="true" className="h-5 w-5" />
        </Link>

        <Section title={t('fd.plans.study.heading')}>
          {active || waiting.length > 0 ? (
            <ul className="space-y-3">
              {active && <PlanCard plan={active} status={t('fd.plans.study.active')} />}
              {waiting.map((p) => (
                <PlanCard key={p.id} plan={p} status={t('fd.plans.study.waiting')}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm min-h-11 w-full"
                    aria-label={t('fd.plans.study.makeActive', { title: p.title })}
                    onClick={() => update((s) => setActiveStudy(s, p.id))}
                  >
                    {t('fd.plans.study.makeActiveShort')}
                  </button>
                </PlanCard>
              ))}
            </ul>
          ) : (
            <p className="text-base-content/70">{t('fd.plans.study.empty')}</p>
          )}
          <NewButton label={t('fd.plans.study.new')} onClick={() => setCreating('study')} />
        </Section>

        <Section title={t('fd.plans.family.heading')}>
          <Link
            to="/plans/family"
            className="flex min-h-11 items-center gap-3 rounded-2xl bg-base-100 p-4 font-medium shadow-sm"
          >
            <CalendarDays aria-hidden="true" className="h-5 w-5 text-[var(--fd-accent-text)]" />
            <span className="flex-1">{t('fd.plans.family.weeks')}</span>
            <ChevronRight aria-hidden="true" className="h-5 w-5 text-base-content/50" />
          </Link>
          {family.length > 0 ? (
            <ul className="space-y-3">
              {family.map((p) => (
                <PlanCard key={p.id} plan={p} />
              ))}
            </ul>
          ) : (
            <p className="text-base-content/70">{t('fd.plans.family.empty')}</p>
          )}
          <NewButton label={t('fd.plans.family.new')} onClick={() => setCreating('family')} />
        </Section>

        <details>
          <summary className="min-h-11 cursor-pointer py-2 font-medium">Completed plans</summary>{' '}
          <Section title={t('fd.plans.completed.heading')}>
            {completed.length > 0 ? (
              <ul className="space-y-3">
                {completed.map((p) => (
                  <PlanCard key={p.id} plan={p}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm min-h-11 w-full"
                      aria-label={t('fd.plans.completed.restore', { title: p.title })}
                      onClick={() => update((s) => restorePlan(s, p.id))}
                    >
                      <RotateCcw aria-hidden="true" className="h-4 w-4" />
                      {t('fd.plans.completed.restoreShort')}
                    </button>
                  </PlanCard>
                ))}
              </ul>
            ) : (
              <p className="text-base-content/70">{t('fd.plans.completed.empty')}</p>
            )}
          </Section>
        </details>
      </div>
      {creating && <NewPlanSheet kind={creating} onClose={() => setCreating(null)} />}
    </main>
  );
}
