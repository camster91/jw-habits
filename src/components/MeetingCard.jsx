import { useState, useEffect } from 'react';
import { Book, Calendar, Check, Clock, ExternalLink } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import useProgressStore from '../stores/progressStore';
import { getWorkbookForWeek, getMeetingWorkbookLink, JW_ORG_SECTIONS } from '../utils/jwLibraryLinks';
import MeetingSection from './MeetingSection';

// Standard meeting parts structure (fallback if not in JSON)
const DEFAULT_MIDWEEK_PARTS = {
  treasures: {
    talk: { title: 'Talk', duration: 10 },
    spiritualGems: { title: 'Spiritual Gems', duration: 10 },
    bibleReading: { title: 'Bible Reading', duration: 4 }
  },
  ministry: {
    assignment1: { type: 'Starting a Conversation', duration: 3 },
    assignment2: { type: 'Following Up', duration: 4 },
    assignment3: { type: 'Making Disciples', duration: 5 }
  },
  living: {
    part1: { title: 'Talk/Discussion', duration: 15 },
    cbs: { title: 'Congregation Bible Study', duration: 30 }
  }
};

const DEFAULT_WEEKEND_PARTS = {
  publicTalk: { title: 'Public Talk', duration: 30 },
  watchtower: { title: 'Watchtower Study', duration: 60 }
};

function MeetingCard() {
  const [activeTab, setActiveTab] = useState('midweek');
  const [workbookData, setWorkbookData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get current week
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  const weekOf = format(weekStart, 'yyyy-MM-dd');

  // Get meeting dates
  const midweekDate = format(addDays(weekStart, 2), 'EEEE, MMMM d'); // Wednesday
  const weekendDate = format(addDays(weekStart, 5), 'EEEE, MMMM d'); // Saturday

  const {
    getMeetingProgress,
    updateMeetingPartProgress,
    initMeetingParts,
    isMeetingPrepared,
    markMeetingPrepared
  } = useProgressStore();

  const midweekProgress = getMeetingProgress(weekOf, 'midweek');
  const weekendProgress = getMeetingProgress(weekOf, 'weekend');
  const isMidweekPrepared = isMeetingPrepared(weekOf, 'midweek');
  const isWeekendPrepared = isMeetingPrepared(weekOf, 'weekend');

  // Load workbook data from static JSON
  useEffect(() => {
    async function loadWorkbook() {
      try {
        setLoading(true);
        const data = await getWorkbookForWeek(new Date());
        setWorkbookData(data);

        // Initialize meeting parts in store
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
          initMeetingParts(weekOf, 'midweek', midweekPartKeys);
        }

        // Initialize weekend parts (only watchtower has checkbox)
        const weekendPartKeys = ['watchtower'];
        initMeetingParts(weekOf, 'weekend', weekendPartKeys);
      } catch (err) {
        console.error('Failed to load workbook data:', err);
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
    markMeetingPrepared(weekOf, meetingType, 30);
  };

  const getDaysUntilMeeting = (dayIndex) => {
    const today = new Date();
    const meetingDate = addDays(weekStart, dayIndex);
    const diffTime = meetingDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const midweekDaysLeft = getDaysUntilMeeting(2);
  const weekendDaysLeft = getDaysUntilMeeting(5);

  const workbookLink = workbookData?.docid
    ? getMeetingWorkbookLink(workbookData.docid)
    : JW_ORG_SECTIONS.meetingWorkbooks;

  // Build parts arrays from workbook data
  const getMidweekParts = () => {
    const midweek = workbookData?.midweek || DEFAULT_MIDWEEK_PARTS;
    const parts = midweekProgress.parts || {};

    return {
      treasures: [
        {
          key: 'treasures_talk',
          title: midweek.treasures?.talk?.title || 'Talk',
          duration: midweek.treasures?.talk?.duration || 10,
          completed: parts['treasures_talk'] || false
        },
        {
          key: 'treasures_spiritualGems',
          title: 'Spiritual Gems',
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
      ],
      ministry: [
        {
          key: 'ministry_assignment1',
          title: midweek.ministry?.assignment1?.type || 'Starting a Conversation',
          duration: midweek.ministry?.assignment1?.duration || 3,
          completed: parts['ministry_assignment1'] || false
        },
        {
          key: 'ministry_assignment2',
          title: midweek.ministry?.assignment2?.type || 'Following Up',
          duration: midweek.ministry?.assignment2?.duration || 4,
          completed: parts['ministry_assignment2'] || false
        },
        {
          key: 'ministry_assignment3',
          title: midweek.ministry?.assignment3?.type || 'Making Disciples',
          duration: midweek.ministry?.assignment3?.duration || 5,
          completed: parts['ministry_assignment3'] || false
        }
      ],
      living: [
        {
          key: 'living_part1',
          title: midweek.living?.part1?.title || 'Talk/Discussion',
          duration: midweek.living?.part1?.duration || 15,
          completed: parts['living_part1'] || false
        },
        {
          key: 'living_cbs',
          title: 'Congregation Bible Study',
          subtitle: midweek.living?.cbs?.publication,
          duration: midweek.living?.cbs?.duration || 30,
          completed: parts['living_cbs'] || false
        }
      ]
    };
  };

  const getWeekendParts = () => {
    const parts = weekendProgress.parts || {};
    return [
      {
        key: 'publicTalk',
        title: 'Public Talk',
        duration: 30,
        completed: parts['publicTalk'] || false
      },
      {
        key: 'watchtower',
        title: 'Watchtower Study',
        duration: 60,
        completed: parts['watchtower'] || false
      }
    ];
  };

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center">
          <div className="loading loading-spinner loading-md text-accent"></div>
          <p className="text-sm text-base-content/70">Loading meetings...</p>
        </div>
      </div>
    );
  }

  const midweekParts = getMidweekParts();
  const weekendParts = getWeekendParts();

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-accent" />
          <h2 className="card-title text-lg">This Week's Meetings</h2>
        </div>

        <p className="text-xs text-base-content/60">
          {workbookData?.weekOf || format(weekStart, 'MMMM d') + ' - ' + format(addDays(weekStart, 6), 'MMMM d, yyyy')}
        </p>

        {/* Tabs */}
        <div className="tabs tabs-boxed mt-4">
          <button
            className={`tab ${activeTab === 'midweek' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('midweek')}
          >
            Midweek
            {isMidweekPrepared && <Check className="w-4 h-4 ml-1 text-success" />}
          </button>
          <button
            className={`tab ${activeTab === 'weekend' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('weekend')}
          >
            Weekend
            {isWeekendPrepared && <Check className="w-4 h-4 ml-1 text-success" />}
          </button>
        </div>

        <div className="divider my-2"></div>

        {/* Midweek Meeting */}
        {activeTab === 'midweek' && (
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{midweekDate}</p>
                <p className="text-sm text-base-content/70">7:00 PM</p>
              </div>
              {isMidweekPrepared ? (
                <div className="badge badge-success gap-2">
                  <Check className="w-4 h-4" />
                  Prepared
                </div>
              ) : midweekDaysLeft >= 0 ? (
                <div className="badge badge-warning">
                  <Clock className="w-3 h-3 mr-1" />
                  {midweekDaysLeft} days left
                </div>
              ) : (
                <div className="badge badge-error">Past</div>
              )}
            </div>

            {/* Overall Progress */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-base-content/60">Overall:</span>
              <div className="flex-1 h-2 bg-base-300 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    midweekProgress.progress === 100 ? 'bg-success' :
                    midweekProgress.progress > 0 ? 'bg-warning' : 'bg-base-300'
                  }`}
                  style={{ width: `${midweekProgress.progress || 0}%` }}
                />
              </div>
              <span className="text-xs font-medium">{midweekProgress.progress || 0}%</span>
            </div>

            {/* Collapsible Sections */}
            <div className="space-y-2">
              <MeetingSection
                title="Treasures From God's Word"
                color="bg-amber-500"
                parts={midweekParts.treasures}
                onPartToggle={(key, completed) => handlePartToggle('midweek', key, completed)}
                defaultExpanded={true}
              />

              <MeetingSection
                title="Apply Yourself to the Ministry"
                color="bg-emerald-500"
                parts={midweekParts.ministry}
                onPartToggle={(key, completed) => handlePartToggle('midweek', key, completed)}
              />

              <MeetingSection
                title="Living as Christians"
                color="bg-rose-500"
                parts={midweekParts.living}
                onPartToggle={(key, completed) => handlePartToggle('midweek', key, completed)}
              />
            </div>

            <a
              href={workbookLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm w-full"
            >
              <ExternalLink className="w-4 h-4" />
              Open Workbook in JW Library
            </a>

            {!isMidweekPrepared && midweekProgress.progress < 100 && (
              <button
                onClick={() => handleMarkAllComplete('midweek')}
                className="btn btn-primary btn-sm w-full"
              >
                <Check className="w-4 h-4" />
                Mark All Complete
              </button>
            )}
          </div>
        )}

        {/* Weekend Meeting */}
        {activeTab === 'weekend' && (
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{weekendDate}</p>
                <p className="text-sm text-base-content/70">10:00 AM</p>
              </div>
              {isWeekendPrepared ? (
                <div className="badge badge-success gap-2">
                  <Check className="w-4 h-4" />
                  Prepared
                </div>
              ) : weekendDaysLeft >= 0 ? (
                <div className="badge badge-warning">
                  <Clock className="w-3 h-3 mr-1" />
                  {weekendDaysLeft} days left
                </div>
              ) : (
                <div className="badge badge-error">Past</div>
              )}
            </div>

            {/* Overall Progress */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-base-content/60">Overall:</span>
              <div className="flex-1 h-2 bg-base-300 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    weekendProgress.progress === 100 ? 'bg-success' :
                    weekendProgress.progress > 0 ? 'bg-warning' : 'bg-base-300'
                  }`}
                  style={{ width: `${weekendProgress.progress || 0}%` }}
                />
              </div>
              <span className="text-xs font-medium">{weekendProgress.progress || 0}%</span>
            </div>

            {/* Weekend Parts */}
            <div className="space-y-2">
              {weekendParts.map((part) => (
                part.key === 'publicTalk' ? (
                  // Public Talk - no checkbox, just display
                  <div
                    key={part.key}
                    className="flex items-center gap-3 p-3 border border-base-300 rounded-lg bg-base-100"
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <Book className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{part.title}</p>
                      <p className="text-xs text-base-content/60">{part.duration} minutes</p>
                    </div>
                  </div>
                ) : (
                  // Watchtower Study - with checkbox
                  <label
                    key={part.key}
                    className="flex items-center gap-3 p-3 border border-base-300 rounded-lg hover:bg-base-200 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={part.completed}
                      onChange={(e) => handlePartToggle('weekend', part.key, e.target.checked)}
                      className="checkbox checkbox-primary"
                    />
                    <div className="flex-1">
                      <p className={`font-medium ${part.completed ? 'line-through text-base-content/50' : ''}`}>
                        {part.title}
                      </p>
                      <p className="text-xs text-base-content/60">{part.duration} minutes</p>
                    </div>
                    {part.completed && <Check className="w-5 h-5 text-success" />}
                  </label>
                )
              ))}
            </div>

            <a
              href={JW_ORG_SECTIONS.watchtowerStudy}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm w-full"
            >
              <ExternalLink className="w-4 h-4" />
              View Watchtower Study
            </a>

            {!isWeekendPrepared && weekendProgress.progress < 100 && (
              <button
                onClick={() => handleMarkAllComplete('weekend')}
                className="btn btn-primary btn-sm w-full"
              >
                <Check className="w-4 h-4" />
                Mark All Complete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetingCard;
