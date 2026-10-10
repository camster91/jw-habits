import { useState } from 'react';
import { BookOpen, CalendarDays, Check, Heart, Sparkles, Sun, ExternalLink } from 'lucide-react';
import { useOrganiser } from '../../data/useOrganiser.js';
import { useStore } from '../../data/useStore.js';
import { newId } from '../../domain/ids.js';
import { togglePersonalCheckIn } from '../../domain/organiser.js';
import { weekStart, addDays } from '../../domain/day.js';
import { whatsNewPageUrl } from '../../domain/whatsNew.js';
import { openLink } from '../../native/openLink.js';
import Sheet from '../plans/Sheet.jsx';
const icons = {
  sun: Sun,
  book: BookOpen,
  sparkles: Sparkles,
  heart: Heart,
  calendar: CalendarDays,
};
export default function PersonalRoutines() {
  const context = useOrganiser(),
    { today } = useStore();
  const [baseline, setBaseline] = useState('');
  const [draft, setDraft] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [discard, setDiscard] = useState(false);
  if (!context) return null;
  const { organiser, save, ready } = context;
  const start = (official = false) => {
    setError('');
    setDiscard(false);
    const next = {
      id: newId(),
      title: official ? "Explore what's new" : '',
      cadence: 'weekly',
      icon: official ? 'sparkles' : 'heart',
      url: official ? whatsNewPageUrl('en') : null,
      archivedAt: null,
    };
    setBaseline(JSON.stringify(next));
    setDraft(next);
  };
  const close = () => {
    if (busy) return;
    if (discard) {
      setDiscard(false);
      return;
    }
    if (JSON.stringify(draft) !== baseline) setDiscard(true);
    else setDraft(null);
  };
  const persist = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await save((o) => ({
        ...o,
        personalRoutines: [...o.personalRoutines.filter((r) => r.id !== draft.id), draft],
      }));
      setDraft(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (r) => {
    try {
      await save((o) => togglePersonalCheckIn(o, r.id, today));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  };
  const archive = async (r) => {
    try {
      await save((o) => ({
        ...o,
        personalRoutines: o.personalRoutines.map((v) =>
          v.id === r.id ? { ...v, archivedAt: new Date().toISOString() } : v
        ),
      }));
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <section aria-label="Personal routines" className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex-1 text-lg font-semibold">Your own routines</h2>
        <button disabled={!ready} className="btn btn-ghost min-h-11" onClick={() => start()}>
          Add routine
        </button>
      </div>
      <p role="alert" className="text-error">
        {error}
      </p>
      <ul>
        {organiser.personalRoutines
          .filter((r) => !r.archivedAt)
          .map((r) => {
            const Icon = icons[r.icon],
              done = organiser.routineCheckIns.some((c) => c.routineId === r.id && c.day === today),
              weekly = organiser.routineCheckIns.filter(
                (c) =>
                  c.routineId === r.id &&
                  c.day >= weekStart(today) &&
                  c.day <= addDays(weekStart(today), 6)
              ).length;
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-2 border-b border-base-content/10 py-3"
              >
                <button
                  aria-label={`${done ? 'Undo' : 'Record'} ${r.title}`}
                  aria-pressed={done}
                  className="btn btn-circle btn-outline min-h-11 min-w-11"
                  onClick={() => toggle(r)}
                >
                  {done ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <span className="block break-words font-medium">{r.title}</span>
                  <span className="block text-sm text-base-content/70">
                    {r.cadence === 'daily' ? 'Daily' : `${weekly} recorded this week`}
                  </span>
                </div>
                {r.url && (
                  <button
                    aria-label={`Open reference for ${r.title}`}
                    className="btn btn-ghost btn-circle min-h-11"
                    onClick={async () => {
                      await openLink(r.url);
                    }}
                  >
                    <ExternalLink className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-sm min-h-11"
                  onClick={() => {
                    setBaseline(JSON.stringify(r));
                    setDraft(r);
                  }}
                >
                  Edit routine
                </button>
                <button className="btn btn-ghost btn-sm min-h-11" onClick={() => archive(r)}>
                  Archive routine
                </button>
              </li>
            );
          })}
      </ul>
      {!organiser.personalRoutines.some(
        (r) => r.url === whatsNewPageUrl('en') && !r.archivedAt
      ) && (
        <button
          disabled={!ready}
          className="btn btn-outline min-h-11 w-full"
          onClick={() => start(true)}
        >
          Track exploring What's New
        </button>
      )}
      <p className="text-sm text-base-content/70">
        References open separately. Only your check-in records activity; the app does not detect new
        website content.
      </p>
      {organiser.personalRoutines.some((r) => r.archivedAt) && (
        <details>
          <summary className="min-h-11 cursor-pointer py-2">Archived routines</summary>
          {organiser.personalRoutines
            .filter((r) => r.archivedAt)
            .map((r) => (
              <button
                key={r.id}
                className="btn btn-ghost min-h-11"
                onClick={async () => {
                  try {
                    await save((o) => ({
                      ...o,
                      personalRoutines: o.personalRoutines.map((v) =>
                        v.id === r.id ? { ...v, archivedAt: null } : v
                      ),
                    }));
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                Restore {r.title}
              </button>
            ))}
        </details>
      )}
      {draft && (
        <Sheet title={discard ? 'Unsaved changes' : 'Add a personal routine'} onClose={close}>
          {discard ? (
            <div className="space-y-3">
              <p>Discard this unsaved routine?</p>
              <button className="btn btn-primary min-h-11" onClick={() => setDiscard(false)}>
                Keep editing
              </button>
              <button className="btn min-h-11" onClick={() => setDraft(null)}>
                Discard changes
              </button>
            </div>
          ) : (
            <form onSubmit={persist} className="space-y-3">
              <fieldset disabled={busy} className="contents">
                <label className="block">
                  Routine title
                  <input
                    required
                    maxLength={120}
                    className="input min-h-11 w-full"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  />
                </label>
                <label className="block">
                  Cadence
                  <select
                    className="select min-h-11 w-full"
                    value={draft.cadence}
                    onChange={(e) => setDraft({ ...draft, cadence: e.target.value })}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly, at my pace</option>
                  </select>
                </label>
                <label className="block">
                  Icon
                  <select
                    className="select min-h-11 w-full"
                    value={draft.icon}
                    onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                  >
                    {Object.keys(icons).map((i) => (
                      <option key={i}>{i}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  Reference link (optional)
                  <input
                    type="url"
                    maxLength={2000}
                    className="input min-h-11 w-full"
                    value={draft.url ?? ''}
                    onChange={(e) => setDraft({ ...draft, url: e.target.value || null })}
                  />
                </label>
                <p role="alert" className="text-error">
                  {error}
                </p>
                <button disabled={busy} className="btn btn-primary min-h-11">
                  Save routine
                </button>
              </fieldset>
            </form>
          )}
        </Sheet>
      )}
    </section>
  );
}
