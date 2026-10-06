import { useTranslation } from 'react-i18next';
import { useStore } from '../data/useStore.js';
import { booksCompleted } from '../domain/bible.js';
import { streak, totals } from '../domain/progress.js';
import { ROUTINE_IDS } from '../domain/routines.js';
import { scheduleOn } from '../domain/schedule.js';
import { labelFor } from '../domain/store.js';
import BibleMap from '../components/BibleMap.jsx';

const RECENT_KEY = {
  days: 'recentDays',
  weeks: 'recentWeeks',
  meetings: 'recentMeetings',
  months: 'recentMonths',
};

function RoutineCard({ title, s, daysThisYear }) {
  const { t } = useTranslation();
  return (
    <li className="card bg-base-100 p-4 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      <p>
        {t(`fd.progress.${RECENT_KEY[s.recentUnit]}`, { count: s.recentTotal, done: s.recentDone })}
      </p>
      {s.current > 0 && (
        <p className="text-[var(--fd-accent)]">{t('fd.progress.streak', { count: s.current })}</p>
      )}
      <p className="text-sm text-base-content/70">
        {t('fd.progress.daysThisYear', { count: daysThisYear })}
      </p>
    </li>
  );
}

export default function Progress() {
  const { t } = useTranslation();
  const { store, today } = useStore();
  const { enabled } = scheduleOn(store, today);
  const sums = totals(store, today);
  const completed = booksCompleted(store);

  return (
    <main
      data-testid="progress"
      className="min-h-screen bg-base-200 px-4 pb-24 pt-[max(env(safe-area-inset-top),1rem)]"
    >
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-3xl font-bold">{t('fd.progress.title')}</h1>
        <ul className="space-y-3">
          {ROUTINE_IDS.filter((id) => enabled[id]).map((id) => (
            <RoutineCard
              key={id}
              title={labelFor(store, id, t)}
              s={streak(store, id, today)}
              daysThisYear={sums.perRoutineDaysThisYear[id]}
            />
          ))}
        </ul>
        <section className="card space-y-3 bg-base-100 p-4 shadow-sm">
          <h2 className="font-semibold">{t('fd.progress.readingTitle')}</h2>
          <p>{t('fd.progress.readingDays', { count: sums.readingDaysThisYear })}</p>
          <p>{t('fd.progress.chapters', { count: sums.chaptersThisYear })}</p>
          <p>{t('fd.progress.books', { count: sums.booksCompleted })}</p>
          <BibleMap completed={completed} />
        </section>
      </div>
    </main>
  );
}
