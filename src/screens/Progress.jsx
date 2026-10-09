import QuickGuide from '../components/QuickGuide.jsx';
import ScreenIntro from '../components/ScreenIntro.jsx';
import ShareButton from '../components/fun/ShareButton.jsx';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../data/useStore.js';
import { booksCompleted } from '../domain/bible.js';
import { streak, totals, weeklyActivity } from '../domain/progress.js';
import { ROUTINE_IDS } from '../domain/routines.js';
import { scheduleOn } from '../domain/schedule.js';
import { labelFor } from '../domain/store.js';
import Garden from '../components/fun/Garden.jsx';
import LevelBar from '../components/fun/LevelBar.jsx';
import { totalXp } from '../domain/xp.js';
import { gardenStage, levelFor } from '../domain/garden.js';
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
      {s.recentTotal > 0 && (
        <p>
          {t(`fd.progress.${RECENT_KEY[s.recentUnit]}`, {
            count: s.recentTotal,
            done: s.recentDone,
          })}
        </p>
      )}
      {s.current > 0 && (
        <p className="text-[var(--fd-accent-text)]">
          {t('fd.progress.streak', { count: s.current })}
        </p>
      )}
      <p className="text-sm text-base-content/70">
        {t('fd.progress.daysThisYear', { count: daysThisYear })}
      </p>
      {daysThisYear > 0 && (
        <ShareButton kind="streak" data={{ title, streak: s.current, days: daysThisYear }} />
      )}
    </li>
  );
}

export default function Progress() {
  const { t } = useTranslation();
  const { store, today } = useStore();
  const { enabled } = scheduleOn(store, today);
  const sums = totals(store, today);
  const week = weeklyActivity(store, today);
  const completed = booksCompleted(store);
  const xp = totalXp(store, today);
  const cards = ROUTINE_IDS.filter((id) => enabled[id]);

  return (
    <main
      data-testid="progress"
      className="min-h-screen bg-base-200 px-4 pb-24 pt-[max(env(safe-area-inset-top),1rem)]"
    >
      <div className="mx-auto max-w-md space-y-4">
        <ScreenIntro
          title={t('fd.progress.title')}
          subtitle="Little moments add up. Your pace is welcome here."
          tone="teal"
        />
        <QuickGuide
          title="Understand your progress"
          steps={[
            {
              title: 'Start with this week',
              body: 'The weekly card counts the routine check-ins you actually recorded, for routines currently enabled.',
            },
            {
              title: 'Watch your garden grow',
              body: 'Recorded activity earns points and garden milestones. Quiet days carry no penalty; there is no leaderboard.',
            },
            {
              title: 'Make it comfortable',
              body: 'Settings lets you hide points, choose a quiet tone and change your routine rhythm.',
            },
          ]}
        />
        <section
          aria-label={t('fd.progress.thisWeek')}
          className="card space-y-2 bg-base-100 p-4 shadow-sm"
        >
          <h2 className="font-semibold">{t('fd.progress.thisWeek')}</h2>
          <p>{t('fd.progress.checkIns', { count: week.checkIns })}</p>
          <p className="text-sm text-base-content/70">
            {t('fd.progress.activeDays', { count: week.activeDays })}
          </p>
          {week.checkIns === 0 && (
            <p className="text-sm text-base-content/70">{t('fd.progress.weekEmpty')}</p>
          )}
        </section>
        <section className="card space-y-3 bg-base-100 p-4 shadow-sm">
          <h2 className="font-semibold">{t('fd.fun.gardenTitle')}</h2>
          <div className="mx-auto w-full max-w-48">
            <Garden
              stage={gardenStage(xp)}
              level={levelFor(xp).level}
              badges={Object.keys(store.badges).length}
            />
          </div>
          {store.showGameLayer && <LevelBar xp={xp} tone={store.tone} />}
          {xp > 0 && (
            <ShareButton
              kind="garden"
              stage={gardenStage(xp)}
              data={{
                showGameLayer: store.showGameLayer,
                name:
                  levelFor(xp).level < 8
                    ? t(`fd.fun.levels.${levelFor(xp).level}`)
                    : t('fd.fun.treeNumber', { count: levelFor(xp).level - 6 }),
                level: levelFor(xp).level,
              }}
            />
          )}
          <Link className="btn btn-ghost min-h-11" to="/progress/badges">
            {t('fd.fun.badgesTitle')}
          </Link>
        </section>
        {cards.length > 0 && (
          <ul aria-label="Routine progress" className="space-y-3">
            {cards.map((id) => (
              <RoutineCard
                key={id}
                title={labelFor(store, id, t)}
                s={streak(store, id, today)}
                daysThisYear={sums.perRoutineDaysThisYear[id]}
              />
            ))}
          </ul>
        )}
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
