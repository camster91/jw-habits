import { useState, useEffect } from 'react';
import { Book, Check, CheckCircle2, ExternalLink, Clock, Flame } from 'lucide-react';
import useProgressStore from '../stores/progressStore';
import useGamificationStore from '../stores/gamificationStore';
import { getISOWeekString, loadMeetingWorkbooks, BIBLE_BOOKS } from '../utils/jwLibraryLinks';
import { haptics } from '../utils/native';

/**
 * Parse a Bible reading string like "Genesis 4-7" into individual chapters
 * Handles formats: "Genesis 4-7", "Psalm 1-5", "1 Corinthians 1-3", single chapter "Obadiah 1"
 */
function parseChapters(readingStr) {
  if (!readingStr) return [];

  // Match: optional number prefix, book name, chapter range
  const match = readingStr.match(/^([\d\s]*[A-Za-z\s]+?)\s+(\d+)(?:\s*[-–]\s*(\d+))?$/);
  if (!match) {
    // Single-chapter book (e.g., just "Obadiah")
    return [readingStr];
  }

  const book = match[1].trim();
  const start = parseInt(match[2]);
  const end = match[3] ? parseInt(match[3]) : start;

  return Array.from({ length: end - start + 1 }, (_, i) => `${book} ${start + i}`);
}

/**
 * Generate a JW Library link for a specific chapter
 */
function getChapterLink(chapterStr) {
  const match = chapterStr.match(/^([\d\s]*[A-Za-z\s]+?)\s+(\d+)$/);
  if (!match) return null;

  const bookName = match[1].trim().toLowerCase();
  const chapter = parseInt(match[2]);
  const bookNum = BIBLE_BOOKS[bookName];

  if (!bookNum) return null;

  const bookStr = String(bookNum).padStart(2, '0');
  const chapterStr2 = String(chapter).padStart(3, '0');
  return `jwlibrary:///finder?wtlocale=E&bible=${bookStr}${chapterStr2}001-${bookStr}${chapterStr2}999&pub=nwtsty`;
}

function WeeklyBibleReading() {
  const [weekData, setWeekData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const weekKey = getISOWeekString(new Date());

  const {
    getWeeklyReadingProgress,
    toggleWeeklyChapter,
    isWeeklyReadingComplete,
    markWeeklyReadingComplete,
    getWeeklyReadingStreak,
  } = useProgressStore();

  const { recordBibleReading } = useGamificationStore();

  // Load workbook data
  useEffect(() => {
    async function loadData() {
      try {
        const workbooks = await loadMeetingWorkbooks();
        setWeekData(workbooks[weekKey] || null);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [weekKey]);

  if (loading) {
    return (
      <article className="card bg-base-100 shadow-sm rounded-2xl overflow-hidden">
        <div className="card-body items-center py-8">
          <div className="loading loading-spinner loading-md text-secondary"></div>
          <p className="text-sm text-base-content/50">Loading reading...</p>
        </div>
      </article>
    );
  }

  if (loadError || !weekData || !weekData.bibleReading) {
    return (
      <article className="card bg-base-100 shadow-sm rounded-2xl overflow-hidden">
        <div className="card-body items-center py-8">
          <Book className="w-8 h-8 text-base-content/30" />
          <p className="text-sm text-base-content/50">No weekly reading data available</p>
        </div>
      </article>
    );
  }

  const readingStr = weekData.bibleReading;
  const chapters = parseChapters(readingStr);
  const progress = getWeeklyReadingProgress(weekKey);
  const completedChapters = chapters.filter((_, i) => progress.chapters?.[i]);
  const percentage = chapters.length > 0 ? Math.round((completedChapters.length / chapters.length) * 100) : 0;
  const isComplete = isWeeklyReadingComplete(weekKey, chapters.length);
  const streak = getWeeklyReadingStreak();

  const handleChapterToggle = (index) => {
    haptics.light();
    toggleWeeklyChapter(weekKey, index);

    // Check if all chapters will be complete after this toggle
    const newState = { ...progress.chapters, [index]: !progress.chapters?.[index] };
    const allComplete = chapters.every((_, i) => newState[i]);
    if (allComplete) {
      setTimeout(() => {
        haptics.success();
        markWeeklyReadingComplete(weekKey, chapters.length);
        recordBibleReading();
      }, 100);
    }
  };

  const handleMarkAllComplete = () => {
    haptics.success();
    markWeeklyReadingComplete(weekKey, chapters.length);
    recordBibleReading();
  };

  // Get full reading link (first chapter to last)
  const fullReadingLink = chapters.length > 0 ? getChapterLink(chapters[0]) : null;

  return (
    <article className="card bg-base-100 shadow-sm rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${isComplete ? 'bg-success/10' : 'bg-secondary/10'}`}>
            <Book className={`w-6 h-6 ${isComplete ? 'text-success' : 'text-secondary'}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">Weekly Bible Reading</h3>
            <p className="text-sm text-base-content/50">{weekData.weekOf || weekKey}</p>
          </div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div className="badge badge-warning gap-1">
                <Flame className="w-3 h-3 animate-flame" />
                {streak}w
              </div>
            )}
            {isComplete ? (
              <CheckCircle2 className="w-6 h-6 text-success" />
            ) : (
              <span className="text-lg font-bold text-secondary">{percentage}%</span>
            )}
          </div>
        </div>

        {/* Reading info */}
        <div className="mt-3 p-3 bg-base-200/50 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg text-secondary">{readingStr}</p>
              <div className="flex items-center gap-1 text-sm text-base-content/50 mt-1">
                <Clock className="w-4 h-4" />
                <span>{chapters.length} chapters</span>
              </div>
            </div>
            {fullReadingLink && (
              <a
                href={fullReadingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm gap-1"
                onClick={() => haptics.light()}
              >
                <ExternalLink className="w-4 h-4" />
                JW Library
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Chapter checkboxes */}
      <div className="px-4 pb-4">
        <p className="text-xs text-base-content/50 mb-2 font-medium">Mark chapters as complete</p>
        <div className="grid grid-cols-4 gap-2">
          {chapters.map((chapter, index) => {
            const isChapterComplete = progress.chapters?.[index];
            // Extract just the chapter number for display
            const chapterNum = chapter.match(/(\d+)$/)?.[1] || chapter;
            const chapterLink = getChapterLink(chapter);

            return (
              <div key={index} className="relative">
                <button
                  onClick={() => handleChapterToggle(index)}
                  className={`w-full py-3 px-2 rounded-xl font-medium text-sm transition-all active:scale-95 flex items-center justify-center gap-1 ${
                    isChapterComplete
                      ? 'bg-success text-white'
                      : 'bg-base-200 text-base-content/60'
                  }`}
                >
                  {isChapterComplete && <Check className="w-3 h-3" />}
                  Ch. {chapterNum}
                </button>
                {chapterLink && !isChapterComplete && (
                  <a
                    href={chapterLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-white rounded-full flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-base-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${isComplete ? 'bg-success' : 'bg-secondary'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {isComplete ? (
          <div className="mt-3 flex items-center justify-center gap-2 text-success text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Weekly reading complete!
          </div>
        ) : percentage > 0 && percentage < 100 ? (
          <button
            onClick={handleMarkAllComplete}
            className="btn btn-ghost btn-sm w-full mt-2 text-secondary"
          >
            <Check className="w-4 h-4" />
            Mark All Complete
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default WeeklyBibleReading;
