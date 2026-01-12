import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { BookOpen, Check, Loader2, AlertCircle } from 'lucide-react';
import useProgressStore from '../stores/progressStore';
import { dailyTextAPI } from '../api/client';

function DailyTextCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dailyText, setDailyText] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const { isDailyTextRead, markDailyTextRead } = useProgressStore();
  const isRead = isDailyTextRead(today);

  // Fetch daily text from API
  useEffect(() => {
    async function fetchDailyText() {
      try {
        setLoading(true);
        setError(null);
        const data = await dailyTextAPI.getToday();
        setDailyText(data);
      } catch (err) {
        console.error('Failed to fetch daily text:', err);
        setError(err.message);
        // Set fallback data
        setDailyText({
          dateFormatted: format(new Date(), 'EEEE, MMMM d, yyyy'),
          scripture: 'Zephaniah 2:3',
          theme: 'Keep Seeking Jehovah',
          scriptureText: 'Seek Jehovah, all you meek ones of the earth...',
          text: 'Daily text currently unavailable. Please check back later.',
          commentary: ''
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDailyText();
  }, []);

  const handleMarkRead = () => {
    markDailyTextRead(today);
  };

  // Loading state
  if (loading) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-base-content/70">Loading daily text...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <h2 className="card-title text-lg">Daily Text</h2>
          </div>
          {isRead && (
            <div className="badge badge-success gap-2">
              <Check className="w-4 h-4" />
              Read
            </div>
          )}
        </div>

        <p className="text-sm text-base-content/70">{dailyText?.dateFormatted}</p>

        {error && (
          <div className="alert alert-warning">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">Using offline data</span>
          </div>
        )}

        <div className="divider my-2"></div>

        <div className="space-y-3">
          <div>
            <p className="font-semibold text-primary">"{dailyText?.theme}"</p>
            <p className="text-sm italic">— {dailyText?.scripture}</p>
          </div>

          {isExpanded && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {dailyText?.scriptureText && (
                <p className="text-sm font-medium">{dailyText.scriptureText}</p>
              )}
              {dailyText?.text && <p className="text-sm">{dailyText.text}</p>}
              {dailyText?.commentary && (
                <p className="text-sm text-base-content/80">{dailyText.commentary}</p>
              )}
            </div>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn btn-ghost btn-sm w-full"
          >
            {isExpanded ? 'Show Less' : 'Read More'}
          </button>
        </div>

        <div className="card-actions justify-end mt-4">
          {!isRead && (
            <button
              onClick={handleMarkRead}
              className="btn btn-primary btn-sm"
            >
              <Check className="w-4 h-4" />
              Mark as Read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DailyTextCard;
