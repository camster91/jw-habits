import QuickGuide from '../components/QuickGuide.jsx';
import ScreenIntro from '../components/ScreenIntro.jsx';
import ShareButton from '../components/fun/ShareButton.jsx';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../data/useStore.js';
import { BADGES } from '../domain/badges.js';

export default function Badges() {
  const { t } = useTranslation();
  const { store } = useStore();
  return (
    <main className="min-h-screen bg-base-200 px-4 pb-24 pt-[max(env(safe-area-inset-top),1rem)]">
      <div className="mx-auto max-w-md space-y-4">
        <Link to="/progress" className="btn btn-ghost min-h-11">
          {t('fd.progress.title')}
        </Link>
        <ScreenIntro
          title={t('fd.fun.badgesTitle')}
          subtitle="Small milestones, a story of your own."
          tone="amber"
        />
        <QuickGuide
          title="Milestones without pressure"
          steps={[
            {
              title: 'Earn them naturally',
              body: 'Badges reflect recorded routine activity. There is no race or comparison with other people.',
            },
            {
              title: 'Share only if you want',
              body: 'An earned badge can become a card you choose to share. Your private note text is never included.',
            },
          ]}
        />
        <ul aria-label="Milestones" className="space-y-3">
          {BADGES.map(({ id }) => (
            <li key={id} className="card bg-base-100 p-4 shadow-sm">
              <h2 className="font-semibold">{t(`fd.fun.badges.${id}`)}</h2>
              <p>
                {store.badges[id] ? (
                  <time dateTime={store.badges[id]}>
                    {t('fd.fun.earnedOn', { day: store.badges[id] })}
                  </time>
                ) : (
                  t('fd.fun.notYet')
                )}
              </p>
              {store.badges[id] && (
                <ShareButton
                  kind="milestone"
                  data={{ title: t(`fd.fun.badges.${id}`), badge: true }}
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
