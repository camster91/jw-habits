import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useStore } from '../../data/useStore.js';
import { ROUTINE_IDS } from '../../domain/routines.js';
import { scheduleOn } from '../../domain/schedule.js';
import { labelFor } from '../../domain/store.js';
import { Toggle } from '../../screens/onboarding/controls.jsx';
import { isNative } from '../../utils/native.js';

/**
 * Settings -> Reminders: a master switch (`reminders.enabled`) and, while it is
 * on, one switch per enabled routine (a routine switched off is kept in
 * `reminders.off`). On a phone, turning a switch on is the user-initiated
 * moment to ask for notification permission; the store change is written
 * whatever the answer, and a quiet hint shows while reminders are on but
 * permission is not granted. `syncReminders` itself never asks.
 */
export default function RemindersSection() {
  const { t } = useTranslation();
  const { store, update, today } = useStore();
  const { enabled, off } = store.reminders;
  const routines = ROUTINE_IDS.filter((id) => scheduleOn(store, today).enabled[id]);

  // null = unknown (web, not yet read, or the plugin failed).
  const [permission, setPermission] = useState(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const remember = useCallback((result) => {
    if (mounted.current) setPermission(result.display);
  }, []);

  useEffect(() => {
    if (!isNative) return;
    Promise.resolve()
      .then(() => LocalNotifications.checkPermissions())
      .then((result) => result && remember(result))
      .catch((error) => console.warn('Could not read notification permission:', error));
  }, [remember]);

  const ensurePermission = async () => {
    if (!isNative) return;
    try {
      let result = await LocalNotifications.checkPermissions();
      if (result.display !== 'granted') {
        result = await LocalNotifications.requestPermissions();
      }
      remember(result);
    } catch (error) {
      console.warn('Notification permission was not obtained:', error);
    }
  };

  const setEnabled = (on) => {
    update((s) => ({ ...s, reminders: { ...s.reminders, enabled: on } }));
    if (on) void ensurePermission();
  };

  const setRoutine = (id, on) => {
    update((s) => {
      const rest = s.reminders.off.filter((x) => x !== id);
      return { ...s, reminders: { ...s.reminders, off: on ? rest : [...rest, id] } };
    });
    if (on) void ensurePermission();
  };

  const showHint = isNative && enabled && permission !== null && permission !== 'granted';

  return (
    <div className="space-y-2">
      <Toggle
        label={t('fd.settings.reminders.toggle')}
        hint={t('fd.settings.reminders.hint')}
        checked={enabled}
        onChange={setEnabled}
      />
      {showHint && (
        <p role="status" className="text-sm text-base-content/70">
          {t('fd.settings.reminders.permissionOff')}
        </p>
      )}
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
