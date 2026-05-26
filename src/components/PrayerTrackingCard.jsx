import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Sun, CloudSun, Moon, Check, Heart, Flame, Star } from 'lucide-react';
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
    <article className="card bg-base-100 shadow-sm rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className={`p-3 rounded-2xl ${allComplete ? 'bg-success/10' : 'bg-primary/10'}`}>
          <Heart className={`w-6 h-6 ${allComplete ? 'text-success' : 'text-primary'}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold">{t('today.prayers')}</h3>
          <p className="text-sm text-base-content/50">
            {completedCount}/3 {t('today.prayersToday')}
          </p>
        </div>
        {prayerStreak > 0 && (
          <div className="badge badge-secondary gap-1">
            <Flame className="w-3 h-3 animate-flame" />
            {prayerStreak} {prayerStreak === 1 ? t('stats.day') : t('stats.days')}
          </div>
        )}
      </div>

      {/* All Complete Banner */}
      {allComplete && (
        <div className="mx-4 mb-3 flex items-center justify-center gap-2 p-3 bg-success/10 rounded-xl text-success">
          <Star className="w-4 h-4" />
          <span className="font-medium text-sm">{t('today.allPrayersComplete')}</span>
        </div>
      )}

      {/* Prayer Checklist */}
      <div className="px-4 pb-4 space-y-2">
        {PRAYER_TIMES.map((prayer) => {
          const Icon = prayer.icon;
          return (
          <button
            key={prayer.id}
            onClick={() => handlePrayerCheck(prayer.id)}
            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all active:scale-[0.98] ${
              prayers[prayer.id]
                ? 'bg-success/10 opacity-60'
                : 'bg-base-200/50 active:bg-base-200'
            }`}
          >
            <div className={`p-2 rounded-lg ${prayers[prayer.id] ? 'bg-success/20' : prayer.bgColor}`}>
              <Icon className={`w-5 h-5 ${prayers[prayer.id] ? 'text-success' : prayer.color}`} />
            </div>
            <div className="flex-1 text-left">
              <span className={`font-medium block ${prayers[prayer.id] ? 'text-success' : ''}`}>
                {t(prayer.labelKey)}
              </span>
              <span className="text-xs text-base-content/50">{t(prayer.descKey)}</span>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              prayers[prayer.id]
                ? 'bg-success border-success'
                : 'border-base-content/20'
            }`}>
              {prayers[prayer.id] && <Check className="w-4 h-4 text-white" />}
            </div>
          </button>
        );
        })}
      </div>
    </article>
  );
}

export default PrayerTrackingCard;
