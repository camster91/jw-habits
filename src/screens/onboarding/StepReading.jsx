import { useTranslation } from 'react-i18next';
import { BOOKS } from '../../domain/bible.js';
import { Choice, SelectField, Toggle } from './controls.jsx';

/**
 * Step 4 / Settings → Reading: the plan, where to start, and whether books
 * before the start count as read. Changing only the pace keeps the current position. Changing the start
 * restarts reading today; the counting switch does not.
 */
export default function StepReading({ store, change, today }) {
  const { t } = useTranslation();
  const { plan, start, countEarlierAsRead } = store.reading;
  const book = BOOKS[start.book - 1];

  const restart = (patch) =>
    change((s) => ({ ...s, reading: { ...s.reading, ...patch, startedOn: today } }));

  return (
    <div className="space-y-4">
      <Choice
        legend={t('fd.onboarding.reading.plan')}
        value={plan}
        options={[
          {
            value: 'year',
            label: t('fd.onboarding.reading.year'),
            hint: 'Follow a suggested daily chapter schedule. Your actual reading stays on the day you record it.',
          },
          {
            value: 'ownPace',
            label: t('fd.onboarding.reading.ownPace'),
            hint: 'Choose how much to read each day without a year-plan comparison.',
          },
        ]}
        onChange={(plan) => change((s) => ({ ...s, reading: { ...s.reading, plan } }))}
      />
      <div className="space-y-4 rounded-2xl bg-base-100 p-4">
        <SelectField
          label={t('fd.onboarding.reading.book')}
          value={String(start.book)}
          options={BOOKS.map((b) => ({ value: String(b.n), label: b.name }))}
          onChange={(v) => restart({ start: { book: Number(v), chapter: 1 } })}
        />
        <SelectField
          label={t('fd.onboarding.reading.chapter')}
          value={String(start.chapter)}
          options={Array.from({ length: book.chapters }, (_, i) => ({
            value: String(i + 1),
            label: String(i + 1),
          }))}
          onChange={(v) => restart({ start: { book: start.book, chapter: Number(v) } })}
        />
      </div>
      <div className="rounded-2xl bg-base-100 p-4">
        <Toggle
          label={t('fd.onboarding.reading.countEarlier')}
          hint="Use this only if you have already read the books before your starting book. It marks those books as read in Progress."
          checked={countEarlierAsRead}
          onChange={(on) =>
            change((s) => ({ ...s, reading: { ...s.reading, countEarlierAsRead: on } }))
          }
        />
      </div>
      <p aria-live="polite" className="rounded-2xl bg-base-100 p-4 text-sm">
        Your starting place:{' '}
        <strong>
          {book.name} {start.chapter}
        </strong>
        .{' '}
        {plan === 'year'
          ? 'A year plan will suggest your next chapters.'
          : 'You decide the next small step.'}{' '}
        You can adjust this in Settings.
      </p>
    </div>
  );
}
