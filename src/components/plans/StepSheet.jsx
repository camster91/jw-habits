import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Check, ExternalLink, RotateCcw, Trash2 } from 'lucide-react';
import { useStore } from '../../data/useStore.js';
import { deleteStep, moveStep, setStepDone, updateStep } from '../../domain/plans.js';
import { MAX_NOTE, MAX_TITLE } from '../../domain/ids.js';
import { isJwFinderLink, linkLabel } from '../../domain/jwlinks.js';
import { openLink } from '../../native/openLink.js';
import { isSafeHttpUrl } from '../../utils/safeUrls.js';
import { planStyle } from '../../theme/planColours.js';
import Sheet from './Sheet.jsx';

/** 'YYYY-MM-DD' as a local date in the app's language, e.g. "7 October 2026". */
function formatDay(day, language) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function Field({ label, error, children }) {
  const id = useId();
  const errorId = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': error ? errorId : undefined,
      })}
      {error && (
        <p id={errorId} className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Opens the step's link. Its name says where it goes: "Open in JW Library"
 * for a finder link, otherwise "Open link" described by the host.
 */
function LinkButton({ url }) {
  const { t } = useTranslation();
  const hostId = useId();
  const library = isJwFinderLink(url);
  return (
    <div className="space-y-1">
      <button
        type="button"
        className="btn btn-outline min-h-11 w-full justify-start gap-2 normal-case"
        aria-describedby={library ? undefined : hostId}
        onClick={() => openLink(url)}
      >
        <ExternalLink aria-hidden="true" className="h-5 w-5 shrink-0" />
        {library ? t('fd.plans.step.openInLibrary') : t('fd.plans.step.openLink')}
      </button>
      {!library && (
        <p id={hostId} className="truncate text-sm text-base-content/70">
          {linkLabel(url, t)}
        </p>
      )}
    </div>
  );
}

/**
 * One step of a plan: its link, note and done state, with editing, moving and
 * deleting. While the plan is archived (on the Completed shelf, including the
 * moment its last step is done) only Done/Undone stays: no rename, move or
 * delete. Renders nothing once the step is gone.
 */
export default function StepSheet({ planId, stepId, onClose, fallbackFocus }) {
  const { t, i18n } = useTranslation();
  const { store, update, today } = useStore();
  const plan = store.plans.find((p) => p.id === planId);
  const index = plan ? plan.steps.findIndex((s) => s.id === stepId) : -1;
  const step = index >= 0 ? plan.steps[index] : null;

  const [title, setTitle] = useState(step?.title ?? '');
  const [link, setLink] = useState(step?.link ?? '');
  const [note, setNote] = useState(step?.note ?? '');
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!step) return null;
  const readOnly = plan.archivedOn !== null;

  const save = () => {
    const next = {
      title: title.trim() ? null : t('fd.plans.step.titleNeeded'),
      link: link.trim() === '' || isSafeHttpUrl(link.trim()) ? null : t('fd.plans.step.badLink'),
    };
    if (next.title || next.link) {
      setErrors(next);
      return setSaved(false);
    }
    const patch = { title, link: link.trim() || null, note: note || null };
    // A refused patch returns the store itself: say so rather than "Saved".
    if (updateStep(store, planId, stepId, patch) === store) {
      setErrors({ form: t('fd.plans.step.refused') });
      return setSaved(false);
    }
    setErrors({});
    update((s) => updateStep(s, planId, stepId, patch));
    setSaved(true);
  };

  const edit = (setter) => (e) => {
    setter(e.target.value);
    setSaved(false);
  };

  const toggleDone = () =>
    update((s) => setStepDone(s, planId, stepId, step.doneOn ? null : today));
  const move = (delta) => update((s) => moveStep(s, planId, stepId, delta));
  const remove = () => {
    update((s) => deleteStep(s, planId, stepId));
    onClose();
  };

  return (
    <Sheet title={step.title} onClose={onClose} testId="step-sheet" fallbackFocus={fallbackFocus}>
      <div style={planStyle(plan.colour)} className="space-y-4">
        {step.doneOn && (
          <p className="fd-plan-text flex items-center gap-2 font-medium">
            <Check aria-hidden="true" className="h-5 w-5" />
            {t('fd.plans.step.doneOn', { date: formatDay(step.doneOn, i18n.language) })}
          </p>
        )}

        {!step.doneOn ? (
          <button
            type="button"
            className="btn min-h-11 w-full border-0 bg-[var(--plan)] text-white hover:bg-[var(--plan)]"
            onClick={toggleDone}
          >
            <Check aria-hidden="true" className="h-5 w-5" />
            {t('fd.plans.step.markDone')}
          </button>
        ) : (
          <button type="button" className="btn btn-outline min-h-11 w-full" onClick={toggleDone}>
            <RotateCcw aria-hidden="true" className="h-5 w-5" />
            {t('fd.plans.step.markUndone')}
          </button>
        )}

        {step.link && <LinkButton url={step.link} />}

        {readOnly ? (
          step.note && <p className="whitespace-pre-wrap break-words">{step.note}</p>
        ) : (
          <>
            <Field label={t('fd.plans.step.title')} error={errors.title}>
              {(p) => (
                <input
                  {...p}
                  type="text"
                  maxLength={MAX_TITLE}
                  className="input input-bordered min-h-11 w-full"
                  value={title}
                  onChange={edit(setTitle)}
                />
              )}
            </Field>
            <Field label={t('fd.plans.step.link')} error={errors.link}>
              {(p) => (
                <input
                  {...p}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  className="input input-bordered min-h-11 w-full"
                  placeholder="https://"
                  value={link}
                  onChange={edit(setLink)}
                />
              )}
            </Field>
            <Field label={t('fd.plans.step.note')}>
              {(p) => (
                <textarea
                  {...p}
                  maxLength={MAX_NOTE}
                  rows={3}
                  className="textarea textarea-bordered w-full"
                  value={note}
                  onChange={edit(setNote)}
                />
              )}
            </Field>
            <div className="flex items-center gap-3">
              <button type="button" className="btn btn-primary min-h-11" onClick={save}>
                {t('fd.plans.step.save')}
              </button>
              <span role="status" className="text-sm text-base-content/70">
                {saved ? t('fd.plans.step.saved') : ''}
              </span>
            </div>
            {errors.form && <p className="text-sm text-error">{errors.form}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost min-h-11 flex-1"
                disabled={index === 0}
                onClick={() => move(-1)}
              >
                <ArrowUp aria-hidden="true" className="h-5 w-5" />
                {t('fd.plans.step.moveUp')}
              </button>
              <button
                type="button"
                className="btn btn-ghost min-h-11 flex-1"
                disabled={index === plan.steps.length - 1}
                onClick={() => move(1)}
              >
                <ArrowDown aria-hidden="true" className="h-5 w-5" />
                {t('fd.plans.step.moveDown')}
              </button>
            </div>

            {confirming ? (
              <div className="space-y-2 rounded-2xl bg-base-200 p-3">
                <p>{t('fd.plans.step.confirmDelete')}</p>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-error min-h-11 flex-1" onClick={remove}>
                    {t('fd.plans.step.confirm')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost min-h-11 flex-1"
                    onClick={() => setConfirming(false)}
                  >
                    {t('fd.plans.step.keep')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-ghost min-h-11 w-full text-error"
                onClick={() => setConfirming(true)}
              >
                <Trash2 aria-hidden="true" className="h-5 w-5" />
                {t('fd.plans.step.delete')}
              </button>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
