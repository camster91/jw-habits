import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Settings as SettingsIcon, Bell } from 'lucide-react';
import { loadSettings, saveSettings, DEFAULTS } from '../utils/settingsStore';
import { resolveUserLink } from '../utils/userLinks';
import {
  getPermissionState,
  requestNotificationPermission,
  startReminder,
  cancelReminder,
  showReminderNotification,
  NOTIFICATION_PERMISSION,
} from '../utils/notificationScheduler';

const DAYS = [
  { value: 0, key: 'daySun' },
  { value: 1, key: 'dayMon' },
  { value: 2, key: 'dayTue' },
  { value: 3, key: 'dayWed' },
  { value: 4, key: 'dayThu' },
  { value: 5, key: 'dayFri' },
  { value: 6, key: 'daySat' },
];

// Small iOS-style segmented control for picking a day.
// `value` is the currently-selected day (0..6); `onChange`
// fires when the user picks a new one.
function DayPicker({ value, onChange, label, ariaLabel }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="ios-segmented" role="radiogroup" aria-label={ariaLabel}>
        {DAYS.map((d) => {
          const isActive = d.value === value;
          return (
            <button
              key={d.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(d.value)}
              className={'ios-segmented__btn ' + (isActive ? 'ios-segmented__btn--active' : '')}
            >
              {t(`settings.${d.key}`)}
            </button>
          );
        })}
      </div>
      <div className="sr-only">{label}</div>
    </div>
  );
}

// Two-segment time picker (HH + MM). Lightweight — uses two
// <input type="number"> fields with inputmode="numeric" for
// mobile. No spinners (hide via CSS). Validates on change.
function TimePicker({ value, onChange, ariaLabel, id }) {
  // value is "HH:MM"; split into parts, default to 09:00.
  const [hh, mm] = (value || '09:00').split(':');
  const set = (newHh, newMm) => {
    const p = (n) => String(n).padStart(2, '0');
    onChange(`${p(newHh)}:${p(newMm)}`);
  };
  return (
    <div className="ios-timepicker" role="group" aria-label={ariaLabel}>
      <input
        id={`${id}-hh`}
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        min="0"
        max="23"
        value={hh}
        onChange={(e) => {
          const n = Math.max(0, Math.min(23, parseInt(e.target.value || '0', 10)));
          set(n, mm);
        }}
        aria-label={`${ariaLabel} hours`}
      />
      <span className="ios-timepicker__sep" aria-hidden="true">
        :
      </span>
      <input
        id={`${id}-mm`}
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        min="0"
        max="59"
        value={mm}
        onChange={(e) => {
          const n = Math.max(0, Math.min(59, parseInt(e.target.value || '0', 10)));
          set(hh, n);
        }}
        aria-label={`${ariaLabel} minutes`}
      />
    </div>
  );
}

/**
 * Settings — inline accordion at the bottom of the home page.
 * No top-bar chrome, no drawer, no new route. Saves changes to
 * localStorage immediately on click.
 */
export default function SettingsAccordion() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(() => loadSettings());
  const [open, setOpen] = useState(false);

  // Permission state. If the browser doesn't support the
  // Notification API at all, the toggle is hidden entirely.
  const permSupported = typeof window !== 'undefined' && 'Notification' in window;
  const [perm, setPerm] = useState(() =>
    permSupported ? getPermissionState() : NOTIFICATION_PERMISSION.UNSUPPORTED
  );
  const [testFired, setTestFired] = useState(false);
  const testTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (testTimerRef.current != null) clearTimeout(testTimerRef.current);
    };
  }, []);

  // True when reminders are effectively enabled (toggle + valid
  // reminderTime + permission granted).
  const remindersOn = !!settings.reminderTime && perm === NOTIFICATION_PERMISSION.GRANTED;

  // True when a link slot holds text that is not a usable http(s) URL, so
  // the settings panel can say the row will render as informational.
  const rawLinks = settings.links || {};
  const linksInvalid =
    (!!rawLinks.primary?.trim() && !resolveUserLink(rawLinks.primary)) ||
    (!!rawLinks.secondary?.trim() && !resolveUserLink(rawLinks.secondary));

  // Whenever reminders are on/off or their time changes, re-sync the
  // scheduler. Cancel first to clear any stale timer.
  useEffect(() => {
    cancelReminder();
    if (remindersOn) {
      startReminder();
    }
  }, [remindersOn, settings.reminderTime, settings.quietHours?.start, settings.quietHours?.end]);

  // If storage changes from another tab, sync. Matches the
  // existing pattern for jw-daily-habits-state.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'jw-user-settings') setSettings(loadSettings());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Update + persist. Same shape as Wave 2 settings — no
  // refactor, just adds fields.
  //
  // We dispatch a synthetic 'storage' event after saving so
  // sibling components (Home) re-read settings. Real cross-tab
  // events fire automatically when another tab writes; same-tab
  // writes do NOT fire the event, so we dispatch manually.
  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next); // Manual event so listeners in this same tab (Home page)
    // re-read settings and update their derived state. Other
    // tabs get the same event via the browser automatically.
    try {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'jw-user-settings',
          newValue: JSON.stringify(next),
        })
      );
    } catch {
      // StorageEvent constructor may not exist in very old browsers;
      // fall through — the user still has a working local state.
    }
  };

  // Toggle handler. Off → request permission, then turn on.
  // On → turn off + cancel schedulers.
  const handleToggleReminders = async (next) => {
    try {
      if (next) {
        if (
          perm === NOTIFICATION_PERMISSION.DEFAULT ||
          perm === NOTIFICATION_PERMISSION.UNSUPPORTED
        ) {
          const result = await requestNotificationPermission();
          setPerm(result);
          if (result !== NOTIFICATION_PERMISSION.GRANTED) {
            // User dismissed or denied — don't enable the toggle.
            return;
          }
        }
        update({ reminderTime: settings.reminderTime || '21:00' });
      } else {
        cancelReminder();
        update({ reminderTime: null });
      }
    } catch {
      // Permission prompt / storage failures — leave UI unchanged.
    }
  };

  const handleTestNotification = () => {
    setTestFired(true);
    void showReminderNotification({
      title: 'Habit Tracker',
      body: 'Time to check your daily habits.',
    }).catch(() => {});
    if (testTimerRef.current != null) clearTimeout(testTimerRef.current);
    testTimerRef.current = setTimeout(() => setTestFired(false), 2000);
  };

  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="ios-settings-toggle"
        aria-expanded={open}
        aria-controls="settings-panel"
      >
        <SettingsIcon className="w-4 h-4 text-base-content/60" aria-hidden="true" />
        <span className="text-sm text-base-content/80">
          {open ? t('settings.collapse') : t('settings.expand')}
        </span>
        <ChevronDown
          className={
            'w-4 h-4 text-base-content/60 transition-transform ml-auto ' +
            (open ? 'rotate-180' : '')
          }
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id="settings-panel" className="ios-settings-panel mt-2">
          {/* ── Meeting days (Wave 2) ──────────────────────── */}
          <h2 className="ios-section-h">{t('settings.meetingDays')}</h2>

          <div className="ios-row flex-col items-stretch">
            <div className="flex items-center gap-3 mb-2">
              <div className="ios-icon green shrink-0" aria-hidden="true">
                <span className="w-4 h-4 block" />
              </div>
              <div className="body min-w-0 flex-1">
                <div className="title">{t('settings.midweek')}</div>
                <div className="sub">{t('settings.midweekHelp')}</div>
              </div>
            </div>
            <DayPicker
              value={settings.midweekDay}
              onChange={(d) => update({ midweekDay: d })}
              label={t('settings.midweek')}
              ariaLabel={t('settings.midweek')}
            />
          </div>

          <div className="ios-row flex-col items-stretch">
            <div className="flex items-center gap-3 mb-2">
              <div className="ios-icon teal shrink-0" aria-hidden="true">
                <span className="w-4 h-4 block" />
              </div>
              <div className="body min-w-0 flex-1">
                <div className="title">{t('settings.weekend')}</div>
                <div className="sub">{t('settings.weekendHelp')}</div>
              </div>
            </div>
            <DayPicker
              value={settings.weekendDay}
              onChange={(d) => update({ weekendDay: d })}
              label={t('settings.weekend')}
              ariaLabel={t('settings.weekend')}
            />
          </div>

          {/* ── Daily reminders (Wave 3) ──────────────────── */}
          {permSupported && (
            <>
              <h2 className="ios-section-h mt-6">{t('settings.reminders')}</h2>

              <div className="ios-row flex-col items-stretch">
                <div className="flex items-center gap-3 mb-2 w-full">
                  <div className="ios-icon blue shrink-0" aria-hidden="true">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="body min-w-0 flex-1">
                    <div className="title">{t('settings.dailyReminder')}</div>
                    <div className="sub">{t('settings.reminderHelp')}</div>
                  </div>
                  <label className="ios-switch" aria-label={t('settings.dailyReminder')}>
                    <input
                      type="checkbox"
                      role="switch"
                      aria-checked={remindersOn}
                      checked={remindersOn}
                      disabled={perm === NOTIFICATION_PERMISSION.DENIED}
                      onChange={(e) => handleToggleReminders(e.target.checked)}
                    />
                    <span className="ios-switch__track" aria-hidden="true">
                      <span className="ios-switch__thumb" />
                    </span>
                  </label>
                </div>

                {perm === NOTIFICATION_PERMISSION.DENIED && (
                  <div className="text-xs text-base-content/60 mt-2 px-1">
                    {t('settings.permissionDenied')}
                  </div>
                )}

                {remindersOn && (
                  <>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="text-sm text-base-content/80 min-w-[80px]">
                        {t('settings.reminderTimeLabel')}
                      </div>
                      <TimePicker
                        id="reminder-time"
                        ariaLabel={t('settings.reminderTimeLabel')}
                        value={settings.reminderTime || '21:00'}
                        onChange={(v) => update({ reminderTime: v })}
                      />
                      <button
                        type="button"
                        className="ios-btn-secondary ml-auto"
                        onClick={handleTestNotification}
                        aria-label={t('settings.testNotification')}
                      >
                        {t('settings.testNotification')}
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mt-3">
                      <label className="ios-switch" aria-label={t('settings.quietHoursLabel')}>
                        <input
                          type="checkbox"
                          role="switch"
                          aria-checked={!!settings.quietHours}
                          checked={!!settings.quietHours}
                          onChange={(e) =>
                            update({
                              quietHours: e.target.checked
                                ? { start: '22:00', end: '07:00' }
                                : null,
                            })
                          }
                        />
                        <span className="ios-switch__track" aria-hidden="true">
                          <span className="ios-switch__thumb" />
                        </span>
                      </label>
                      <div className="text-sm text-base-content/80">
                        {t('settings.quietHoursLabel')}
                      </div>
                    </div>

                    {settings.quietHours && (
                      <div className="flex items-center gap-3 mt-2 ml-11">
                        <TimePicker
                          id="quiet-start"
                          ariaLabel={t('settings.quietStartLabel')}
                          value={settings.quietHours.start}
                          onChange={(v) =>
                            update({ quietHours: { ...settings.quietHours, start: v } })
                          }
                        />
                        <span className="text-base-content/50" aria-hidden="true">
                          →
                        </span>
                        <TimePicker
                          id="quiet-end"
                          ariaLabel={t('settings.quietEndLabel')}
                          value={settings.quietHours.end}
                          onChange={(v) =>
                            update({ quietHours: { ...settings.quietHours, end: v } })
                          }
                        />
                      </div>
                    )}
                  </>
                )}
                {testFired && (
                  <div className="text-xs text-success mt-2 px-1">{t('settings.testFired')}</div>
                )}
              </div>
            </>
          )}

          {/* ── Destination links ─────────────────────────── */}
          <h2 className="ios-section-h mt-6">{t('settings.links')}</h2>
          <div className="ios-row flex-col items-stretch">
            <div className="sub mb-2 px-1">{t('settings.linksHelp')}</div>
            <label className="text-sm text-base-content/80 mb-1" htmlFor="link-primary">
              {t('settings.linkPrimary')}
            </label>
            <input
              id="link-primary"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              className="ios-text-input"
              placeholder="https://"
              value={settings.links?.primary || ''}
              onChange={(e) =>
                update({ links: { ...(settings.links || {}), primary: e.target.value } })
              }
            />
            <label className="text-sm text-base-content/80 mb-1 mt-3" htmlFor="link-secondary">
              {t('settings.linkSecondary')}
            </label>
            <input
              id="link-secondary"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              className="ios-text-input"
              placeholder="https://"
              value={settings.links?.secondary || ''}
              onChange={(e) =>
                update({ links: { ...(settings.links || {}), secondary: e.target.value } })
              }
            />
            {linksInvalid && (
              <div className="text-xs text-base-content/60 mt-2 px-1">
                {t('settings.linkInvalid')}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
