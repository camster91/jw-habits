import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Settings as SettingsIcon } from 'lucide-react';
import { loadSettings, saveSettings, DEFAULTS } from '../utils/settingsStore';

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
      <div
        className="ios-segmented"
        role="radiogroup"
        aria-label={ariaLabel}
      >
        {DAYS.map((d) => {
          const isActive = d.value === value;
          return (
            <button
              key={d.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(d.value)}
              className={
                'ios-segmented__btn ' + (isActive ? 'ios-segmented__btn--active' : '')
              }
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

/**
 * Settings — inline accordion at the bottom of the home page.
 * No top-bar chrome, no drawer, no new route. Lives where the
 * footer disclaimer lives — at the bottom, not the top. Saves
 * changes to localStorage immediately on click.
 */
export default function SettingsAccordion() {
  const { t } = useTranslation();
  // Settings are loaded once on mount. We don't need a state
  // setter on the parent — the accordion is self-contained.
  const [settings, setSettings] = useState(() => loadSettings());
  const [open, setOpen] = useState(false);

  // Save on every change. Cheap (one JSON.stringify) and
  // ensures the user's choice is never lost on tab close.
  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  // If storage changes from another tab, sync. Matches the
  // existing pattern for jw-daily-habits-state.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'jw-user-settings') setSettings(loadSettings());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

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
        <div
          id="settings-panel"
          className="ios-settings-panel mt-2"
        >
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
        </div>
      )}
    </section>
  );
}