import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Sun, CloudSun, Moon, Heart, Flame } from 'lucide-react';
import useProgressStore from '../stores/progressStore';
import useGamificationStore from '../stores/gamificationStore';
import { haptics } from '../utils/native';

const PRAYER_TIMES = [
  {
    id: 'morning',
    labelKey: 'today.morningPrayer',
    icon: Sun,
    descKey: 'today.morningPrayerDesc',
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  },
  {
    id: 'afternoon',
    labelKey: 'today.afternoonPrayer',
    icon: CloudSun,
    descKey: 'today.afternoonPrayerDesc',
    color: 'text-secondary',
    bgColor: 'bg-secondary/10'
  },
  {
    id: 'evening',
    labelKey: 'today.eveningPrayer',
    icon: Moon,
    descKey: 'today.eveningPrayerDesc',
    color: 'text-neutral',
    bgColor: 'bg-neutral/10'
  },
];

function PrayerTrackingCard() {
  const { t } = useTranslation();
  const today = format(new Date(), 'yyyy-MM-dd');

  const {
    getPrayerProgress,
    updatePrayerProgress,
    getAllPrayersComplete,
    getPrayerStreak
  } = useProgressStore();

  const { recordPrayerCompletion } = useGamificationStore();

  const prayers = getPrayerProgress(today);
  const allComplete = getAllPrayersComplete(today);
  const prayerStreak = getPrayerStreak();
  const completedCount = [prayers.morning, prayers.afternoon, prayers.evening].filter(Boolean).length;

  const handlePrayerCheck = (prayerId) => {
    haptics.light();
    const newValue = !prayers[prayerId];
    updatePrayerProgress(today, prayerId, newValue);

    // Record to gamification store
    if (newValue) {
      const newPrayers = { ...prayers, [prayerId]: newValue };
      const allDone = newPrayers.morning && newPrayers.afternoon && newPrayers.evening;
      recordPrayerCompletion(allDone);

      if (allDone) {
        setTimeout(() => {
          haptics.success();
        }, 100);
      }
    }
  };

  return (
    <div className="ios-grouped">
      {/* Header row — also serves as the prayer card's identity */}
      <div className="ios-row" style={{ minHeight: 56 }}>
        <div className="ios-icon" style={{ background: allComplete ? 'var(--ios-green)' : 'rgba(255,59,48,0.14)' }}>
          <Heart style={{ color: allComplete ? 'white' : 'var(--ios-red)' }} />
        </div>
        <div className="body">
          <div className="title">{t('today.prayers')}</div>
          <div className="sub">{completedCount}/3 {t('today.prayersToday')}</div>
        </div>
        {prayerStreak > 0 && (
          <span className="ios-pill" style={{ background: 'rgba(255,149,0,0.14)', color: 'var(--ios-orange)' }}>
            <Flame className="w-3 h-3" /> {prayerStreak}
          </span>
        )}
      </div>

      {/* Prayer rows — one per prayer time */}
      {PRAYER_TIMES.map((prayer) => {
        const Icon = prayer.icon;
        return (
          <button
            key={prayer.id}
            onClick={() => handlePrayerCheck(prayer.id)}
            className={`ios-row ${prayers[prayer.id] ? 'done' : ''}`}
            style={{ background: 'transparent', border: 0, width: '100%', textAlign: 'left', margin: 0 }}
            aria-label={`${t(prayer.labelKey)} — ${t(prayer.descKey)}`}
            aria-pressed={!!prayers[prayer.id]}
          >
            <div className="ios-icon" style={{
              background: prayers[prayer.id]
                ? 'var(--ios-green)'
                : (prayer.id === 'morning' ? 'var(--ios-orange)' : prayer.id === 'afternoon' ? 'rgba(0,122,255,0.14)' : 'rgba(88,86,214,0.14)')
            }}>
              <Icon style={{ color: prayers[prayer.id] ? 'white' : (prayer.id === 'morning' ? 'var(--ios-orange)' : prayer.id === 'afternoon' ? 'var(--ios-blue)' : 'var(--ios-indigo)') }} />
            </div>
            <div className="body">
              <div className="title">{t(prayer.labelKey)}</div>
              <div className="sub">{t(prayer.descKey)}</div>
            </div>
            <div className={`ios-check ${prayers[prayer.id] ? 'done' : ''}`}>
              {prayers[prayer.id] && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default PrayerTrackingCard;
