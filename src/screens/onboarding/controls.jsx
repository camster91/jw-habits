import { useId } from 'react';

// Small labelled form controls shared by the onboarding steps and Settings.
// Every target is at least 44 px tall.

const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

/** A switch with its label (and an optional hint) on one row. */
export function Toggle({ label, hint, checked, onChange }) {
  const id = useId();
  const hintId = useId();
  return (
    <div>
      <div className="flex min-h-11 items-center gap-3">
        <label htmlFor={id} className="flex min-h-11 flex-1 cursor-pointer items-center">
          {label}
        </label>
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="toggle toggle-primary"
          checked={checked}
          aria-describedby={hint ? hintId : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
      </div>
      {hint && (
        <p id={hintId} className="text-sm text-base-content/70">
          {hint}
        </p>
      )}
    </div>
  );
}

/** A group of radio buttons; `options` is `[{value, label}]`. */
export function Choice({ legend, options, value, onChange }) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      <div className="flex flex-col">
        {options.map((o) => (
          <label key={o.value} className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="radio"
              className="radio radio-sm"
              name={name}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A clock-time field that only reports complete 'HH:MM' values. */
export function TimeField({ label, value, onChange }) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="time"
        className="input input-bordered min-h-11 w-32"
        value={value}
        onChange={(e) => TIME.test(e.target.value) && onChange(e.target.value)}
      />
    </div>
  );
}

/** A labelled `<select>`; `options` is `[{value, label}]`. */
export function SelectField({ label, value, options, onChange }) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="select select-bordered min-h-11 w-44"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
