import QuickGuide from '../components/QuickGuide.jsx';
import ScreenIntro from '../components/ScreenIntro.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../data/useWorkspace.js';
import { useStore } from '../data/useStore.js';
import { MEETING_PARTS, ASSIGNMENT_TYPES } from '../domain/workspace.js';
import { newId } from '../domain/ids.js';

export default function Preparation() {
  const { workspace, save, ready, error } = useWorkspace();
  const { today } = useStore();
  const [meetingType, setMeetingType] = useState('midweek');
  const [date, setDate] = useState(today);
  const [title, setTitle] = useState('');
  const [type, setType] = useState(ASSIGNMENT_TYPES[0]);
  const [due, setDue] = useState(today);
  const [details, setDetails] = useState('');
  const [tasks, setTasks] = useState('Read the assigned material\nPractise\nCheck timing');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [meetingFormOverride, setMeetingFormOpen] = useState(null);
  const [assignmentFormOverride, setAssignmentFormOpen] = useState(null);
  const meetingFormOpen = meetingFormOverride ?? !workspace.meetings.length;
  const assignmentFormOpen = assignmentFormOverride ?? !workspace.assignments.length;
  const assignmentTitle = useRef(null);
  useEffect(() => {
    if (editingAssignment && assignmentFormOpen) assignmentTitle.current?.focus();
  }, [editingAssignment, assignmentFormOpen]);
  const [pendingPart, setPendingPart] = useState(null);
  const [pendingTask, setPendingTask] = useState(null);
  const change = async (fn, onSaved = () => {}) => {
    setBusy(true);
    setStatus('Saving…');
    try {
      await save(fn);
      setStatus('Saved on this device.');
      onSaved();
    } catch {
      setStatus('');
      /* provider displays error; draft fields are retained */
    } finally {
      setBusy(false);
      setPendingPart(null);
      setPendingTask(null);
    }
  };
  const addMeeting = (e) => {
    e.preventDefault();
    if (workspace.meetings.some((m) => m.type === meetingType && m.date === date)) {
      setStatus('That meeting is already listed below.');
      return;
    }
    change(
      (w) => ({
        ...w,
        meetings: [...w.meetings, { id: newId(), type: meetingType, date, prepared: [] }],
      }),
      () => setMeetingFormOpen(false)
    );
  };
  const addAssignment = (e) => {
    e.preventDefault();
    change(
      (w) => ({
        ...w,
        assignments: [
          ...w.assignments.filter((a) => a.id !== editingAssignment),
          {
            id: editingAssignment ?? newId(),
            title: title.trim(),
            type,
            date: due,
            details,
            tasks: tasks
              .split('\n')
              .map((t) => t.trim())
              .filter(Boolean)
              .map((t, i) => {
                const existing = w.assignments.find((a) => a.id === editingAssignment)?.tasks[i];
                return existing?.title === t ? existing : { id: newId(), title: t, done: false };
              }),
          },
        ],
      }),
      () => {
        setTitle('');
        setDetails('');
        setEditingAssignment(null);
        setAssignmentFormOpen(false);
      }
    );
  };
  const togglePart = (id, part) => {
    setPendingPart({
      id,
      part,
      checked: !workspace.meetings.find((m) => m.id === id).prepared.includes(part),
    });
    return change((w) => ({
      ...w,
      meetings: w.meetings.map((m) =>
        m.id === id
          ? {
              ...m,
              prepared: m.prepared.includes(part)
                ? m.prepared.filter((p) => p !== part)
                : [...m.prepared, part],
            }
          : m
      ),
    }));
  };
  const toggleTask = (id, taskId) => {
    setPendingTask({
      id,
      taskId,
      checked: !workspace.assignments.find((a) => a.id === id).tasks.find((t) => t.id === taskId)
        .done,
    });
    return change((w) => ({
      ...w,
      assignments: w.assignments.map((a) =>
        a.id === id
          ? { ...a, tasks: a.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }
          : a
      ),
    }));
  };
  const remove = () =>
    change(
      (w) => ({
        ...w,
        [deleting.collection]: w[deleting.collection].filter((x) => x.id !== deleting.id),
      }),
      () => setDeleting(null)
    );
  const noteLink = (kind, id) => `/notes?new=1&context=${kind}&id=${encodeURIComponent(id)}`;
  return (
    <main className="min-h-screen bg-base-200 px-4 pb-24 pt-[max(env(safe-area-inset-top),1rem)]">
      <div className="mx-auto max-w-md space-y-6">
        <Link className="inline-flex min-h-11 items-center underline" to="/plans">
          Back to Plan
        </Link>
        <ScreenIntro
          title="Prepare ahead"
          subtitle="A calmer meeting day starts with a small step today."
          art="plans"
          tone="amber"
        />
        <QuickGuide
          title="Get ready, without rushing"
          steps={[
            {
              title: 'Pick the real date',
              body: 'Add a midweek or weekend meeting. Keep its checklist with that meeting, even when you prepare early.',
            },
            {
              title: 'Break an assignment down',
              body: 'Add your assignment and edit its checklist: read, practise and check timing are a starting point, not required steps.',
            },
            {
              title: 'Capture your thinking',
              body: 'Open a linked note for your ideas and references. Preparation stays separate from routine activity on Today.',
            },
          ]}
        />
        <p>
          Choose the actual meeting or assignment date. Prepared items stay separate from activity
          recorded on Today.
        </p>
        <p role="alert" className="text-error">
          {error}
        </p>
        <p role="status">{status}</p>
        <section aria-labelledby="meetings-heading" className="space-y-3">
          <h2 id="meetings-heading" className="text-xl font-semibold">
            Meeting preparation
          </h2>
          <button
            type="button"
            className="btn min-h-11"
            aria-expanded={meetingFormOpen}
            aria-controls="meeting-form"
            disabled={busy}
            onClick={() => setMeetingFormOpen(!meetingFormOpen)}
          >
            {meetingFormOpen ? 'Close meeting form' : 'New meeting'}
          </button>
          <form
            id="meeting-form"
            hidden={!meetingFormOpen}
            className="space-y-3 rounded-2xl bg-base-100 p-4"
            onSubmit={addMeeting}
          >
            <label className="block">
              <span id="meeting-type-label">Meeting type</span>
              <select
                className="select min-h-11 w-full"
                aria-labelledby="meeting-type-label"
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value)}
              >
                <option value="midweek">Midweek meeting</option>
                <option value="weekend">Weekend meeting</option>
              </select>
            </label>
            <label className="block">
              <span>Meeting date</span>
              <input
                required
                type="date"
                className="input min-h-11 w-full"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <button disabled={!ready || busy} className="btn btn-primary min-h-11">
              Add meeting
            </button>
          </form>
          <p className="text-sm text-base-content/70">
            Use the meeting workbook or assigned material for that week. These are your preparation
            checks, not the meeting programme.
          </p>
          {[...workspace.meetings]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((m) => (
              <article key={m.id} className="space-y-2 rounded-2xl bg-base-100 p-4">
                <h3 className="font-semibold">
                  {m.type === 'midweek' ? 'Midweek meeting' : 'Weekend meeting'} · {m.date}
                </h3>
                <p className="text-sm">
                  {m.prepared.length} of {MEETING_PARTS[m.type].length} sections prepared
                </p>
                {MEETING_PARTS[m.type].map((part) => (
                  <label key={part} className="flex min-h-11 items-center gap-3">
                    <input
                      type="checkbox"
                      className="checkbox shrink-0"
                      disabled={busy || !ready}
                      checked={
                        pendingPart?.id === m.id && pendingPart.part === part
                          ? pendingPart.checked
                          : m.prepared.includes(part)
                      }
                      onChange={() => togglePart(m.id, part)}
                    />
                    <span>{part}</span>
                  </label>
                ))}
                <Link
                  className="inline-flex min-h-11 items-center underline"
                  to={noteLink('meeting', m.id)}
                >
                  Add a meeting note
                </Link>
                <button
                  className="btn btn-ghost min-h-11"
                  disabled={busy}
                  onClick={() => setDeleting({ collection: 'meetings', id: m.id })}
                >
                  Remove meeting
                </button>
              </article>
            ))}
        </section>
        <section aria-labelledby="assignments-heading" className="space-y-3">
          <h2 id="assignments-heading" className="text-xl font-semibold">
            My assignments
          </h2>
          <button
            type="button"
            className="btn min-h-11"
            aria-expanded={assignmentFormOpen}
            aria-controls="assignment-form"
            disabled={busy}
            onClick={() => setAssignmentFormOpen(!assignmentFormOpen)}
          >
            {assignmentFormOpen
              ? 'Close assignment form'
              : editingAssignment
                ? 'Continue assignment edit'
                : 'New assignment'}
          </button>
          <form
            id="assignment-form"
            hidden={!assignmentFormOpen}
            className="space-y-3 rounded-2xl bg-base-100 p-4"
            onSubmit={addAssignment}
          >
            <label className="block">
              <span>Assignment title</span>
              <input
                ref={assignmentTitle}
                required
                maxLength={120}
                className="input min-h-11 w-full"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="block">
              <span id="assignment-type-label">Assignment type</span>
              <select
                className="select min-h-11 w-full"
                aria-labelledby="assignment-type-label"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {ASSIGNMENT_TYPES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span>Assignment date</span>
              <input
                required
                type="date"
                className="input min-h-11 w-full"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </label>
            <label className="block">
              <span>Details or reference</span>
              <textarea
                maxLength={2000}
                className="textarea w-full"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </label>
            <label className="block">
              <span>Preparation checklist (one item per line)</span>
              <textarea
                rows={3}
                className="textarea w-full"
                value={tasks}
                onChange={(e) => setTasks(e.target.value)}
              />
            </label>
            <p className="text-sm text-base-content/70">Up to 30 items, 120 characters each.</p>
            <button className="btn btn-primary min-h-11" disabled={busy || !ready}>
              {editingAssignment ? 'Save assignment' : 'Add assignment'}
            </button>
            {editingAssignment && (
              <button
                type="button"
                className="btn min-h-11"
                disabled={busy}
                onClick={() => {
                  setEditingAssignment(null);
                  setTitle('');
                  setDetails('');
                  setAssignmentFormOpen(false);
                }}
              >
                Cancel assignment edit
              </button>
            )}
          </form>
          {[...workspace.assignments]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((a) => (
              <article key={a.id} className="space-y-2 rounded-2xl bg-base-100 p-4 break-words">
                <h3 className="font-semibold">{a.title}</h3>
                <p>
                  {a.type} · {a.date}
                </p>
                <p className="whitespace-pre-wrap">{a.details}</p>
                {a.tasks.map((t) => (
                  <label className="flex min-h-11 items-center gap-3" key={t.id}>
                    <input
                      type="checkbox"
                      className="checkbox shrink-0"
                      disabled={busy || !ready}
                      checked={
                        pendingTask?.id === a.id && pendingTask.taskId === t.id
                          ? pendingTask.checked
                          : t.done
                      }
                      onChange={() => toggleTask(a.id, t.id)}
                    />
                    <span>{t.title}</span>
                  </label>
                ))}
                <p>
                  {a.tasks.length && a.tasks.every((t) => t.done)
                    ? 'Checklist prepared. Delivering the assignment is a separate activity.'
                    : 'Prepare at your own pace.'}
                </p>
                <Link
                  className="inline-flex min-h-11 items-center underline"
                  to={noteLink('assignment', a.id)}
                >
                  Add an assignment note
                </Link>
                <button
                  className="btn btn-ghost min-h-11"
                  disabled={busy}
                  onClick={() => {
                    setEditingAssignment(a.id);
                    setTitle(a.title);
                    setType(a.type);
                    setDue(a.date);
                    setDetails(a.details);
                    setTasks(a.tasks.map((t) => t.title).join('\n'));
                    setAssignmentFormOpen(true);
                  }}
                >
                  Edit assignment
                </button>
                <button
                  className="btn btn-ghost min-h-11"
                  disabled={busy}
                  onClick={() => setDeleting({ collection: 'assignments', id: a.id })}
                >
                  Remove assignment
                </button>
              </article>
            ))}
        </section>
        {deleting && (
          <div
            role="group"
            aria-label="Remove preparation confirmation"
            className="rounded-2xl border border-base-300 p-4"
          >
            <p>Remove this preparation record? Linked notes will be kept.</p>
            <button className="btn btn-error min-h-11" disabled={busy} onClick={remove}>
              Remove record
            </button>
            <button className="btn min-h-11" onClick={() => setDeleting(null)}>
              Keep record
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
