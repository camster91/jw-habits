import { useState } from 'react';
import { saveBackup } from '../../utils/backup.js';
import Sheet from '../plans/Sheet.jsx';
import { useOrganiser } from '../../data/useOrganiser.js';
import {
  archiveItem,
  changeOccurrence,
  deviceZone,
  editFuture,
  newOrganiserItem,
  putOrganiserItem,
  occurrenceInstant,
  validDate,
  validZone,
} from '../../domain/organiser.js';
import { addDays, weekday } from '../../domain/day.js';

export default function ItemEditor({ kind, date, occurrence, target, initialTitle = '', onClose }) {
  const { save } = useOrganiser();
  const [draft, setDraft] = useState(
    () =>
      occurrence ??
      newOrganiserItem(kind, {
        title: initialTitle,
        date: date ?? null,
        ...(kind === 'event' ? { date } : {}),
      })
  );
  const [scope, setScope] = useState('one'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(null);
  const initial = JSON.stringify(draft);
  const [baseline, setBaseline] = useState(initial);
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const close = () => {
    if (busy) return;
    if (confirm) {
      setConfirm(null);
      return;
    }
    if (JSON.stringify(draft) !== baseline) setConfirm('discard');
    else onClose();
  };
  const persist = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await save((o) => {
        let next;
        if (occurrence && scope === 'one')
          next = changeOccurrence(o, occurrence, {
            title: draft.title,
            details: draft.details,
            scheduledDate: draft.date,
            time: draft.time,
            timezone: draft.timezone,
            reminder: draft.reminder,
            ...(kind === 'event' ? { endDate: draft.endDate, endTime: draft.endTime } : {}),
          });
        else if (occurrence) next = editFuture(o, occurrence, { ...draft, repeat: draft.repeat });
        else next = putOrganiserItem(o, kind, draft);
        if (target)
          next = {
            ...next,
            relations: [
              ...next.relations,
              target.kind === 'note'
                ? { id: draft.id + '-context', source: target, target: { kind, id: draft.id } }
                : { id: draft.id + '-context', source: { kind, id: draft.id }, target },
            ],
          };
        return next;
      });
      setBaseline(JSON.stringify(draft));
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const archive = async () => {
    setBusy(true);
    try {
      await save((o) => archiveItem(o, kind, occurrence.id));
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const reminderPreview =
    draft.time && validDate(draft.date) && (kind === 'task' || validZone(draft.timezone))
      ? occurrenceInstant(draft)
      : null;
  return (
    <Sheet
      title={
        confirm === 'discard'
          ? 'Unsaved changes'
          : confirm === 'archive'
            ? 'Archive activity'
            : occurrence
              ? `Edit ${kind}`
              : `New ${kind}`
      }
      onClose={close}
    >
      {confirm ? (
        <div className="space-y-4">
          <p>
            {confirm === 'discard'
              ? 'Discard your unsaved changes?'
              : 'Archive this activity and its future occurrences? Its history and linked notes are kept.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              className="btn btn-primary min-h-11"
              onClick={() => setConfirm(null)}
            >
              Keep editing
            </button>
            <button
              disabled={busy}
              className="btn min-h-11"
              onClick={confirm === 'archive' ? archive : onClose}
            >
              {confirm === 'archive' ? 'Archive' : 'Discard changes'}
            </button>
          </div>
          <p role="alert">{error}</p>
        </div>
      ) : (
        <form onSubmit={persist} className="space-y-3">
          <fieldset disabled={busy} className="contents">
            <label className="block">
              Title
              <input
                autoFocus
                required
                maxLength={120}
                className="input min-h-11 w-full"
                value={draft.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </label>
            <label className="block">
              {kind === 'task' ? 'Due date (optional)' : 'Date'}
              <input
                type="date"
                required={kind === 'event' || draft.repeat.frequency !== 'none'}
                className="input min-h-11 w-full"
                value={draft.date ?? ''}
                onChange={(e) => set('date', e.target.value || null)}
              />
            </label>
            <details>
              <summary className="min-h-11 cursor-pointer py-2 font-medium">
                Time, recurrence & details
              </summary>
              <div className="space-y-3 py-2">
                <label className="block">
                  Time (optional)
                  <input
                    type="time"
                    className="input min-h-11 w-full"
                    value={draft.time ?? ''}
                    onChange={(e) => {
                      set('time', e.target.value || null);
                      if (!e.target.value) set('reminder', false);
                    }}
                  />
                </label>
                {kind === 'event' && (
                  <>
                    <label className="block">
                      Time zone
                      <input
                        required
                        className="input min-h-11 w-full"
                        value={draft.timezone}
                        onChange={(e) => set('timezone', e.target.value)}
                      />
                    </label>
                    <p className="text-sm text-base-content/70">
                      Your device uses {deviceZone()}. Event times stay in the chosen zone.
                    </p>
                    <label className="block">
                      {draft.time ? 'End date (optional)' : 'Last day (optional)'}
                      <input
                        type="date"
                        className="input min-h-11 w-full"
                        value={
                          draft.endDate
                            ? draft.time
                              ? draft.endDate
                              : addDays(draft.endDate, -1)
                            : ''
                        }
                        onChange={(e) =>
                          set(
                            'endDate',
                            e.target.value
                              ? draft.time
                                ? e.target.value
                                : addDays(e.target.value, 1)
                              : null
                          )
                        }
                      />
                    </label>
                    {draft.time && (
                      <label className="block">
                        End time (with end date)
                        <input
                          type="time"
                          className="input min-h-11 w-full"
                          value={draft.endTime ?? ''}
                          onChange={(e) => set('endTime', e.target.value || null)}
                        />
                      </label>
                    )}
                    <p className="text-sm text-base-content/70">
                      Without a time this is all day. Choose the last day it covers; a one-day event
                      needs no end date. Events can span up to one year.
                    </p>
                  </>
                )}
                {(!occurrence || scope === 'future') && (
                  <>
                    <label className="block">
                      Repeat
                      <select
                        className="select min-h-11 w-full"
                        value={draft.repeat.frequency}
                        onChange={(e) =>
                          set('repeat', {
                            ...draft.repeat,
                            frequency: e.target.value,
                            weekdays:
                              e.target.value === 'weekly' ? [weekday(draft.date ?? date)] : [],
                            until: null,
                          })
                        }
                      >
                        <option value="none">Does not repeat</option>
                        <option value="daily">Every day</option>
                        <option value="weekly">Selected weekdays</option>
                        <option value="monthly">Monthly on this date</option>
                      </select>
                    </label>
                    {draft.repeat.frequency === 'weekly' && (
                      <fieldset>
                        <legend>Weekdays</legend>
                        <div className="flex flex-wrap gap-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                            <label key={d} className="flex min-h-11 items-center gap-1">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-sm"
                                checked={draft.repeat.weekdays.includes(i)}
                                onChange={(e) =>
                                  set('repeat', {
                                    ...draft.repeat,
                                    weekdays: e.target.checked
                                      ? [...draft.repeat.weekdays, i]
                                      : draft.repeat.weekdays.filter((v) => v !== i),
                                  })
                                }
                              />
                              {d}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    )}
                    {draft.repeat.frequency !== 'none' && (
                      <label className="block">
                        Repeat until (optional)
                        <input
                          type="date"
                          className="input min-h-11 w-full"
                          value={draft.repeat.until ?? ''}
                          onChange={(e) =>
                            set('repeat', { ...draft.repeat, until: e.target.value || null })
                          }
                        />
                      </label>
                    )}
                    {draft.repeat.frequency === 'monthly' && (
                      <p className="text-sm text-base-content/70">
                        Months without this date are skipped.
                      </p>
                    )}
                  </>
                )}
                {reminderPreview && (
                  <p className="text-sm text-base-content/70">
                    On your device:{' '}
                    {reminderPreview.toLocaleString('en', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                    . Daylight-saving gaps move forward; repeated clock times use the earlier
                    occurrence.
                  </p>
                )}
                <label className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    className="checkbox"
                    disabled={!draft.time}
                    checked={draft.reminder}
                    onChange={(e) => set('reminder', e.target.checked)}
                  />
                  Remind me at this time
                </label>
                <p className="text-sm text-base-content/70">
                  Requires a clock time, global reminders enabled and phone notification permission.
                  No browser notifications are promised. Tasks follow your device time zone.
                </p>
                <label className="block">
                  Details
                  <textarea
                    maxLength={2000}
                    className="textarea min-h-28 w-full"
                    value={draft.details}
                    onChange={(e) => set('details', e.target.value)}
                  />
                </label>
              </div>
            </details>
            {occurrence?.repeat.frequency !== 'none' && occurrence && (
              <label className="block">
                Apply changes to
                <select
                  className="select min-h-11 w-full"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                >
                  <option value="one">This occurrence</option>
                  <option value="future">This and future occurrences</option>
                </select>
              </label>
            )}
            <p role="alert" className="text-error">
              {error}
            </p>
            {error && (
              <button
                type="button"
                disabled={busy}
                className="btn min-h-11"
                onClick={async () => {
                  try {
                    await saveBackup(
                      JSON.stringify({ kind, draft }, null, 2),
                      'faithful-days-activity-draft.json',
                      'Unsaved activity draft'
                    );
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                Export this draft
              </button>
            )}
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} className="btn btn-primary min-h-11">
                {busy ? 'Saving…' : 'Save ' + kind}
              </button>
              {occurrence && (
                <button
                  type="button"
                  disabled={busy}
                  className="btn btn-ghost min-h-11"
                  onClick={() => setConfirm('archive')}
                >
                  Archive
                </button>
              )}
            </div>
          </fieldset>
        </form>
      )}
    </Sheet>
  );
}
