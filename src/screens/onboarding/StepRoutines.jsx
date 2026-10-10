import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Sun, BookOpen, CalendarDays, Heart, NotebookPen, Users } from 'lucide-react';
import { ROUTINE_IDS } from '../../domain/routines.js';
import { scheduleOn, withScheduleChange } from '../../domain/schedule.js';
import { labelFor } from '../../domain/store.js';
import { Toggle } from './controls.jsx';

const MAX_LABEL = 30;
const DETAILS = {
  dailyText: [Sun, 'A small daily moment to read and reflect.', 'amber'],
  bibleReading: [BookOpen, 'Keep your place and record the chapters you read.', 'teal'],
  meetingPrep: [CalendarDays, 'A preparation check-in before your meeting days.', 'ocean'],
  familyWorship: [Heart, 'Make time together part of your weekly rhythm.', 'rose'],
  personalStudy: [NotebookPen, 'Keep space for questions and personal study.', 'lavender'],
  ministry: [Users, 'Record your monthly participation and Bible studies.', 'rust'],
};

/** New store with `id`'s custom label set, or removed when `text` is blank. */
function withLabel(store, id, text) {
  const labels = { ...store.labels };
  if (text.trim() === '') delete labels[id];
  else labels[id] = text.slice(0, MAX_LABEL);
  return { ...store, labels };
}

/**
 * Step 2 / Settings → Routines: a switch per routine, a pencil to rename it,
 * and the optional personal-study topic.
 * @param {{store: object, change: (fn: (s: object) => object) => void, today: string}} props
 */
export default function StepRoutines({ store, change, today }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(null);
  const { enabled } = scheduleOn(store, today);

  const setEnabled = (id, on) =>
    change((s) => withScheduleChange(s, today, { enabled: { [id]: on } }));
  const setLabel = (id, text) => change((s) => withLabel(s, id, text));

  return (
    <div className="space-y-3">
      <p className="text-base-content/80">{t('fd.onboarding.routines.body')}</p>
      <p aria-live="polite" className="text-sm font-medium">
        {ROUTINE_IDS.filter((id) => enabled[id]).length} of 6 routines selected. You can change
        these in Settings later.
      </p>
      <ul className="space-y-3">
        {ROUTINE_IDS.map((id) => {
          const label = labelFor(store, id, t);
          const fallback = t('fd.routine.' + id);
          const [Icon, hint, tone] = DETAILS[id];
          return (
            <li
              key={id}
              data-tone={tone}
              className="fd-screen-intro rounded-2xl px-3 py-2 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <Toggle
                    label={label}
                    checked={enabled[id]}
                    onChange={(on) => setEnabled(id, on)}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-circle btn-ghost min-h-11 min-w-11"
                  aria-label={t('fd.onboarding.routines.rename', { label: fallback })}
                  aria-expanded={editing === id}
                  onClick={() => setEditing(editing === id ? null : id)}
                >
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
              <p className="pb-2 text-sm text-base-content/70">{hint}</p>
              {editing === id && (
                <div className="flex items-center gap-2 pb-2">
                  <input
                    type="text"
                    className="input input-bordered min-h-11 min-w-0 flex-1"
                    aria-label={t('fd.onboarding.routines.nameFor', { label: fallback })}
                    placeholder={fallback}
                    maxLength={MAX_LABEL}
                    value={store.labels[id] ?? ''}
                    onChange={(e) => setLabel(id, e.target.value)}
                    onBlur={(e) => setLabel(id, e.target.value.trim())}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost min-h-11"
                    aria-label={t('fd.onboarding.routines.resetLabel', { label: fallback })}
                    onClick={() => setLabel(id, '')}
                  >
                    {t('fd.onboarding.routines.reset')}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
