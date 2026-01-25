import { format } from 'date-fns';
import { Sun, CloudSun, Moon, Check, Heart, Sparkles } from 'lucide-react';
import useProgressStore from '../stores/progressStore';
import useGamificationStore from '../stores/gamificationStore';
import { haptics } from '../utils/native';

const PRAYER_TIMES = [
  {
    id: 'morning',
    label: 'Morning Prayer',
    icon: Sun,
    description: 'Start your day with Jehovah',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10'
  },
  {
    id: 'afternoon',
    label: 'Afternoon Prayer',
    icon: CloudSun,
    description: 'Midday communion',
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10'
  },
  {
    id: 'evening',
    label: 'Evening Prayer',
    icon: Moon,
    description: 'End your day in prayer',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10'
  },
];

function PrayerTrackingCard() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const {
    getPrayerProgress,
    updatePrayerProgress,
    getAllPrayersComplete,
    getPrayerStreak
  } = useProgressStore();

  const { addPoints } = useGamificationStore();

  const prayers = getPrayerProgress(today);
  const allComplete = getAllPrayersComplete(today);
  const prayerStreak = getPrayerStreak();
  const completedCount = [prayers.morning, prayers.afternoon, prayers.evening].filter(Boolean).length;

  const handlePrayerCheck = (prayerId) => {
    haptics.light();
    const newValue = !prayers[prayerId];
    updatePrayerProgress(today, prayerId, newValue);

    // Award points for prayer
    if (newValue) {
      addPoints(5);
    }

    // Check if all prayers are now complete
    const newPrayers = { ...prayers, [prayerId]: newValue };
    if (newPrayers.morning && newPrayers.afternoon && newPrayers.evening) {
      setTimeout(() => {
        haptics.success();
        addPoints(10); // Bonus for completing all prayers
      }, 100);
    }
  };

  return (
    <article className="card bg-base-100 shadow-sm rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className={`p-3 rounded-2xl ${allComplete ? 'bg-success/10' : 'bg-pink-500/10'}`}>
          <Heart className={`w-6 h-6 ${allComplete ? 'text-success' : 'text-pink-500'}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold">Daily Prayers</h3>
          <p className="text-sm text-base-content/50">
            {completedCount}/3 prayers today
          </p>
        </div>
        {prayerStreak > 0 && (
          <div className="badge badge-primary gap-1">
            <Sparkles className="w-3 h-3" />
            {prayerStreak} day streak
          </div>
        )}
      </div>

      {/* All Complete Banner */}
      {allComplete && (
        <div className="mx-4 mb-3 flex items-center justify-center gap-2 p-3 bg-success/10 rounded-xl text-success">
          <Sparkles className="w-4 h-4" />
          <span className="font-medium text-sm">All prayers complete for today!</span>
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
                ? 'bg-success/10'
                : 'bg-base-200/50 active:bg-base-200'
            }`}
          >
            <div className={`p-2 rounded-lg ${prayers[prayer.id] ? 'bg-success/20' : prayer.bgColor}`}>
              <Icon className={`w-5 h-5 ${prayers[prayer.id] ? 'text-success' : prayer.color}`} />
            </div>
            <div className="flex-1 text-left">
              <span className={`font-medium block ${prayers[prayer.id] ? 'text-success' : ''}`}>
                {prayer.label}
              </span>
              <span className="text-xs text-base-content/50">{prayer.description}</span>
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
