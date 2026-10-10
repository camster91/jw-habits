import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Check, Plus, NotebookPen, Undo2 } from 'lucide-react';
import { useOrganiser } from '../../data/useOrganiser.js';
import { useWorkspace } from '../../data/useWorkspace.js';
import { addDays, weekStart, weekday } from '../../domain/day.js';
import {
  calendarEvents,
  changeOccurrence,
  civilDate,
  organiserOccurrences,
} from '../../domain/organiser.js';
import { saveBackup } from '../../utils/backup.js';
import Sheet from '../plans/Sheet.jsx';
import ItemEditor from './ItemEditor.jsx';

const friendlyDate = (date) =>
  new Date(date + 'T12:00:00').toLocaleDateString('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
export default function OrganiserBoard({ compact = false }) {
  const context = useOrganiser(),
    workspaceContext = useWorkspace();
  const [selected, setSelected] = useState(civilDate),
    [view, setView] = useState('Agenda'),
    [editing, setEditing] = useState(null),
    [detail, setDetail] = useState(null),
    [adding, setAdding] = useState(false),
    [error, setError] = useState(''),
    [undo, setUndo] = useState(null),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState('Upcoming');
  if (!context) return null;
  const { organiser, ready, save, rawExport } = context;
  const today = civilDate(),
    monday = weekStart(selected),
    month = selected.slice(0, 7) + '-01';
  const from = compact
    ? addDays(today, -90)
    : view === 'Week'
      ? monday
      : view === 'Month'
        ? month
        : view === 'Tasks'
          ? addDays(today, -90)
          : selected;
  const to = compact
    ? today
    : view === 'Week'
      ? addDays(monday, 6)
      : view === 'Month'
        ? addDays(addDays(month, 32).slice(0, 7) + '-01', -1)
        : view === 'Tasks'
          ? addDays(today, 180)
          : selected;
  let tasks = organiserOccurrences(organiser, 'task', from, to, {
      includeArchived: view === 'Tasks' && filter === 'Completed',
    }),
    events = calendarEvents(organiser, from, to);
  if (compact) {
    tasks = tasks.filter((t) => t.date && t.date <= today && t.status === 'open');
    events = events.filter((e) => e.displayDate <= today && e.displayEndDate >= today);
  } else if (view !== 'Tasks')
    tasks = tasks.filter((t) => t.date !== null && t.status !== 'skipped');
  if (view === 'Tasks') {
    tasks = tasks.filter((t) =>
      filter === 'Completed'
        ? t.status === 'done'
        : filter === 'Today'
          ? t.date === today && t.status === 'open'
          : filter === 'All'
            ? true
            : t.status === 'open'
    );
  }
  tasks = tasks.filter((t) =>
    (t.title + ' ' + t.details).toLowerCase().includes(query.toLowerCase())
  );
  const eventIndicators = events;
  if (!compact && view === 'Month') {
    tasks = tasks.filter((t) => t.date === selected);
    events = events.filter((e) => e.displayDate <= selected && e.displayEndDate >= selected);
  }
  const dueCount = tasks.length + events.length;
  if (compact) {
    tasks = tasks.slice(0, 3);
    events = events.slice(0, 2);
  }
  const act = async (change, message) => {
    setError('');
    try {
      let before;
      const result = await save((current) => {
        before = current;
        return change(current);
      });
      setUndo({ before, message, revision: result.revision });
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };
  const toggle = async (t) => {
    await act(
      (o) =>
        changeOccurrence(o, t, {
          status:
            (o.exceptions.find((e) => e.id === t.key)?.status ?? t.status) === 'done'
              ? 'open'
              : 'done',
        }),
      t.status === 'done' ? 'Task reopened' : 'Task completed'
    );
  };
  const row = (t) => (
    <li
      key={t.key}
      className="flex items-center gap-2 border-b border-base-content/10 py-3 last:border-0"
    >
      <button
        type="button"
        aria-label={`${t.status === 'done' ? 'Reopen' : 'Complete'} ${t.title}`}
        aria-pressed={t.status === 'done'}
        className={`btn btn-circle btn-outline min-h-11 min-w-11 ${t.status === 'done' ? 'btn-primary' : ''}`}
        onClick={() => toggle(t)}
      >
        {t.status === 'done' && <Check className="h-5 w-5" />}
      </button>
      <button className="min-h-11 min-w-0 flex-1 text-left" onClick={() => setDetail(t)}>
        <span
          className={`block break-words font-medium ${t.status === 'done' ? 'line-through' : ''}`}
        >
          {t.title}
        </span>
        <span className="block text-sm text-base-content/70">
          {t.date ? (t.date < today ? 'Overdue · ' : '') + friendlyDate(t.date) : 'No date'}
          {t.time ? ' · ' + t.time : ''}
          {t.repeat.frequency !== 'none' ? ' · Repeats' : ''}
        </span>
      </button>
    </li>
  );
  const eventRow = (e) => (
    <li key={e.key} className="border-b border-base-content/10 last:border-0">
      <button
        className="flex min-h-11 w-full items-center gap-3 py-3 text-left"
        onClick={() => setDetail(e)}
      >
        <CalendarDays
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-[var(--fd-accent-text)]"
        />
        <span className="min-w-0">
          <span className="block break-words font-medium">{e.title}</span>
          <span className="block text-sm text-base-content/70">
            {friendlyDate(e.displayDate)} · {e.displayTime ?? 'All day'}
            {e.displayEndDate !== e.displayDate ? ' – ' + friendlyDate(e.displayEndDate) : ''}
            {e.time ? ' · device time' : ''}
          </span>
        </span>
      </button>
    </li>
  );
  const exportOriginal = async () => {
    try {
      await saveBackup(
        (await rawExport()) ?? '{}',
        'faithful-days-organiser-original.json',
        'Original tasks and calendar'
      );
    } catch (e) {
      setError(e.message);
    }
  };
  const legacyMeetings =
    workspaceContext?.workspace.meetings.filter((m) => m.date >= from && m.date <= to) ?? [];
  const legacyTasks =
    workspaceContext?.workspace.assignments.flatMap((a) =>
      a.date >= from && a.date <= to
        ? a.tasks.filter((t) => !compact || !t.done).map((t) => ({ ...t, assignment: a }))
        : []
    ) ?? [];
  return (
    <section
      aria-label={compact ? 'Today agenda and tasks' : 'Calendar and tasks'}
      className="space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{compact ? 'Your agenda' : 'Calendar & tasks'}</h2>
        <button
          disabled={!ready}
          className="btn btn-ghost min-h-11"
          onClick={() => setAdding(true)}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add
        </button>
      </div>
      <p role="alert" className="text-error">
        {error || context.error}
      </p>
      {!ready && (
        <button className="btn min-h-11" onClick={exportOriginal}>
          Export original tasks and calendar
        </button>
      )}
      {undo && (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-xl bg-base-100 p-2">
          <span>{undo.message}</span>
          <button
            className="btn btn-ghost min-h-11"
            disabled={organiser.revision !== undo.revision}
            onClick={async () => {
              if (await act(() => undo.before, 'Change undone')) setUndo(null);
            }}
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            Undo
          </button>
        </div>
      )}
      {!compact && (
        <>
          <div className="flex flex-wrap gap-1" aria-label="Calendar views">
            {['Agenda', 'Week', 'Month', 'Tasks'].map((v) => (
              <button
                key={v}
                className={`btn btn-sm min-h-11 ${view === v ? 'btn-primary' : 'btn-ghost'}`}
                aria-pressed={view === v}
                onClick={() => setView(v)}
              >
                {v}
              </button>
            ))}
          </div>
          {view === 'Tasks' ? (
            <>
              <label className="block">
                Search tasks
                <input
                  type="search"
                  className="input min-h-11 w-full"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <label className="block">
                Task view
                <select
                  className="select min-h-11 w-full"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  {['Upcoming', 'Today', 'All', 'Completed'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <p className="text-sm text-base-content/70">
                Recurring tasks include the last 90 days and next 180 days. Use the calendar to
                inspect earlier dates.
              </p>
            </>
          ) : (
            <>
              <label className="block">
                Choose date
                <input
                  type="date"
                  className="input min-h-11 w-full"
                  value={selected}
                  onChange={(e) => e.target.value && setSelected(e.target.value)}
                />
              </label>
              <div className="grid grid-cols-7 gap-1">
                {Array.from(
                  {
                    length:
                      view === 'Month' ? Number(to.slice(-2)) + ((weekday(month) + 6) % 7) : 7,
                  },
                  (_, i) => {
                    const d = view === 'Month' ? i - ((weekday(month) + 6) % 7) + 1 : i + 1;
                    if (d < 1) return <span key={i} />;
                    const day =
                      view === 'Month'
                        ? month.slice(0, 8) + String(d).padStart(2, '0')
                        : addDays(monday, i);
                    const count = eventIndicators.filter(
                      (e) => e.displayDate <= day && e.displayEndDate >= day
                    ).length;
                    return (
                      <button
                        key={day}
                        aria-label={friendlyDate(day)}
                        aria-pressed={selected === day}
                        className={`min-h-11 rounded-lg text-sm ${selected === day ? 'bg-[var(--fd-accent)] text-white' : 'bg-base-100'}`}
                        onClick={() => {
                          setSelected(day);
                          if (view === 'Week') setView('Agenda');
                        }}
                      >
                        {view !== 'Month' && (
                          <span className="block text-xs">
                            {new Date(day + 'T12:00:00').toLocaleDateString('en', {
                              weekday: 'short',
                            })}
                          </span>
                        )}
                        {Number(day.slice(-2))}
                        {count > 0 && (
                          <span aria-hidden="true" className="block leading-2">
                            ·
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>
              <p className="text-sm font-medium">
                {view === 'Week'
                  ? `${friendlyDate(from)} – ${friendlyDate(to)}`
                  : view === 'Month'
                    ? new Date(month + 'T12:00:00').toLocaleDateString('en', {
                        month: 'long',
                        year: 'numeric',
                      })
                    : friendlyDate(selected)}
              </p>
            </>
          )}
        </>
      )}
      {view !== 'Tasks' && (
        <>
          <ul>{events.map(eventRow)}</ul>
          {legacyMeetings.map((m) => (
            <Link key={m.id} className="block min-h-11 py-2 underline" to="/plans/preparation">
              {m.type} meeting · {friendlyDate(m.date)} · Open preparation
            </Link>
          ))}
        </>
      )}
      {tasks.length > 0 && (
        <div>
          <h3 className="font-semibold">{compact ? 'Next steps' : 'Tasks'}</h3>
          <ul>{tasks.map(row)}</ul>
        </div>
      )}
      {legacyTasks.map((t) => (
        <div key={t.id} className="flex items-center gap-2 py-2">
          <button
            aria-label={`${t.done ? 'Reopen' : 'Complete'} ${t.title}`}
            aria-pressed={t.done}
            className="btn btn-circle btn-outline min-h-11"
            onClick={async () => {
              try {
                await workspaceContext.save((w) => ({
                  ...w,
                  assignments: w.assignments.map((a) =>
                    a.id === t.assignment.id
                      ? {
                          ...a,
                          tasks: a.tasks.map((v) => (v.id === t.id ? { ...v, done: !v.done } : v)),
                        }
                      : a
                  ),
                }));
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            {t.done && <Check className="h-5 w-5" />}
          </button>
          <Link className="min-h-11 py-2 text-sm underline" to="/plans/preparation">
            {t.title} · {t.assignment.title}
          </Link>
        </div>
      ))}
      {!tasks.length && !events.length && !legacyTasks.length && !legacyMeetings.length && (
        <p className="text-sm text-base-content/70">
          {compact
            ? 'No dated tasks or events due. Your routines are below.'
            : 'Nothing here yet. Add an event or a small next step.'}
        </p>
      )}
      {!compact && organiser.tasks.concat(organiser.events).some((i) => i.archivedAt) && (
        <details>
          <summary className="min-h-11 cursor-pointer py-2">Archived activities</summary>
          {['task', 'event'].flatMap((kind) =>
            organiser[kind === 'task' ? 'tasks' : 'events']
              .filter((i) => i.archivedAt)
              .map((i) => (
                <button
                  key={i.id}
                  className="btn btn-ghost min-h-11"
                  onClick={() =>
                    act(
                      (o) => ({
                        ...o,
                        [kind === 'task' ? 'tasks' : 'events']: o[
                          kind === 'task' ? 'tasks' : 'events'
                        ].map((v) => (v.id === i.id ? { ...v, archivedAt: null } : v)),
                      }),
                      'Activity restored'
                    )
                  }
                >
                  Restore {i.title}
                </button>
              ))
          )}
        </details>
      )}
      {!compact && (
        <p className="text-sm text-base-content/70">
          Events use calendar dates. Routine records keep the 3 a.m. tracking-day boundary. Planning
          never records spiritual activity.
        </p>
      )}
      {compact && dueCount > 0 && (
        <Link to="/plans" className="block min-h-11 py-2 underline">
          See all {dueCount} tasks and events
        </Link>
      )}
      {adding && (
        <Sheet title="Add something" onClose={() => setAdding(false)}>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn min-h-11"
              onClick={() => {
                setAdding(false);
                setEditing({ kind: 'task', date: compact ? today : selected });
              }}
            >
              Task
            </button>
            <button
              className="btn min-h-11"
              onClick={() => {
                setAdding(false);
                setEditing({ kind: 'event', date: compact ? today : selected });
              }}
            >
              Event
            </button>
            <Link className="btn min-h-11" to="/notes?new=1">
              Note
            </Link>
          </div>
        </Sheet>
      )}
      {detail && (
        <Sheet title={detail.title} onClose={() => setDetail(null)}>
          <p>
            {detail.date ? friendlyDate(detail.date) : 'No date'}
            {detail.time ? ' · ' + detail.time + ' · ' + detail.timezone : ''}
          </p>
          <p className="whitespace-pre-wrap break-words">{detail.details}</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn min-h-11"
              onClick={() => {
                setEditing({ kind: detail.kind, date: detail.date, occurrence: detail });
                setDetail(null);
              }}
            >
              Edit or reschedule
            </button>
            <Link
              className="btn min-h-11"
              to={`/notes?new=1&targetKind=${detail.kind}&targetId=${encodeURIComponent(detail.id)}`}
            >
              <NotebookPen className="h-4 w-4" aria-hidden="true" />
              Add linked note
            </Link>
            {detail.kind === 'event' && (
              <button
                className="btn min-h-11"
                onClick={() => {
                  setEditing({
                    kind: 'task',
                    date: detail.displayDate ?? detail.date,
                    target: { kind: 'event', id: detail.id },
                  });
                  setDetail(null);
                }}
              >
                Add preparation task
              </button>
            )}
            {detail.repeat.frequency !== 'none' && (
              <button
                className="btn min-h-11"
                onClick={async () => {
                  if (
                    await act(
                      (o) => changeOccurrence(o, detail, { status: 'skipped' }),
                      'Occurrence skipped'
                    )
                  )
                    setDetail(null);
                }}
              >
                Skip this occurrence
              </button>
            )}
          </div>
          {detail.kind === 'event' && (
            <div>
              <h3 className="font-semibold">Preparation tasks</h3>
              <ul>
                {organiser.relations
                  .filter(
                    (r) =>
                      r.source.kind === 'task' &&
                      r.target.kind === 'event' &&
                      r.target.id === detail.id
                  )
                  .map((r) => {
                    const task = organiser.tasks.find((t) => t.id === r.source.id);
                    const occurrence =
                      task &&
                      organiserOccurrences(
                        organiser,
                        'task',
                        addDays(detail.date, -90),
                        addDays(detail.date, 180)
                      ).find((t) => t.id === task.id);
                    return occurrence ? (
                      row(occurrence)
                    ) : (
                      <li key={r.id}>
                        This preparation task is archived or outside this date range.
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
          <h3 className="font-semibold">Linked notes</h3>
          {organiser.relations
            .filter(
              (r) =>
                r.source.kind === 'note' &&
                r.target.kind === detail.kind &&
                r.target.id === detail.id
            )
            .map((r) => {
              const n = workspaceContext?.workspace.notes.find((n) => n.id === r.source.id);
              return n ? (
                <Link
                  key={r.id}
                  to={`/notes?note=${encodeURIComponent(n.id)}`}
                  className="block min-h-11 py-2 underline"
                >
                  {n.title}
                </Link>
              ) : (
                <p key={r.id} className="text-sm">
                  A linked note is no longer available.
                </p>
              );
            })}
          <p className="text-sm text-base-content/70">
            This is a planned activity, separate from routine check-ins.
          </p>
        </Sheet>
      )}
      {editing && <ItemEditor {...editing} onClose={() => setEditing(null)} />}
    </section>
  );
}
