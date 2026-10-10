import { useOrganiser } from '../data/useOrganiser.js';
import { linkNote } from '../domain/organiser.js';
import { newId } from '../domain/ids.js';
import QuickGuide from '../components/QuickGuide.jsx';
import ScreenIntro from '../components/ScreenIntro.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../data/useWorkspace.js';
import { useStore } from '../data/useStore.js';
import { putNote, searchNotes, searchRelated } from '../domain/workspace.js';
import ItemEditor from '../components/organiser/ItemEditor.jsx';
import { saveBackup } from '../utils/backup.js';
import Sheet from '../components/plans/Sheet.jsx';

function NoteEditor({ note, seed, context, target, onClose }) {
  const organiserContext = useOrganiser();
  const stableId = useRef(note?.id ?? newId());
  const { save } = useWorkspace();
  const { today } = useStore();
  const [title, setTitle] = useState(note?.title ?? seed?.title ?? '');
  const [body, setBody] = useState(note?.body ?? seed?.body ?? '');
  const [tags, setTags] = useState(note?.tags.join(', ') ?? '');
  const [links, setLinks] = useState(note?.links.join('\n') ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const titleRef = useRef(null);
  const keepEditingRef = useRef(null);
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (discard) keepEditingRef.current?.focus();
    else if (wasConfirming.current) titleRef.current?.focus();
    wasConfirming.current = discard;
  }, [discard]);
  const exportDraft = async () => {
    try {
      await saveBackup(
        JSON.stringify({ title, body, tags, links, context: note?.context ?? context }, null, 2),
        'faithful-days-note-draft.json',
        'Unsaved note draft'
      );
    } catch (e) {
      setError(e.message);
    }
  };
  const close = () => {
    if (busy) return;
    if (discard) {
      setDiscard(false);
      return;
    }
    if (
      title !== (note?.title ?? seed?.title ?? '') ||
      body !== (note?.body ?? seed?.body ?? '') ||
      tags !== (note?.tags.join(', ') ?? '') ||
      links !== (note?.links.join('\n') ?? '')
    )
      setDiscard(true);
    else onClose();
  };
  const persist = async (remove = false) => {
    setBusy(true);
    try {
      if (!remove && !title.trim() && !body.trim())
        throw new Error('Add a title or a few words before saving.');
      await save((w) =>
        remove
          ? { ...w, notes: w.notes.filter((n) => n.id !== note.id) }
          : putNote(
              w,
              {
                id: stableId.current,
                title: title.trim() || body.trim().split('\n')[0].slice(0, 120) || 'Untitled note',
                body,
                tags: tags.split(','),
                links: links.split('\n'),
                context: note?.context ?? context,
              },
              today
            )
      );
      if (!remove && target && organiserContext) {
        try {
          await organiserContext.save((o) => linkNote(o, stableId.current, target));
        } catch (e) {
          throw new Error(
            'Your note is saved. Its attachment failed: ' +
              e.message +
              ' Retry Save to attach it; your note will not be duplicated.'
          );
        }
      }
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (discard) {
    return (
      <Sheet title="Unsaved changes" onClose={close}>
        <div role="group" aria-label="Unsaved note" className="space-y-4">
          <p>Discard your unsaved changes?</p>
          <p className="text-sm text-base-content/70">
            Keep editing to return to your draft. Discard changes closes it without saving.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              ref={keepEditingRef}
              type="button"
              className="btn btn-primary min-h-11"
              onClick={() => setDiscard(false)}
            >
              Keep editing
            </button>
            <button type="button" className="btn min-h-11" onClick={onClose}>
              Discard changes
            </button>
          </div>
        </div>
      </Sheet>
    );
  }
  return (
    <Sheet title={note ? 'Edit note' : 'New note'} onClose={close}>
      {target && (
        <p className="rounded-xl bg-base-200 p-3 text-sm">
          Attached to {target.kind}:{' '}
          {organiserContext?.organiser[target.kind === 'task' ? 'tasks' : 'events'].find(
            (i) => i.id === target.id
          )?.title ?? 'Original activity unavailable'}
        </p>
      )}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          persist();
        }}
      >
        <label className="block space-y-1">
          <span>Title</span>
          <input
            ref={titleRef}
            maxLength={120}
            className="input min-h-11 w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span>Your note</span>
          <textarea
            maxLength={8000}
            rows={7}
            className="textarea w-full"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <details>
          <summary className="min-h-11 cursor-pointer py-2 font-medium">
            Tags & reference links (optional)
          </summary>
          <label className="block space-y-1">
            <span>Tags (separate with commas)</span>
            <input
              className="input min-h-11 w-full"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </label>
          <p className="text-sm text-base-content/70">Up to 10 tags, 32 characters each.</p>
          <label className="block space-y-1">
            <span>Links (one per line)</span>
            <textarea
              rows={2}
              className="textarea w-full"
              value={links}
              onChange={(e) => setLinks(e.target.value)}
            />
          </label>
          <p className="text-sm text-base-content/70">
            Up to 5 web links. Add your own references; publication text is not supplied.
          </p>
        </details>
        <p role="alert" className="text-error">
          {error}
        </p>
        <button disabled={busy} className="btn btn-primary min-h-11" type="submit">
          {busy ? 'Saving…' : 'Save note'}
        </button>
        {note && (
          <button
            disabled={busy}
            className="btn btn-ghost min-h-11"
            type="button"
            onClick={() => setDeleting(true)}
          >
            Delete note
          </button>
        )}
      </form>
      {error && (
        <button type="button" className="btn min-h-11" onClick={exportDraft}>
          Export this draft
        </button>
      )}
      {deleting && (
        <div role="group" aria-label="Delete note confirmation">
          <p>Delete this note? This cannot be undone.</p>
          <button disabled={busy} className="btn btn-error min-h-11" onClick={() => persist(true)}>
            Delete permanently
          </button>
          <button className="btn min-h-11" onClick={() => setDeleting(false)}>
            Keep note
          </button>
        </div>
      )}
    </Sheet>
  );
}

function contextLabel(context, store, workspace) {
  if (!context) return null;
  if (context.kind === 'day') return `Recorded on ${context.id}`;
  const item =
    context.kind === 'meeting'
      ? workspace.meetings.find((m) => m.id === context.id)
      : context.kind === 'assignment'
        ? workspace.assignments.find((a) => a.id === context.id)
        : context.kind === 'plan'
          ? store.plans.find((p) => p.id === context.id)
          : store.plans.flatMap((p) => p.steps).find((s) => s.id === context.id);
  return item
    ? `${context.kind}: ${item.title ?? `${item.type} meeting · ${item.date}`}`
    : 'Original context is no longer available. Your note is kept.';
}

export default function Notes() {
  const { workspace, ready, error, rawExport } = useWorkspace();
  const { store, today } = useStore();
  const [params, setParams] = useSearchParams();
  const context =
    ['day', 'plan', 'step', 'meeting', 'assignment'].includes(params.get('context')) &&
    params.get('id')
      ? { kind: params.get('context'), id: params.get('id') }
      : { kind: 'day', id: today };
  const organiserContext = useOrganiser();
  const targetKind = params.get('targetKind'),
    targetId = params.get('targetId');
  const target =
    ['task', 'event'].includes(targetKind) && targetId ? { kind: targetKind, id: targetId } : null;
  const targetItem =
    target &&
    organiserContext?.organiser[target.kind === 'task' ? 'tasks' : 'events'].find(
      (i) => i.id === target.id
    );
  const [editing, setEditing] = useState(
    params.has('new') ? {} : (workspace.notes.find((n) => n.id === params.get('note')) ?? null)
  );
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [taskFromNote, setTaskFromNote] = useState(null);
  const [relationFilter, setRelationFilter] = useState('all');
  const [exportError, setExportError] = useState('');
  const close = () => {
    setEditing(null);
    setParams({});
  };
  const exportOriginal = async () => {
    try {
      const raw = await rawExport();
      await saveBackup(
        raw ?? '{}',
        'faithful-days-workspace-original.json',
        'Original notes and preparation'
      );
    } catch (e) {
      setExportError(e.message);
    }
  };
  const visibleNotes = searchNotes(workspace, query, tag).filter((n) => {
    const relations =
      organiserContext?.organiser.relations.filter(
        (r) => r.source.kind === 'note' && r.source.id === n.id
      ) ?? [];
    return (
      relationFilter === 'all' ||
      (relationFilter === 'unlinked'
        ? relations.length === 0 && (!n.context || n.context.kind === 'day')
        : relations.some((r) => r.target.kind === relationFilter) ||
          n.context?.kind === relationFilter)
    );
  });
  const currentEditing = editing ?? workspace.notes.find((n) => n.id === params.get('note'));
  return (
    <main className="min-h-screen bg-base-200 px-4 pb-24 pt-[max(env(safe-area-inset-top),1rem)]">
      <div className="mx-auto max-w-md space-y-4">
        <ScreenIntro
          title="Notes"
          subtitle="A little home for your ideas."
          art="notes"
          tone="rose"
        />
        <QuickGuide
          title="Keep an idea you can find again"
          steps={[
            {
              title: 'Capture it in your words',
              body: 'Write a question, reflection or takeaway. Notes are private on this device.',
            },
            {
              title: 'Give it a home',
              body: 'Add comma-separated tags and your own reference links. Search can find matching notes and plan steps.',
            },
            {
              title: 'Keep a copy',
              body: 'Use Settings → Backup before changing devices. Saving a note does not check off a routine.',
            },
          ]}
        />
        <p>
          Your thoughts, questions and references. Notes stay on this device and do not mark a
          routine complete.
        </p>
        <p role="alert" className="text-error">
          {error || exportError}
        </p>
        {!ready && (
          <button className="btn min-h-11" onClick={exportOriginal}>
            Export original notes and preparation
          </button>
        )}
        <button
          disabled={!ready}
          className="btn btn-primary min-h-11"
          onClick={() => setEditing({})}
        >
          New note
        </button>
        <div className="space-y-2">
          <p className="text-sm font-semibold">Need a starting point?</p>
          <div className="flex flex-wrap gap-2">
            {[
              {
                label: 'A question',
                title: 'A question to explore',
                body: 'My question:\n\nReferences to revisit:\n\nWhat I learn:',
              },
              {
                label: 'A takeaway',
                title: 'Something to remember',
                body: 'What stood out:\n\nWhy it matters to me:\n\nOne thing to try:',
              },
              {
                label: 'Family idea',
                title: 'An idea for family worship',
                body: 'Something we could discuss:\n\nQuestions to ask:\n\nAn activity to try:',
              },
            ].map((seed) => (
              <button
                key={seed.label}
                disabled={!ready}
                type="button"
                className="btn btn-outline btn-sm min-h-11"
                onClick={() => setEditing({ seed })}
              >
                {seed.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span>Search notes and plans</span>
          <input
            type="search"
            className="input min-h-11 w-full"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="block">
          <span id="notes-tag-label">Filter by tag</span>
          <select
            className="select min-h-11 w-full"
            aria-labelledby="notes-tag-label"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          >
            <option value="">All tags</option>
            {[...new Set(workspace.notes.flatMap((n) => n.tags))].sort().map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block">
          Related activity
          <select
            className="select min-h-11 w-full"
            value={relationFilter}
            onChange={(e) => setRelationFilter(e.target.value)}
          >
            <option value="all">All notes</option>
            <option value="unlinked">Unlinked notes</option>
            <option value="task">Tasks</option>
            <option value="event">Events</option>
            <option value="meeting">Meetings</option>
            <option value="plan">Study and family plans</option>
          </select>
        </label>
        <ul className="space-y-3">
          {visibleNotes.map((n) => (
            <li key={n.id} className="space-y-2 rounded-2xl bg-base-100 p-4 break-words">
              <button
                className="min-h-11 text-left text-lg font-semibold underline"
                onClick={() => setEditing(n)}
              >
                {n.title}
              </button>
              <p className="whitespace-pre-wrap">{n.body}</p>
              <p className="text-sm text-base-content/70">{n.tags.join(' · ')}</p>
              <p className="text-sm text-base-content/70">
                {contextLabel(n.context, store, workspace)}
              </p>
              {organiserContext?.organiser.relations
                .filter((r) => r.source.kind === 'note' && r.source.id === n.id)
                .map((r) => {
                  const item =
                    ['event', 'task'].includes(r.target.kind) &&
                    organiserContext.organiser[r.target.kind === 'task' ? 'tasks' : 'events'].find(
                      (i) => i.id === r.target.id
                    );
                  return (
                    <Link key={r.id} to="/plans" className="block min-h-11 py-2 text-sm underline">
                      {item
                        ? 'Linked ' + r.target.kind + ': ' + item.title
                        : 'Original activity is unavailable; your note is kept.'}
                    </Link>
                  );
                })}
              {organiserContext && (
                <button
                  disabled={!organiserContext.ready}
                  className="btn btn-ghost min-h-11"
                  onClick={() => setTaskFromNote(n)}
                >
                  Create task from note
                </button>
              )}
              {n.links.map((url) => (
                <a
                  key={url}
                  className="block min-h-11 break-all underline"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {url}
                </a>
              ))}
            </li>
          ))}
        </ul>
        {!tag && searchRelated(workspace, store, query).length > 0 && (
          <section aria-labelledby="related-results">
            <h2 id="related-results" className="text-xl font-semibold">
              Plans and preparation
            </h2>
            <ul>
              {searchRelated(workspace, store, query).map((r) => (
                <li key={r.key}>
                  <Link
                    className="block min-h-11 rounded-2xl bg-base-100 p-3 my-2 break-words underline"
                    to={r.url}
                  >
                    {r.title} · {r.kind}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {ready && visibleNotes.length === 0 && (
          <p>
            {workspace.notes.length
              ? 'No notes match. Try another word or tag.'
              : 'Keep a question, a scripture reference or an idea you want to revisit.'}
          </p>
        )}
        <Link className="inline-flex min-h-11 items-center underline" to="/plans">
          Go to Plan
        </Link>
      </div>
      {taskFromNote && (
        <ItemEditor
          kind="task"
          date={null}
          target={{ kind: 'note', id: taskFromNote.id }}
          initialTitle={taskFromNote.title}
          onClose={() => setTaskFromNote(null)}
        />
      )}
      {currentEditing && (
        <NoteEditor
          note={currentEditing.id ? currentEditing : null}
          seed={currentEditing.seed}
          target={targetItem ? target : null}
          context={context}
          onClose={close}
        />
      )}
    </main>
  );
}
