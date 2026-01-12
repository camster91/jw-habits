import { useState, useEffect } from 'react';
import { getDayOfYear } from 'date-fns';
import { Book, Check, ExternalLink, Clock, Loader2, AlertCircle } from 'lucide-react';
import useProgressStore from '../stores/progressStore';
import { bibleReadingAPI } from '../api/client';

function BibleReadingCard() {
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const dayOfYear = getDayOfYear(new Date());
  const { isBibleReadingComplete, markBibleReadingComplete } = useProgressStore();
  const isComplete = isBibleReadingComplete(dayOfYear);

  // Fetch Bible reading from API
  useEffect(() => {
    async function fetchBibleReading() {
      try {
        setLoading(true);
        setError(null);
        const data = await bibleReadingAPI.getToday();
        setReading(data);
      } catch (err) {
        console.error('Failed to fetch Bible reading:', err);
        setError(err.message);
        // Set fallback data
        setReading({
          dayOfYear,
          reading: 'Genesis 26-28',
          estimatedMinutes: 12,
          wolUrl: 'https://wol.jw.org/en/wol/binav/r1/lp-e'
        });
      } finally {
        setLoading(false);
      }
    }

    fetchBibleReading();
  }, [dayOfYear]);

  const handleMarkComplete = () => {
    markBibleReadingComplete(dayOfYear);
  };

  // Loading state
  if (loading) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center">
          <Loader2 className="w-8 h-8 animate-spin text-secondary" />
          <p className="text-sm text-base-content/70">Loading Bible reading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Book className="w-6 h-6 text-secondary" />
            <h2 className="card-title text-lg">Bible Reading</h2>
          </div>
          {isComplete && (
            <div className="badge badge-success gap-2">
              <Check className="w-4 h-4" />
              Complete
            </div>
          )}
        </div>

        <p className="text-sm text-base-content/70">Day {dayOfYear} of 365</p>

        {error && (
          <div className="alert alert-warning py-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">Using offline data</span>
          </div>
        )}

        <div className="divider my-2"></div>

        <div className="space-y-3">
          <div>
            <p className="text-2xl font-bold text-secondary">{reading?.reading}</p>
            {reading?.scripture && (
              <p className="text-xs text-base-content/60 mt-1">{reading.scripture}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Clock className="w-4 h-4 text-base-content/60" />
              <p className="text-sm text-base-content/70">
                ~{reading?.estimatedMinutes || 10} minutes
              </p>
            </div>
          </div>

          <a
            href={reading?.wolUrl || 'https://wol.jw.org/en/wol/binav/r1/lp-e'}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm w-full"
          >
            <ExternalLink className="w-4 h-4" />
            Open in WOL
          </a>
        </div>

        <div className="card-actions justify-end mt-4">
          {!isComplete && (
            <button
              onClick={handleMarkComplete}
              className="btn btn-secondary btn-sm"
            >
              <Check className="w-4 h-4" />
              Mark Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BibleReadingCard;
