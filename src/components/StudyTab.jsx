import { useState, useEffect } from 'react';
import { GraduationCap, Book, ExternalLink, Check, Clock } from 'lucide-react';
import { getDayOfYear } from 'date-fns';
import useProgressStore from '../stores/progressStore';
import { getTodaysBibleReading, JW_ORG_SECTIONS } from '../utils/jwLibraryLinks';

const STUDY_RESOURCES = [
  {
    id: 'enjoy-life',
    title: 'Enjoy Life Forever!',
    description: 'Interactive Bible course',
    url: JW_ORG_SECTIONS.bibleStudy || 'https://www.jw.org/en/bible-teachings/guided-bible-study-course/',
    color: 'text-primary',
  },
  {
    id: 'pure-worship',
    title: 'Pure Worship Restored',
    description: 'Deep study of Ezekiel',
    url: 'https://www.jw.org/en/library/books/pure-worship/',
    color: 'text-secondary',
  },
  {
    id: 'insight',
    title: 'Insight on the Scriptures',
    description: 'Bible encyclopedia',
    url: 'https://www.jw.org/en/library/books/Insight-on-the-Scriptures/',
    color: 'text-accent',
  },
];

function StudyTab() {
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);

  const dayOfYear = getDayOfYear(new Date());
  const {
    isBibleReadingComplete,
    markBibleReadingComplete,
    getBibleReadingProgress,
    updateBibleReadingProgress,
  } = useProgressStore();

  const isComplete = isBibleReadingComplete(dayOfYear);
  const currentProgress = getBibleReadingProgress(dayOfYear);

  useEffect(() => {
    async function loadReading() {
      try {
        setLoading(true);
        const data = await getTodaysBibleReading();
        setReading(data);
      } catch (err) {
        console.error('Failed to load Bible reading:', err);
        setReading({ day: dayOfYear, reading: 'Genesis 1-3', link: null });
      } finally {
        setLoading(false);
      }
    }
    loadReading();
  }, [dayOfYear]);

  const handleProgressChange = (e) => {
    updateBibleReadingProgress(dayOfYear, parseInt(e.target.value));
  };

  const parseChapters = (readingText) => {
    if (!readingText) return [];
    const match = readingText.match(/(\d+)-?(\d+)?/);
    if (!match) return [];
    const start = parseInt(match[1]);
    const end = match[2] ? parseInt(match[2]) : start;
    const chapters = [];
    for (let i = start; i <= end; i++) chapters.push(i);
    return chapters;
  };

  const estimateReadingTime = (readingText) => {
    if (!readingText) return 10;
    const chapters = parseChapters(readingText);
    return chapters.length * 4 || 10;
  };

  const chapters = parseChapters(reading?.reading);

  return (
    <div className="space-y-4">
      {/* Bible Reading Card */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Book className="w-5 h-5 text-secondary" />
              <h3 className="font-semibold">Daily Bible Reading</h3>
            </div>
            {isComplete ? (
              <div className="badge badge-success badge-sm gap-1">
                <Check className="w-3 h-3" />
                Complete
              </div>
            ) : (
              <span className="text-xs text-base-content/60">Day {dayOfYear}</span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="loading loading-spinner loading-sm"></div>
            </div>
          ) : (
            <>
              <div className="mt-3">
                <p className="text-xl font-bold text-secondary">{reading?.reading}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-base-content/60" />
                  <span className="text-xs text-base-content/60">
                    ~{estimateReadingTime(reading?.reading)} minutes
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-xs text-base-content/60">
                  <span>Progress</span>
                  <span>{currentProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={currentProgress}
                  onChange={handleProgressChange}
                  className={`range range-sm ${
                    currentProgress === 100 ? 'range-success' : 'range-secondary'
                  }`}
                />
              </div>

              {/* Chapter Pills */}
              {chapters.length > 1 && (
                <div className="flex flex-wrap gap-1 mt-2">
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

              <div className="flex gap-2 mt-3">
                {reading?.link && (
                  <a
                    href={reading.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-secondary btn-sm flex-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open in JW Library
                  </a>
                )}
                {!isComplete && (
                  <button
                    onClick={() => markBibleReadingComplete(dayOfYear)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Check className="w-3 h-3" />
                    Done
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Study Resources */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Study Resources</h3>
          </div>

          <div className="space-y-2">
            {STUDY_RESOURCES.map((resource) => (
              <a
                key={resource.id}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 transition-colors"
              >
                <Book className={`w-5 h-5 ${resource.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{resource.title}</p>
                  <p className="text-xs text-base-content/60">{resource.description}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-base-content/40" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudyTab;
