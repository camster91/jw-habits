import { useState, useEffect } from 'react';
import { getDayOfYear } from 'date-fns';
import { Book, Check, ExternalLink, Clock } from 'lucide-react';
import useProgressStore from '../stores/progressStore';
import { getTodaysBibleReading } from '../utils/jwLibraryLinks';

function BibleReadingCard() {
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);

  const dayOfYear = getDayOfYear(new Date());
  const {
    isBibleReadingComplete,
    markBibleReadingComplete,
    getBibleReadingProgress,
    updateBibleReadingProgress
  } = useProgressStore();

  const isComplete = isBibleReadingComplete(dayOfYear);
  const currentProgress = getBibleReadingProgress(dayOfYear);

  // Load Bible reading from static JSON
  useEffect(() => {
    async function loadReading() {
      try {
        setLoading(true);
        const data = await getTodaysBibleReading();
        setReading(data);
      } catch (err) {
        console.error('Failed to load Bible reading:', err);
        setReading({
          day: dayOfYear,
          reading: 'Genesis 1-3',
          link: null
        });
      } finally {
        setLoading(false);
      }
    }

    loadReading();
  }, [dayOfYear]);

  const handleMarkComplete = () => {
    markBibleReadingComplete(dayOfYear);
  };

  const handleProgressChange = (e) => {
    const progress = parseInt(e.target.value);
    updateBibleReadingProgress(dayOfYear, progress);
  };

  // Parse chapters from reading text (e.g., "Genesis 1-3" -> [1, 2, 3])
  const parseChapters = (readingText) => {
    if (!readingText) return [];
    const match = readingText.match(/(\d+)-?(\d+)?/);
    if (!match) return [];
    const start = parseInt(match[1]);
    const end = match[2] ? parseInt(match[2]) : start;
    const chapters = [];
    for (let i = start; i <= end; i++) {
      chapters.push(i);
    }
    return chapters;
  };

  // Estimate reading time (~4 min per chapter)
  const estimateReadingTime = (readingText) => {
    if (!readingText) return 10;
    const chapters = parseChapters(readingText);
    return chapters.length * 4 || 10;
  };

  // Get progress color
  const getProgressColor = () => {
    if (currentProgress === 100) return 'range-success';
    if (currentProgress > 50) return 'range-warning';
    if (currentProgress > 0) return 'range-info';
    return 'range-primary';
  };

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center">
          <div className="loading loading-spinner loading-md text-secondary"></div>
          <p className="text-sm text-base-content/70">Loading...</p>
        </div>
      </div>
    );
  }

  const chapters = parseChapters(reading?.reading);

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Book className="w-6 h-6 text-secondary" />
            <h2 className="card-title text-lg">Bible Reading</h2>
          </div>
          {isComplete ? (
            <div className="badge badge-success gap-2">
              <Check className="w-4 h-4" />
              Complete
            </div>
          ) : currentProgress > 0 ? (
            <div className="badge badge-warning gap-1">
              {currentProgress}%
            </div>
          ) : null}
        </div>

        <p className="text-sm text-base-content/70">Day {dayOfYear} of 365</p>

        <div className="divider my-2"></div>

        <div className="space-y-3">
          <div>
            <p className="text-2xl font-bold text-secondary">{reading?.reading}</p>
            <div className="flex items-center gap-2 mt-2">
              <Clock className="w-4 h-4 text-base-content/60" />
              <p className="text-sm text-base-content/70">
                ~{estimateReadingTime(reading?.reading)} minutes
              </p>
            </div>
          </div>

          {/* Progress Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-base-content/70">Progress</span>
              <span className="text-sm font-medium">{currentProgress}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={currentProgress}
              onChange={handleProgressChange}
              className={`range range-sm ${getProgressColor()}`}
            />
            <div className="flex justify-between text-xs text-base-content/50 px-1">
              <span>Not started</span>
              <span>Half done</span>
              <span>Complete</span>
            </div>
          </div>

          {/* Chapter Pills */}
          {chapters.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {chapters.map((chapter, index) => {
                const chapterProgress = (index / chapters.length) * 100;
                const isRead = currentProgress > chapterProgress;
                return (
                  <span
                    key={chapter}
                    className={`badge badge-sm ${isRead ? 'badge-success' : 'badge-ghost'}`}
                  >
                    Ch. {chapter}
                  </span>
                );
              })}
            </div>
          )}

          {reading?.link && (
            <a
              href={reading.link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-secondary w-full"
            >
              <ExternalLink className="w-4 h-4" />
              Open in JW Library
            </a>
          )}
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
