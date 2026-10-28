import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { useStore } from '../../data/useStore.js';
import { EVENT_KINDS } from '../../domain/store.js';
import { MAX_TITLE } from '../../domain/ids.js';
import { addEvent, eventErrors, removeEvent, updateEvent } from '../../domain/events.js';
import Sheet from './Sheet.jsx';

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

const EMPTY = { kind: 'assembly', title: '', start: '', end: '', link: '' };

/**
 * Adds a big date (no `eventId`) or edits one: type, name (required for
 * Other), start, optional end and optional link. The form is checked with
 * the same rules as validateStore (`eventErrors`) before anything is saved.
 */
export default function EventSheet({ eventId = null, onClose, fallbackFocus }) {
  const { t } = useTranslation();
  const { store, update } = useStore();
  const event = eventId ? store.events.find((e) => e.id === eventId) : null;
  const [fields, setFields] = useState(() =>
    event
      ? {
          kind: event.kind,
          title: event.title ?? '',
          start: event.start,
          end: event.end ?? '',
          link: event.link ?? '',
        }
      : EMPTY
  );
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);

  if (eventId && !event) return null;

  const set = (key) => (e) => {
    const value = e.target.value;
    setFields((f) => ({ ...f, [key]: value }));
    setErrors((x) => ({ ...x, [key]: undefined, form: undefined }));
  };

  const nameNeeded = fields.kind === 'other' && fields.title.trim() === '';
  const message = (field) => errors[field] && t(`fd.events.error.${errors[field]}`);

  const save = () => {
    const found = eventErrors(fields);
    if (Object.keys(found).length > 0) return setErrors(found);
    const write = (s) => (event ? updateEvent(s, event.id, fields) : addEvent(s, fields));
    // A refusal returns the store itself: say so rather than closing.
    if (write(store) === store) return setErrors({ form: 'refused' });
    update(write);
    onClose();
  };

  const remove = () => {
    update((s) => removeEvent(s, event.id));
    onClose();
  };

  return (
    <Sheet
      title={event ? t('fd.events.sheet.edit') : t('fd.events.sheet.new')}
      onClose={onClose}
      testId="event-sheet"
      fallbackFocus={fallbackFocus}
    >
      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!nameNeeded) save();
        }}
      >
        <Field label={t('fd.events.sheet.kind')} error={message('kind')}>
          {(p) => (
            <select
              {...p}
              className="select select-bordered min-h-11 w-full"
              value={fields.kind}
              onChange={set('kind')}
            >
              {EVENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`fd.events.kind.${k}`)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field
          label={
            fields.kind === 'other' ? t('fd.events.sheet.name') : t('fd.events.sheet.nameOptional')
          }
          error={message('title')}
        >
          {(p) => (
            <input
              {...p}
              type="text"
              maxLength={MAX_TITLE}
              className="input input-bordered min-h-11 w-full"
              placeholder={fields.kind === 'other' ? '' : t(`fd.events.kind.${fields.kind}`)}
              value={fields.title}
              onChange={set('title')}
            />
          )}
        </Field>
        <Field label={t('fd.events.sheet.start')} error={message('start')}>
          {(p) => (
            <input
              {...p}
              type="date"
              className="input input-bordered min-h-11 w-full"
              value={fields.start}
              onChange={set('start')}
            />
          )}
        </Field>
        <Field label={t('fd.events.sheet.end')} error={message('end')}>
          {(p) => (
            <input
              {...p}
              type="date"
              min={fields.start || undefined}
              className="input input-bordered min-h-11 w-full"
              value={fields.end}
              onChange={set('end')}
            />
          )}
        </Field>
        <Field label={t('fd.events.sheet.link')} error={message('link')}>
          {(p) => (
            <input
              {...p}
              type="url"
              inputMode="url"
              autoComplete="off"
              className="input input-bordered min-h-11 w-full"
              placeholder="https://"
              value={fields.link}
              onChange={set('link')}
            />
          )}
        </Field>
        {errors.form && (
          <p role="alert" className="text-sm text-error">
            {t('fd.events.sheet.refused')}
          </p>
        )}
        <button type="submit" className="btn btn-primary min-h-11 w-full" disabled={nameNeeded}>
          {t('fd.events.sheet.save')}
        </button>
      </form>

      {event &&
        (confirming ? (
          <div className="space-y-2 rounded-2xl bg-base-200 p-3">
            <p>{t('fd.events.sheet.confirmDelete')}</p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-error min-h-11 flex-1" onClick={remove}>
                {t('fd.events.sheet.confirm')}
              </button>
              <button
                type="button"
                className="btn btn-ghost min-h-11 flex-1"
                onClick={() => setConfirming(false)}
              >
                {t('fd.events.sheet.keep')}
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
            {t('fd.events.sheet.delete')}
          </button>
        ))}
    </Sheet>
  );
}
