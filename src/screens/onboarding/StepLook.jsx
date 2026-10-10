import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { labelFor } from '../../domain/store.js';
import { scheduleOn } from '../../domain/schedule.js';
import { ROUTINE_IDS } from '../../domain/routines.js';
import { BOOKS } from '../../domain/bible.js';
import { ACCENTS } from '../../theme/theme.js';
import { Choice } from './controls.jsx';

function resolvedTheme(theme) {
  if (theme !== 'system') return theme;
  const dark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return dark ? 'dark' : 'light';
}

/** A decorative miniature of Today in the chosen accent and theme. */
function Preview({ store }) {
  const { t } = useTranslation();
  return (
    <div
      data-testid="look-preview"
      aria-hidden="true"
      data-theme={resolvedTheme(store.theme)}
      style={{ '--fd-accent': ACCENTS[store.accent] }}
      className="space-y-2 rounded-2xl bg-base-200 p-3 text-base-content"
    >
      <p className="text-lg font-bold">{t('fd.today.title')}</p>
      {['dailyText', 'bibleReading'].map((id, i) => (
        <div key={id} className="flex items-center gap-2 rounded-xl bg-base-100 p-2">
          <span
            className={`grid h-6 w-6 place-items-center rounded-full border-2 border-[var(--fd-accent)] ${i === 0 ? 'bg-[var(--fd-accent)] text-white' : ''}`}
          >
            {i === 0 && <Check className="h-4 w-4" />}
          </span>
          <span className="text-sm">{labelFor(store, id, t)}</span>
        </div>
      ))}
    </div>
  );
}

/** Step 6 / Settings → Look: accent and theme, with an optional live preview. */
export default function StepLook({ store, change, today, preview = false, review = false }) {
  const { t } = useTranslation();
  const name = useId();
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-1 text-sm font-medium">{t('fd.onboarding.look.accent')}</legend>
        <div className="flex flex-wrap gap-1">
          {ACCENTS.map((color, i) => (
            <label key={color} className="grid min-h-11 min-w-11 cursor-pointer place-items-center">
              <input
                type="radio"
                name={name}
                className="peer sr-only"
                aria-label={t('fd.onboarding.look.accents.' + i)}
                checked={store.accent === i}
                onChange={() => change((s) => ({ ...s, accent: i }))}
              />
              <span
                aria-hidden="true"
                className="h-9 w-9 rounded-full ring-offset-2 ring-offset-base-100 peer-checked:ring-2 peer-checked:ring-base-content peer-focus-visible:outline peer-focus-visible:outline-2"
                style={{ background: color }}
              />
            </label>
          ))}
        </div>
      </fieldset>
      <Choice
        legend={t('fd.onboarding.look.theme')}
        value={store.theme}
        options={['system', 'light', 'dark'].map((v) => ({
          value: v,
          label: t('fd.onboarding.look.themes.' + v),
        }))}
        onChange={(theme) => change((s) => ({ ...s, theme }))}
      />
      {preview && (
        <>
          <p className="text-sm text-base-content/70">
            A preview of your colour and theme. The checked circle is a sample, not recorded
            activity.
          </p>
          <Preview store={store} />
        </>
      )}
      {review && <Review store={store} today={today} />}
    </div>
  );
}

function Review({ store, today }) {
  const { t, i18n } = useTranslation();
  const schedule = scheduleOn(store, today);
  const selected = ROUTINE_IDS.filter((id) => schedule.enabled[id]);
  const weekday = (d) =>
    new Intl.DateTimeFormat(i18n.language, { weekday: 'long' }).format(
      new Date(2026, 9, 4 + d, 12)
    );
  return (
    <section aria-label="Review your setup" className="space-y-3 rounded-3xl bg-base-100 p-4">
      <h2 className="text-lg font-bold">Ready for your first day?</h2>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="font-semibold">Your routines</dt>
          <dd>
            {selected.length
              ? selected.map((id) => labelFor(store, id, t)).join(', ')
              : 'No routines selected. You can turn them on in Settings.'}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Your week</dt>
          <dd>
            {schedule.meetingDays.length
              ? `Meetings: ${schedule.meetingDays.map(weekday).join(', ')}.`
              : 'Meeting days can be added later.'}{' '}
            Family worship: {weekday(schedule.familyWorshipDay)}.
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Your reading</dt>
          <dd>
            {BOOKS[store.reading.start.book - 1].name} {store.reading.start.chapter} ·{' '}
            {t(`fd.onboarding.reading.${store.reading.plan === 'year' ? 'year' : 'ownPace'}`)}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Your rhythm</dt>
          <dd>
            Daily text: {store.anchors.dailyText?.time ?? '07:00'}. Evening notification:{' '}
            {store.wrapUpNotification ? `on at ${store.wrapUpTime}` : 'off'}. Encouragement:{' '}
            {t(`fd.onboarding.rhythm.tones.${store.tone}`)}.
          </dd>
        </div>
        {store.pioneer && (
          <div>
            <dt className="font-semibold">Ministry hours</dt>
            <dd>Monthly goal: {store.hoursGoal} hours.</dd>
          </div>
        )}
      </dl>
      <p className="text-sm text-base-content/70">
        Use Back to adjust anything. Starting saves these choices; it does not complete a routine.
      </p>
    </section>
  );
}
