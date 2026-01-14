import { useState, useEffect } from 'react';
import { Calendar, Check, Clock, ExternalLink } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import useProgressStore from '../stores/progressStore';
import { getWorkbookForWeek, getMeetingWorkbookLink, JW_ORG_SECTIONS } from '../utils/jwLibraryLinks';

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

  const { isMeetingPrepared, markMeetingPrepared } = useProgressStore();
  const isMidweekPrepared = isMeetingPrepared(weekOf, 'midweek');
  const isWeekendPrepared = isMeetingPrepared(weekOf, 'weekend');

  // Load workbook data from static JSON
  useEffect(() => {
    async function loadWorkbook() {
      try {
        setLoading(true);
        const data = await getWorkbookForWeek(new Date());
        setWorkbookData(data);
      } catch (err) {
        console.error('Failed to load workbook data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadWorkbook();
  }, []);

  const handleMarkPrepared = (meetingType) => {
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

            <div>
              <p className="text-sm text-base-content/70">
                Bible Reading: {workbookData?.bibleReading || 'See workbook'}
              </p>
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

            {!isMidweekPrepared && (
              <button
                onClick={() => handleMarkPrepared('midweek')}
                className="btn btn-primary btn-sm w-full"
              >
                <Check className="w-4 h-4" />
                Mark as Prepared
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

            <div className="space-y-2">
              <div>
                <p className="text-xs text-base-content/60">Public Talk</p>
                <p className="text-sm">30 minutes</p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Watchtower Study</p>
                <p className="text-sm">60 minutes</p>
              </div>
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

            {!isWeekendPrepared && (
              <button
                onClick={() => handleMarkPrepared('weekend')}
                className="btn btn-primary btn-sm w-full"
              >
                <Check className="w-4 h-4" />
                Mark as Prepared
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetingCard;
