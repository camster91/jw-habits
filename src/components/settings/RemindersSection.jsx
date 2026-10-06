import { useTranslation } from 'react-i18next';
import { useStore } from '../../data/useStore.js';
import { ROUTINE_IDS } from '../../domain/routines.js';
import { scheduleOn } from '../../domain/schedule.js';
import { labelFor } from '../../domain/store.js';
import { Toggle } from '../../screens/onboarding/controls.jsx';

/**
 * Settings → Reminders: a master switch (`reminders.enabled`) and, while it is
 * on, one switch per enabled routine (a routine switched off is kept in
 * `reminders.off`). Like the rest of Settings, it never asks for notification
 * permission; that is onboarding's job.
 */
export default function RemindersSection() {
  const { t } = useTranslation();
  const { store, update, today } = useStore();
  const { enabled, off } = store.reminders;
  const routines = ROUTINE_IDS.filter((id) => scheduleOn(store, today).enabled[id]);

  const setEnabled = (on) => update((s) => ({ ...s, reminders: { ...s.reminders, enabled: on } }));

  const setRoutine = (id, on) =>
    update((s) => {
      const rest = s.reminders.off.filter((x) => x !== id);
      return { ...s, reminders: { ...s.reminders, off: on ? rest : [...rest, id] } };
    });

  return (
    <div className="space-y-2">
      <Toggle
        label={t('fd.settings.reminders.toggle')}
        hint={t('fd.settings.reminders.hint')}
        checked={enabled}
        onChange={setEnabled}
      />
      {enabled && routines.length > 0 && (
        <fieldset className="space-y-1">
          <legend className="text-sm text-base-content/70">
            {t('fd.settings.reminders.perRoutine')}
          </legend>
          {routines.map((id) => (
            <Toggle
              key={id}
              label={labelFor(store, id, t)}
              checked={!off.includes(id)}
              onChange={(on) => setRoutine(id, on)}
            />
          ))}
        </fieldset>
      )}
    </div>
  );
}
