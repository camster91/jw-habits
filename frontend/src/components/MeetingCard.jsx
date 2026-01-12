import { useState, useEffect } from 'react';
import { Calendar, Check, Clock, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import useProgressStore from '../stores/progressStore';
import { meetingsAPI } from '../api/client';

function MeetingCard() {
  const [activeTab, setActiveTab] = useState('midweek');
  const [meetingData, setMeetingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get current week
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  const weekOf = format(weekStart, 'yyyy-MM-dd');

  // Get meeting dates
  const midweekDate = format(addDays(weekStart, 2), 'EEEE, MMMM d'); // Wednesday
  const weekendDate = format(addDays(weekStart, 5), 'EEEE, MMMM d'); // Saturday

  const { isMeetingPrepared, markMeetingPrepared } = useProgressStore();
  const isMidweekPrepared = isMeetingPrepared(weekOf, 'midweek');
  const isWeekendPrepared = isMeetingPrepared(weekOf, 'weekend');

  // Fetch meeting data from API
  useEffect(() => {
    async function fetchMeetingData() {
      try {
        setLoading(true);
        setError(null);
        const data = await meetingsAPI.getCurrent();
        setMeetingData(data);
      } catch (err) {
        console.error('Failed to fetch meeting data:', err);
        setError(err.message);
        // Set fallback data
        setMeetingData({
          weekOf: format(weekStart, 'MMMM d') + ' - ' + format(addDays(weekStart, 6), 'MMMM d, yyyy'),
          bibleReading: 'Genesis 17-18',
          songs: [1, 25, 103, 45, 72, 133],
          midweekMeeting: {
            theme: 'Appreciating God\'s Mercy',
            parts: []
          },
          weekendMeeting: {
            publicTalk: 'Why We Can Trust the Bible',
            watchtowerArticle: 'Love Bears All Things'
          }
        });
      } finally {
        setLoading(false);
      }
    }

    fetchMeetingData();
  }, [weekStart]);

  const handleMarkPrepared = (meetingType) => {
    markMeetingPrepared(weekOf, meetingType, 30); // 30 minutes study time
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

  // Loading state
  if (loading) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm text-base-content/70">Loading meetings...</p>
        </div>
      </div>
    );
  }

  // Get songs for each meeting (first 3 for midweek, last 3 for weekend)
  const midweekSongs = meetingData?.songs?.slice(0, 3) || [1, 25, 103];
  const weekendSongs = meetingData?.songs?.slice(3, 6) || [45, 72, 133];

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-accent" />
          <h2 className="card-title text-lg">This Week's Meetings</h2>
        </div>

        <p className="text-xs text-base-content/60">{meetingData?.weekOf}</p>

        {error && (
          <div className="alert alert-warning py-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">Using offline data</span>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs tabs-boxed mt-4">
          <button
            className={`tab ${activeTab === 'midweek' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('midweek')}
          >
            📘 Midweek
            {isMidweekPrepared && <Check className="w-4 h-4 ml-1 text-success" />}
          </button>
          <button
            className={`tab ${activeTab === 'weekend' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('weekend')}
          >
            🗼 Weekend
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
              {meetingData?.midweekMeeting?.theme && (
                <p className="text-sm font-medium text-accent mb-2">
                  {meetingData.midweekMeeting.theme}
                </p>
              )}
              <p className="text-sm text-base-content/70 mt-1">
                Bible Reading: {meetingData?.bibleReading || 'Genesis 17-18'}
              </p>
              <p className="text-sm text-base-content/70">
                Songs: {midweekSongs.join(', ')}
              </p>

              {/* Show meeting parts if available */}
              {meetingData?.midweekMeeting?.parts && meetingData.midweekMeeting.parts.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold text-base-content/70">Program Highlights:</p>
                  {meetingData.midweekMeeting.parts.slice(0, 3).map((part, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-base-content/60">{part.title}</span>
                      <span className="text-base-content/50">{part.time}</span>
                    </div>
                  ))}
                  {meetingData.midweekMeeting.parts.length > 3 && (
                    <p className="text-xs text-base-content/50 italic">
                      +{meetingData.midweekMeeting.parts.length - 3} more parts
                    </p>
                  )}
                </div>
              )}
            </div>

            <a
              href={meetingData?.sourceUrl || `https://wol.jw.org/en/wol/meetings/r1/lp-e/${new Date().getFullYear()}/${meetingData?.weekNumber || 2}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm w-full"
            >
              <ExternalLink className="w-4 h-4" />
              View Full Schedule on WOL
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
                <p className="text-sm text-base-content/70">5:00 PM</p>
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
              {meetingData?.weekendMeeting?.publicTalk && (
                <div>
                  <p className="text-xs text-base-content/60">Public Talk (30 min)</p>
                  <p className="text-sm font-medium">{meetingData.weekendMeeting.publicTalk}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-base-content/60">Watchtower Study (60 min)</p>
                <p className="text-sm font-medium text-accent">
                  {meetingData?.weekendMeeting?.watchtowerArticle || 'Love Bears All Things'}
                </p>
              </div>

              <p className="text-sm text-base-content/70">
                Songs: {weekendSongs.join(', ')}
              </p>
            </div>

            <a
              href={meetingData?.sourceUrl || `https://wol.jw.org/en/wol/meetings/r1/lp-e/${new Date().getFullYear()}/${meetingData?.weekNumber || 2}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm w-full"
            >
              <ExternalLink className="w-4 h-4" />
              Read Watchtower Article
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
