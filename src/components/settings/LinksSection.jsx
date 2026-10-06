import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../data/useStore.js';
import { routineLink } from '../../domain/links.js';
import { labelFor } from '../../domain/store.js';
import { isSafeHttpUrl } from '../../utils/safeUrls.js';

const LINK_IDS = ['dailyText', 'meetingPrep', 'bibleReading'];

/** Empty (use the default) or a safe http(s) address: either can be saved. */
const savable = (value) => value.trim() === '' || isSafeHttpUrl(value);

function LinkField({ label, placeholder, value, invalid, onChange, onBlur }) {
  const { t } = useTranslation();
  const id = useId();
  const errorId = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="url"
        inputMode="url"
        autoComplete="off"
        className="input input-bordered min-h-11 w-full"
        placeholder={placeholder}
        value={value}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {invalid && (
        <p id={errorId} className="text-sm text-error">
          {t('fd.settings.links.invalid')}
        </p>
      )}
    </div>
  );
}

/**
 * The user's own links for the routines that open something. Empty means the
 * default (shown as the placeholder). Each field saves as it is typed while
 * it is empty or a safe http(s) address; anything else stays in the field,
 * unsaved, and is flagged once the field loses focus.
 */
export default function LinksSection() {
  const { t, i18n } = useTranslation();
  const { store, update } = useStore();
  const [values, setValues] = useState(() =>
    Object.fromEntries(LINK_IDS.map((id) => [id, store.links[id] ?? '']))
  );
  const [flagged, setFlagged] = useState([]);

  const placeholder = (id) =>
    id === 'bibleReading'
      ? t('fd.settings.links.bibleDefault')
      : routineLink({ links: {} }, id, i18n.language);

  const edit = (id, value) => {
    setValues((x) => ({ ...x, [id]: value }));
    if (!savable(value)) return;
    setFlagged((f) => f.filter((x) => x !== id));
    update((s) => {
      const links = { ...s.links };
      const v = value.trim();
      if (v) links[id] = v;
      else delete links[id];
      return { ...s, links };
    });
  };

  const check = (id) => {
    if (!savable(values[id])) setFlagged((f) => (f.includes(id) ? f : [...f, id]));
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-base-content/70">{t('fd.settings.links.body')}</p>
      {LINK_IDS.map((id) => (
        <LinkField
          key={id}
          label={labelFor(store, id, t)}
          placeholder={placeholder(id)}
          value={values[id]}
          invalid={flagged.includes(id)}
          onChange={(v) => edit(id, v)}
          onBlur={() => check(id)}
        />
      ))}
    </div>
  );
}
