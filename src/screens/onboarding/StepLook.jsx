import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { labelFor } from '../../domain/store.js';
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
export default function StepLook({ store, change, preview = false }) {
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
      {preview && <Preview store={store} />}
    </div>
  );
}
