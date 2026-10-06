import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../data/useStore.js';
import { routineLink } from '../../domain/links.js';
import { labelFor } from '../../domain/store.js';
import { isSafeHttpUrl } from '../../utils/safeUrls.js';

const LINK_IDS = ['dailyText', 'meetingPrep', 'bibleReading'];

function LinkField({ label, placeholder, value, invalid, onChange }) {
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
 * default (shown as the placeholder). Only http(s) addresses are saved.
 */
export default function LinksSection() {
  const { t, i18n } = useTranslation();
  const { store, update } = useStore();
  const [values, setValues] = useState(() =>
    Object.fromEntries(LINK_IDS.map((id) => [id, store.links[id] ?? '']))
  );
  const [invalid, setInvalid] = useState([]);
  const [saved, setSaved] = useState(false);

  const placeholder = (id) =>
    id === 'bibleReading'
      ? t('fd.settings.links.bibleDefault')
      : routineLink({ links: {} }, id, i18n.language);

  const save = (e) => {
    e.preventDefault();
    const bad = LINK_IDS.filter((id) => values[id].trim() !== '' && !isSafeHttpUrl(values[id]));
    setInvalid(bad);
    setSaved(bad.length === 0);
    if (bad.length > 0) return;
    update((s) => {
      const links = { ...s.links };
      for (const id of LINK_IDS) {
        const v = values[id].trim();
        if (v) links[id] = v;
        else delete links[id];
      }
      return { ...s, links };
    });
  };

  return (
    <form className="space-y-3" onSubmit={save} noValidate>
      <p className="text-sm text-base-content/70">{t('fd.settings.links.body')}</p>
      {LINK_IDS.map((id) => (
        <LinkField
          key={id}
          label={labelFor(store, id, t)}
          placeholder={placeholder(id)}
          value={values[id]}
          invalid={invalid.includes(id)}
          onChange={(v) => {
            setSaved(false);
            setValues((x) => ({ ...x, [id]: v }));
          }}
        />
      ))}
      <button type="submit" className="btn min-h-11">
        {t('fd.settings.links.save')}
      </button>
      <p role="status" className="text-sm">
        {saved && t('fd.settings.links.saved')}
      </p>
    </form>
  );
}
