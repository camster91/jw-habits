import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../data/useStore.js';
import { BOOKS } from '../../domain/bible.js';
import { MAX_STEPS, MAX_TITLE } from '../../domain/ids.js';
import { linkLocale } from '../../domain/links.js';
import {
  createPlan,
  generateBibleBook,
  generateChapters,
  generateLessons,
  generateWeekly,
  setActiveStudy,
} from '../../domain/plans.js';
import { PLAN_ICONS, PLAN_KINDS } from '../../domain/store.js';
import { PLAN_COLOURS, PLAN_COLOUR_NAMES } from '../../theme/planColours.js';
import PlanIcon from './PlanIcon.jsx';
import Sheet from './Sheet.jsx';

const GENERATORS = ['blank', 'chapters', 'lessons', 'bibleBook', 'weekly'];
const COUNTED = { chapters: generateChapters, lessons: generateLessons, weekly: generateWeekly };

const isCount = (n) => Number.isInteger(n) && n >= 1 && n <= MAX_STEPS;
const bookName = (n) => BOOKS.find((b) => b.n === n)?.name ?? '';

function Choices({ legend, children }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

/**
 * Starts a plan: title, kind, colour, icon, and its first steps from a
 * generator (chapters, lessons, a Bible book by chapter, weekly) or none. The
 * first study project becomes the active one.
 */
export default function NewPlanSheet({ kind: initialKind = 'study', onClose }) {
  const { t, i18n } = useTranslation();
  const { store, update, today } = useStore();
  const ids = {
    title: useId(),
    generator: useId(),
    count: useId(),
    countErr: useId(),
    book: useId(),
    err: useId(),
  };

  const [title, setTitle] = useState('');
  const [autoTitle, setAutoTitle] = useState(true);
  const [kind, setKind] = useState(initialKind);
  const [colour, setColour] = useState(0);
  const [icon, setIcon] = useState('book');
  const [generator, setGenerator] = useState('blank');
  const [count, setCount] = useState('10');
  const [book, setBook] = useState(1);
  const [errors, setErrors] = useState({});

  // A Bible-book plan is titled after its book until the user types a title.
  const followBook = (n) => {
    if (autoTitle || title.trim() === '') {
      setTitle(bookName(n));
      setAutoTitle(true);
    }
  };

  const chooseGenerator = (g) => {
    setGenerator(g);
    if (g === 'bibleBook') followBook(book);
    // Leaving the Bible book drops its name, unless the user wrote the title.
    else if (generator === 'bibleBook' && autoTitle) setTitle('');
  };

  const chooseBook = (n) => {
    setBook(n);
    followBook(n);
  };

  const create = () => {
    const n = Number(count);
    const next = {
      title: title.trim() ? null : t('fd.plans.new.titleNeeded'),
      count: COUNTED[generator] && !isCount(n) ? t('fd.plans.new.countRange') : null,
    };
    setErrors(next);
    if (next.title || next.count) return;
    const steps =
      generator === 'bibleBook'
        ? generateBibleBook(book, linkLocale(i18n.language))
        : COUNTED[generator]
          ? COUNTED[generator](n)
          : [];
    const input = { title, kind, colour, icon, steps };
    // A refusal keeps the sheet open with a message instead of closing silently.
    if (!createPlan(store, input, today).planId) {
      setErrors({ form: t('fd.plans.new.refused') });
      return;
    }
    update((s) => {
      const made = createPlan(s, input, today);
      if (!made.planId) return s;
      return kind === 'study' && s.activePlan.personalStudy === null
        ? setActiveStudy(made.store, made.planId)
        : made.store;
    });
    onClose();
  };

  const heading = kind === 'family' ? t('fd.plans.new.titleFamily') : t('fd.plans.new.titleStudy');

  return (
    <Sheet title={heading} onClose={onClose} testId="new-plan-sheet">
      <div className="flex flex-col gap-1">
        <label htmlFor={ids.title} className="text-sm font-medium">
          {t('fd.plans.new.name')}
        </label>
        <input
          id={ids.title}
          type="text"
          maxLength={MAX_TITLE}
          className="input input-bordered min-h-11 w-full"
          value={title}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? ids.err : undefined}
          onChange={(e) => {
            setTitle(e.target.value);
            setAutoTitle(false);
          }}
        />
        {errors.title && (
          <p id={ids.err} className="text-sm text-error">
            {errors.title}
          </p>
        )}
      </div>

      <Choices legend={t('fd.plans.new.kind')}>
        {PLAN_KINDS.map((k) => (
          <label key={k} className="label min-h-11 cursor-pointer gap-2">
            <input
              type="radio"
              name="plan-kind"
              className="radio"
              checked={kind === k}
              onChange={() => setKind(k)}
            />
            <span>{t(`fd.plans.kinds.${k}`)}</span>
          </label>
        ))}
      </Choices>

      <Choices legend={t('fd.plans.new.colour')}>
        {PLAN_COLOURS.map((hex, i) => (
          <label key={hex} className="relative cursor-pointer">
            <input
              type="radio"
              name="plan-colour"
              className="peer sr-only"
              aria-label={t(`fd.plans.colours.${PLAN_COLOUR_NAMES[i]}`)}
              checked={colour === i}
              onChange={() => setColour(i)}
            />
            <span
              aria-hidden="true"
              className="block h-11 w-11 rounded-full ring-offset-2 ring-offset-base-100 peer-checked:ring-4 peer-checked:ring-base-content peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4"
              style={{ backgroundColor: hex }}
            />
          </label>
        ))}
      </Choices>

      <Choices legend={t('fd.plans.new.icon')}>
        {PLAN_ICONS.map((id) => (
          <label key={id} className="cursor-pointer">
            <input
              type="radio"
              name="plan-icon"
              className="peer sr-only"
              aria-label={t(`fd.plans.icons.${id}`)}
              checked={icon === id}
              onChange={() => setIcon(id)}
            />
            <span
              aria-hidden="true"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-base-content/20 text-base-content/70 peer-checked:border-transparent peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
              style={icon === id ? { backgroundColor: PLAN_COLOURS[colour] } : undefined}
            >
              <PlanIcon icon={id} />
            </span>
          </label>
        ))}
      </Choices>

      <div className="flex flex-col gap-1">
        <label htmlFor={ids.generator} className="text-sm font-medium">
          {t('fd.plans.new.generator')}
        </label>
        <select
          id={ids.generator}
          className="select select-bordered min-h-11 w-full"
          value={generator}
          onChange={(e) => chooseGenerator(e.target.value)}
        >
          {GENERATORS.map((g) => (
            <option key={g} value={g}>
              {t(`fd.plans.new.generators.${g}`)}
            </option>
          ))}
        </select>
      </div>

      {COUNTED[generator] && (
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.count} className="text-sm font-medium">
            {t('fd.plans.new.count')}
          </label>
          <input
            id={ids.count}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_STEPS}
            className="input input-bordered min-h-11 w-32"
            value={count}
            aria-invalid={Boolean(errors.count)}
            aria-describedby={errors.count ? ids.countErr : undefined}
            onChange={(e) => setCount(e.target.value)}
          />
          {errors.count && (
            <p id={ids.countErr} className="text-sm text-error">
              {errors.count}
            </p>
          )}
        </div>
      )}

      {generator === 'bibleBook' && (
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.book} className="text-sm font-medium">
            {t('fd.plans.new.book')}
          </label>
          <select
            id={ids.book}
            className="select select-bordered min-h-11 w-full"
            value={book}
            onChange={(e) => chooseBook(Number(e.target.value))}
          >
            {BOOKS.map((b) => (
              <option key={b.n} value={b.n}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {errors.form && <p className="text-sm text-error">{errors.form}</p>}
      <div className="flex gap-2 pt-2">
        <button type="button" className="btn btn-primary min-h-11 flex-1" onClick={create}>
          {t('fd.plans.new.create')}
        </button>
        <button type="button" className="btn btn-ghost min-h-11 flex-1" onClick={onClose}>
          {t('fd.plans.new.cancel')}
        </button>
      </div>
    </Sheet>
  );
}
