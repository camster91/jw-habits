import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { scheduleOn, withScheduleChange } from '../../domain/schedule.js';
import { SelectField, Toggle } from './controls.jsx';

/** Weekdays in display order, Monday first (0 is Sunday). */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

/** 4 October 2026 is a Sunday, so day `d` of that week is weekday `d`. */
const dayName = (d, language, weekday) =>
  new Intl.DateTimeFormat(language, { weekday }).format(new Date(2026, 9, 4 + d, 12));

/** Whole hours, kept as typed text so the field can be cleared while editing. */
function HoursGoal({ value, onChange }) {
  const { t } = useTranslation();
  const id = useId();
  const [text, setText] = useState(String(value));
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <label htmlFor={id}>{t('fd.onboarding.week.hoursGoal')}</label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        className="input input-bordered min-h-11 w-24"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== '' && Number.isInteger(n) && n >= 0) onChange(n);
        }}
      />
    </div>
  );
}

/**
 * Step 3 / Settings → Your week: meeting days, family worship day, and
 * pioneer with a monthly hours goal.
 */
export default function StepWeek({ store, change, today }) {
  const { t, i18n } = useTranslation();
  const groupId = useId();
  const { meetingDays, familyWorshipDay } = scheduleOn(store, today);
  const language = i18n.language;

  const toggleMeeting = (d) =>
    change((s) => {
      const days = scheduleOn(s, today).meetingDays;
      const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
      return withScheduleChange(s, today, { meetingDays: next.sort((a, b) => a - b) });
    });

  return (
    <div className="space-y-4">
      <div role="group" aria-labelledby={groupId} className="space-y-1">
        <p id={groupId} className="text-sm font-medium">
          {t('fd.onboarding.week.meetingDays')}
        </p>
        <div className="flex flex-wrap gap-1">
          {WEEK.map((d) => {
            const on = meetingDays.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                aria-label={dayName(d, language, 'long')}
                className={`btn min-h-11 min-w-11 px-2 ${on ? 'border-transparent bg-[var(--fd-accent)] text-white' : 'btn-ghost'}`}
                onClick={() => toggleMeeting(d)}
              >
                <span aria-hidden="true">{dayName(d, language, 'short')}</span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-base-content/70">{t('fd.onboarding.week.meetingHint')}</p>
      </div>

      <SelectField
        label={t('fd.onboarding.week.familyDay')}
        value={String(familyWorshipDay)}
        options={WEEK.map((d) => ({ value: String(d), label: dayName(d, language, 'long') }))}
        onChange={(v) =>
          change((s) => withScheduleChange(s, today, { familyWorshipDay: Number(v) }))
        }
      />

      <Toggle
        label={t('fd.onboarding.week.pioneer')}
        hint={t('fd.onboarding.week.pioneerHint')}
        checked={store.pioneer}
        onChange={(on) => change((s) => ({ ...s, pioneer: on }))}
      />
      {store.pioneer && (
        <HoursGoal
          value={store.hoursGoal}
          onChange={(n) => change((s) => ({ ...s, hoursGoal: n }))}
        />
      )}
    </div>
  );
}
