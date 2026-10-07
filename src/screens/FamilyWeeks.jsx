import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../data/useStore.js';
import {
  agendaFor,
  addFreeItem,
  planWeeks,
  removeAgendaItem,
  setAgenda,
} from '../domain/agenda.js';
import { weekStart } from '../domain/day.js';
import { MAX_AGENDA_ITEMS, MAX_TITLE, newId } from '../domain/ids.js';
import { openLink } from '../native/openLink.js';
import { planStyle } from '../theme/planColours.js';
import { isSafeHttpUrl } from '../utils/safeUrls.js';
import PlanIcon from '../components/plans/PlanIcon.jsx';

/** 'YYYY-MM-DD' as a local date in the app's language, e.g. "12 October". */
function formatDay(day, language) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(language, { day: 'numeric', month: 'long' });
}

/** What an agenda item shows: its title, its plan (steps), its link and its done state. */
function describe(item, store) {
  if (item.kind === 'free') {
    return { title: item.title, link: item.link, plan: null, done: false };
  }
  const plan = store.plans.find((p) => p.id === item.planId);
  const step = plan?.steps.find((s) => s.id === item.stepId);
  if (!step) return null;
  return { title: step.title, link: step.link, plan, done: step.doneOn !== null };
}

function Item({ item, store, onRemove, readOnly }) {
  const { t } = useTranslation();
  const info = describe(item, store);
  if (!info) return null;
  return (
    <li className="flex items-center gap-2">
      {info.plan && (
        <span
          aria-hidden="true"
          style={{ ...planStyle(info.plan.colour), backgroundColor: 'var(--plan)' }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
        >
          <PlanIcon icon={info.plan.icon} className="h-4 w-4" />
        </span>
      )}
      <span className="min-w-0 flex-1 break-words">
        {readOnly && info.done ? (
          <span className="flex items-center gap-1">
            <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>{t('fd.family.stepDone', { title: info.title })}</span>
          </span>
        ) : (
          <span>{info.title}</span>
        )}
        {info.plan && !readOnly && (
          <span className="fd-plan-text block text-sm" style={planStyle(info.plan.colour)}>
            {info.plan.title}
          </span>
        )}
      </span>
      {info.link && !readOnly && (
        <button
          type="button"
          className="btn btn-ghost btn-circle min-h-11 min-w-11"
          aria-label={t('fd.family.openLink', { title: info.title })}
          onClick={() => openLink(info.link)}
        >
          <ExternalLink aria-hidden="true" className="h-5 w-5" />
        </button>
      )}
      {!readOnly && (
        <button
          type="button"
          className="btn btn-ghost btn-circle min-h-11 min-w-11"
          aria-label={t('fd.family.remove', { title: info.title })}
          onClick={() => onRemove(item.id)}
        >
          <Trash2 aria-hidden="true" className="h-5 w-5" />
        </button>
      )}
    </li>
  );
}

/** The open steps of the active family plans that this week does not already hold. */
function pickableSteps(store, items) {
  const used = new Set(items.filter((i) => i.kind === 'step').map((i) => i.stepId));
  return store.plans
    .filter((p) => p.kind === 'family' && p.archivedOn === null)
    .map((plan) => ({
      plan,
      steps: plan.steps.filter((s) => s.doneOn === null && !used.has(s.id)),
    }))
    .filter((g) => g.steps.length > 0);
}

/** The add panel: a free item (title and optional link) or a step from a family plan. */
function AddPanel({ week, items, onDone }) {
  const { t } = useTranslation();
  const { store, update } = useStore();
  const titleId = useId();
  const linkId = useId();
  const errId = useId();
  const pickId = useId();
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [pick, setPick] = useState('');
  const [errors, setErrors] = useState({});
  const groups = pickableSteps(store, items);

  const addFree = (e) => {
    e.preventDefault();
    const url = link.trim();
    const next = {
      title: title.trim() ? null : t('fd.family.free.titleNeeded'),
      link: url === '' || isSafeHttpUrl(url) ? null : t('fd.family.free.badLink'),
    };
    if (next.title || next.link) return setErrors(next);
    // A refused change returns the store itself: say so rather than close.
    if (addFreeItem(store, week, { title, link: url || null }) === store) {
      return setErrors({ form: t('fd.family.refused') });
    }
    update((s) => addFreeItem(s, week, { title, link: url || null }));
    onDone();
  };

  const addStepItem = (e) => {
    e.preventDefault();
    const plan = groups.find((g) => g.steps.some((s) => s.id === pick))?.plan;
    if (!plan) return;
    const item = { id: newId(), kind: 'step', planId: plan.id, stepId: pick };
    if (setAgenda(store, week, [...items, item]) === store) {
      return setErrors({ form: t('fd.family.refused') });
    }
    update((s) => setAgenda(s, week, [...agendaFor(s, week), item]));
    onDone();
  };

  return (
    <div className="space-y-4 rounded-2xl bg-base-200 p-3">
      <form className="space-y-2" onSubmit={addFree} noValidate>
        <div className="flex flex-col gap-1">
          <label htmlFor={titleId} className="text-sm font-medium">
            {t('fd.family.free.title')}
          </label>
          <input
            id={titleId}
            type="text"
            maxLength={MAX_TITLE}
            className="input input-bordered min-h-11 w-full"
            value={title}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? errId + 't' : undefined}
            onChange={(e) => setTitle(e.target.value)}
          />
          {errors.title && (
            <p id={errId + 't'} className="text-sm text-error">
              {errors.title}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={linkId} className="text-sm font-medium">
            {t('fd.family.free.link')}
          </label>
          <input
            id={linkId}
            type="url"
            inputMode="url"
            className="input input-bordered min-h-11 w-full"
            value={link}
            aria-invalid={Boolean(errors.link)}
            aria-describedby={errors.link ? errId + 'l' : undefined}
            onChange={(e) => setLink(e.target.value)}
          />
          {errors.link && (
            <p id={errId + 'l'} className="text-sm text-error">
              {errors.link}
            </p>
          )}
        </div>
        {errors.form && (
          <p role="alert" className="text-sm text-error">
            {errors.form}
          </p>
        )}
        <button type="submit" className="btn btn-primary min-h-11">
          <Plus aria-hidden="true" className="h-5 w-5" />
          {t('fd.family.free.add')}
        </button>
      </form>

      <form className="space-y-2" onSubmit={addStepItem}>
        <div className="flex flex-col gap-1">
          <label htmlFor={pickId} className="text-sm font-medium">
            {t('fd.family.step.pick')}
          </label>
          <select
            id={pickId}
            className="select select-bordered min-h-11 w-full"
            value={pick}
            disabled={groups.length === 0}
            onChange={(e) => setPick(e.target.value)}
          >
            <option value="">{t('fd.family.step.choose')}</option>
            {groups.map(({ plan, steps }) => (
              <optgroup key={plan.id} label={plan.title}>
                {steps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {groups.length === 0 && (
            <p className="text-sm text-base-content/70">{t('fd.family.step.none')}</p>
          )}
        </div>
        <button type="submit" className="btn btn-outline min-h-11" disabled={pick === ''}>
          <Plus aria-hidden="true" className="h-5 w-5" />
          {t('fd.family.step.add')}
        </button>
      </form>
    </div>
  );
}

function WeekCard({ week, today }) {
  const { t, i18n } = useTranslation();
  const { store, update } = useStore();
  const headingRef = useRef(null);
  const toggleRef = useRef(null);
  const [adding, setAdding] = useState(false);
  const panelId = useId();
  const items = agendaFor(store, week);
  const stored = Object.hasOwn(store.familyAgendas, week);
  const date = formatDay(week, i18n.language);
  const full = items.length >= MAX_AGENDA_ITEMS;
  const isThisWeek = week === weekStart(today);

  return (
    <section
      data-testid={`week-${week}`}
      aria-labelledby={`${panelId}-h`}
      className="space-y-3 rounded-3xl bg-base-100 p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2
          id={`${panelId}-h`}
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold focus:outline-none"
        >
          {t('fd.family.weekOf', { date })}
        </h2>
        {isThisWeek && <span className="badge badge-outline">{t('fd.family.thisWeek')}</span>}
        {!stored && items.length > 0 && (
          <span className="badge badge-ghost">{t('fd.family.suggested')}</span>
        )}
      </div>

      {items.length > 0 ? (
        <ul aria-label={t('fd.family.listLabel', { date })} className="space-y-2">
          {items.map((i) => (
            <Item
              key={i.id}
              item={i}
              store={store}
              onRemove={(id) => {
                update((s) => removeAgendaItem(s, week, id));
                headingRef.current?.focus();
              }}
            />
          ))}
        </ul>
      ) : (
        <p className="text-base-content/70">{t('fd.family.emptyWeek')}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!stored && items.length > 0 && (
          <button
            type="button"
            className="btn btn-primary min-h-11"
            aria-label={t('fd.family.keepWeek', { date })}
            onClick={() => {
              update((s) => setAgenda(s, week, agendaFor(s, week)));
              headingRef.current?.focus();
            }}
          >
            <Check aria-hidden="true" className="h-5 w-5" />
            {t('fd.family.keep')}
          </button>
        )}
        <button
          ref={toggleRef}
          type="button"
          className="btn btn-outline min-h-11"
          disabled={full}
          aria-expanded={adding && !full}
          aria-controls={panelId}
          onClick={() => setAdding((a) => !a)}
        >
          <Plus aria-hidden="true" className="h-5 w-5" />
          {t('fd.family.add')}
        </button>
      </div>
      {full && <p className="text-sm text-base-content/70">{t('fd.family.full')}</p>}

      <div id={panelId}>
        {adding && !full && (
          <AddPanel
            week={week}
            items={items}
            onDone={() => {
              setAdding(false);
              toggleRef.current?.focus();
            }}
          />
        )}
      </div>
    </section>
  );
}

/** Weeks that were stored before this week and are still kept, newest first. */
function earlierWeeks(store, today) {
  const monday = weekStart(today);
  return Object.keys(store.familyAgendas)
    .filter((w) => w < monday)
    .sort()
    .reverse();
}

function EarlierWeek({ week, store }) {
  const { t, i18n } = useTranslation();
  const date = formatDay(week, i18n.language);
  const items = store.familyAgendas[week];
  return (
    <section data-testid={`week-${week}`} className="space-y-2 rounded-2xl bg-base-100 p-3">
      <h3 className="font-semibold">{t('fd.family.weekOf', { date })}</h3>
      <ul aria-label={t('fd.family.listLabel', { date })} className="space-y-2">
        {items.map((i) => (
          <Item key={i.id} item={i} store={store} readOnly />
        ))}
      </ul>
    </section>
  );
}

/**
 * Family worship planning: this week and the next 8, each showing its stored
 * agenda or an auto-fill preview labelled "Suggested" (kept on request), with
 * free items, a step picker and remove. Earlier weeks are read-only.
 */
export default function FamilyWeeks() {
  const { t } = useTranslation();
  const { store, today } = useStore();
  const hasFamilyPlan = store.plans.some((p) => p.kind === 'family' && p.archivedOn === null);
  const past = earlierWeeks(store, today).filter((w) => store.familyAgendas[w].length > 0);

  return (
    <main
      data-testid="family-weeks"
      className="min-h-screen bg-base-200 px-4 pb-24 pt-[max(env(safe-area-inset-top),1rem)]"
    >
      <div className="mx-auto max-w-md space-y-4">
        <Link
          to="/plans"
          className="inline-flex min-h-11 items-center gap-1 font-medium text-[var(--fd-accent-text)]"
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          {t('fd.family.back')}
        </Link>
        <h1 className="text-2xl font-bold">{t('fd.family.title')}</h1>
        {!hasFamilyPlan && <p className="text-base-content/70">{t('fd.family.noPlans')}</p>}
        {planWeeks(today).map((w) => (
          <WeekCard key={w} week={w} today={today} />
        ))}
        {past.length > 0 && (
          <details className="space-y-2">
            <summary className="min-h-11 cursor-pointer py-2 font-medium">
              {t('fd.family.earlier')}
            </summary>
            <div className="space-y-2">
              {past.map((w) => (
                <EarlierWeek key={w} week={w} store={store} />
              ))}
            </div>
          </details>
        )}
      </div>
    </main>
  );
}
