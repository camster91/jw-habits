import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, CheckCircle2, ExternalLink } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import useProgressStore from '../stores/progressStore';
import useGamificationStore from '../stores/gamificationStore';
import { getWorkbookForWeek, JW_ORG_SECTIONS } from '../utils/jwLibraryLinks';
import { haptics } from '../utils/native';
import MidweekMeetingSection from './MidweekMeetingSection';
import WeekendMeetingSection from './WeekendMeetingSection';

function getWorkbookWolLink(docid) {
  if (!docid) return JW_ORG_SECTIONS.meetingWorkbooks;
  return `https://wol.jw.org/en/wol/d/r1/lp-e/${docid}`;
}

function MeetingCard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('midweek');
  const [workbookData, setWorkbookData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekOf = format(weekStart, 'yyyy-MM-dd');
  const midweekDate = format(addDays(weekStart, 2), 'EEEE, MMMM d');
  const weekendDate = format(addDays(weekStart, 5), 'EEEE, MMMM d');

  const {
    getMeetingProgress,
    updateMeetingPartProgress,
    initMeetingParts,
    isMeetingPrepared,
    markMeetingPrepared
  } = useProgressStore();

  const { recordMeetingPrepared } = useGamificationStore();

  const midweekProgress = getMeetingProgress(weekOf, 'midweek');
  const weekendProgress = getMeetingProgress(weekOf, 'weekend');
  const isMidweekPrepared = isMeetingPrepared(weekOf, 'midweek');
  const isWeekendPrepared = isMeetingPrepared(weekOf, 'weekend');

  useEffect(() => {
    async function loadWorkbook() {
      try {
        setLoading(true);
        const data = await getWorkbookForWeek(new Date());
        setWorkbookData(data);

        if (data?.midweek) {
          const midweekPartKeys = [
            'treasures_talk',
            'treasures_spiritualGems',
            'treasures_bibleReading',
            'ministry_assignment1',
            'ministry_assignment2',
            'ministry_assignment3',
            'living_part1',
            'living_cbs'
          ];
          if (data.midweek.living?.part2) {
            midweekPartKeys.splice(7, 0, 'living_part2');
          }
          initMeetingParts(weekOf, 'midweek', midweekPartKeys);
        }

        const weekendPartKeys = ['watchtower'];
        initMeetingParts(weekOf, 'weekend', weekendPartKeys);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    loadWorkbook();
  }, [weekOf, initMeetingParts]);

  const handlePartToggle = (meetingType, partKey, completed) => {
    updateMeetingPartProgress(weekOf, meetingType, partKey, completed);
  };

  const handleMarkAllComplete = (meetingType) => {
    haptics.success();
    markMeetingPrepared(weekOf, meetingType);
    recordMeetingPrepared();
  };

  const getDaysUntilMeeting = (dayIndex) => {
    const today = new Date();
    const meetingDate = addDays(weekStart, dayIndex);
    return Math.ceil((meetingDate - today) / (1000 * 60 * 60 * 24));
  };

  const midweekDaysLeft = getDaysUntilMeeting(2);
  const weekendDaysLeft = getDaysUntilMeeting(5);
  const workbookLink = getWorkbookWolLink(workbookData?.docid);

  const getMidweekParts = () => {
    const midweek = workbookData?.midweek;
    const parts = midweekProgress.parts || {};

    if (!midweek) {
      return {
        treasures: [
          { key: 'treasures_talk', title: 'Talk', duration: 10, completed: parts['treasures_talk'] || false },
          { key: 'treasures_spiritualGems', title: 'Spiritual Gems', duration: 10, completed: parts['treasures_spiritualGems'] || false },
          { key: 'treasures_bibleReading', title: 'Bible Reading', duration: 4, completed: parts['treasures_bibleReading'] || false }
        ],
        ministry: [
          { key: 'ministry_assignment1', title: 'Starting a Conversation', duration: 3, completed: parts['ministry_assignment1'] || false },
          { key: 'ministry_assignment2', title: 'Following Up', duration: 4, completed: parts['ministry_assignment2'] || false },
          { key: 'ministry_assignment3', title: 'Making Disciples', duration: 5, completed: parts['ministry_assignment3'] || false }
        ],
        living: [
          { key: 'living_part1', title: 'Talk/Discussion', duration: 15, completed: parts['living_part1'] || false },
          { key: 'living_cbs', title: 'Congregation Bible Study', duration: 30, completed: parts['living_cbs'] || false }
        ]
      };
    }

    const treasures = [
      {
        key: 'treasures_talk',
        title: midweek.treasures?.talk?.title || 'Talk',
        subtitle: midweek.treasures?.talk?.scriptures?.join(', '),
        duration: midweek.treasures?.talk?.duration || 10,
        completed: parts['treasures_talk'] || false
      },
      {
        key: 'treasures_spiritualGems',
        title: 'Spiritual Gems',
        subtitle: midweek.treasures?.spiritualGems?.question,
        duration: midweek.treasures?.spiritualGems?.duration || 10,
        completed: parts['treasures_spiritualGems'] || false
      },
      {
        key: 'treasures_bibleReading',
        title: 'Bible Reading',
        subtitle: midweek.treasures?.bibleReading?.scripture,
        duration: midweek.treasures?.bibleReading?.duration || 4,
        completed: parts['treasures_bibleReading'] || false
      }
    ];

    const ministry = [];
    ['assignment1', 'assignment2', 'assignment3'].forEach((key, i) => {
      const a = midweek.ministry?.[key];
      if (a) {
        ministry.push({
          key: `ministry_${key}`,
          title: a.title || a.type || `Assignment ${i + 1}`,
          subtitle: a.setting,
          duration: a.duration || 3,
          completed: parts[`ministry_${key}`] || false
        });
      }
    });

    const living = [];
    if (midweek.living?.part1) {
      living.push({
        key: 'living_part1',
        title: midweek.living.part1.title || 'Talk/Discussion',
        duration: midweek.living.part1.duration || 15,
        completed: parts['living_part1'] || false
      });
    }
    if (midweek.living?.part2) {
      living.push({
        key: 'living_part2',
        title: midweek.living.part2.title || 'Discussion',
        duration: midweek.living.part2.duration || 5,
        completed: parts['living_part2'] || false
      });
    }
    const cbsLessons = midweek.living?.cbs?.lessons ? ` (Lessons ${midweek.living.cbs.lessons})` : '';
    living.push({
      key: 'living_cbs',
      title: 'Congregation Bible Study',
      subtitle: (midweek.living?.cbs?.publication || '') + cbsLessons,
      duration: midweek.living?.cbs?.duration || 30,
      completed: parts['living_cbs'] || false
    });

    return { treasures, ministry, living };
  };

  const getWeekendParts = () => {
    const parts = weekendProgress.parts || {};
    return [
      { key: 'publicTalk', title: 'Public Talk', duration: 30, completed: parts['publicTalk'] || false },
      { key: 'watchtower', title: 'Watchtower Study', duration: 60, completed: parts['watchtower'] || false }
    ];
  };

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-sm rounded-2xl">
        <div className="card-body items-center py-8">
          <div className="loading loading-spinner loading-md text-accent"></div>
          <p className="text-sm text-base-content/50">{t("study.loading")}</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="card bg-base-100 shadow-sm rounded-2xl">
        <div className="card-body items-center py-8">
          <Calendar className="w-8 h-8 text-base-content/30" />
          <p className="text-sm text-base-content/50">{t("study.loadError")}</p>
          <a
            href={JW_ORG_SECTIONS.meetingWorkbooks}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm mt-2"
          >
            <ExternalLink className="w-4 h-4" /> {t("study.openOnJw")}
          </a>
        </div>
      </div>
    );
  }

  const midweekParts = getMidweekParts();
  const weekendParts = getWeekendParts();
  const songs = workbookData?.songs;

  return (
    <div className="card bg-base-100 shadow-sm rounded-2xl overflow-hidden">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-2xl">
            <Calendar className="w-6 h-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg">This Week&apos;s Meetings</h2>
            <p className="text-xs text-base-content/50">
              {workbookData?.weekOf || format(weekStart, 'MMMM d') + ' - ' + format(addDays(weekStart, 6), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {['midweek', 'weekend'].map((tab) => {
            const isActive = activeTab === tab;
            const isPrepared = tab === 'midweek' ? isMidweekPrepared : isWeekendPrepared;
            return (
              <button
                key={tab}
                onClick={() => { haptics.light(); setActiveTab(tab); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95 ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-base-200 text-base-content/60'
                }`}
              >
                {tab === 'midweek' ? t("study.midweek") : t("study.weekend")}
                {isPrepared && <CheckCircle2 className="w-4 h-4" />}
              </button>
            );
          })}
        </div>

        {/* Midweek Tab */}
        {activeTab === 'midweek' && (
          <MidweekMeetingSection
            date={midweekDate}
            isPrepared={isMidweekPrepared}
            daysLeft={midweekDaysLeft}
            progress={midweekProgress}
            parts={midweekParts}
            songs={songs}
            workbookLink={workbookLink}
            onPartToggle={(key, completed) => handlePartToggle('midweek', key, completed)}
            onMarkAllComplete={() => handleMarkAllComplete('midweek')}
          />
        )}

        {/* Weekend Tab */}
        {activeTab === 'weekend' && (
          <WeekendMeetingSection
            date={weekendDate}
            isPrepared={isWeekendPrepared}
            daysLeft={weekendDaysLeft}
            progress={weekendProgress}
            parts={weekendParts}
            onPartToggle={(key, completed) => handlePartToggle('weekend', key, completed)}
            onMarkAllComplete={() => handleMarkAllComplete('weekend')}
          />
        )}
      </div>
    </div>
  );
}

export default MeetingCard;