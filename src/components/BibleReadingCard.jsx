import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Book, ExternalLink, Clock, CheckCircle2, Check, Settings2, RotateCcw, ChevronRight } from 'lucide-react';
import { haptics } from '../utils/native';
import useProgressStore from '../stores/progressStore';
import useGamificationStore from '../stores/gamificationStore';
import useSettingsStore, { READING_PACE_OPTIONS } from '../stores/settingsStore';
import BIBLE_READING_SCHEDULE, { getBibleReading, getChaptersList, getBibleChapterLink } from '../utils/bibleReadingSchedule';

function BibleReadingCard({ effectiveScheduleDay, bibleReadingSchedule }) {
  const { t } = useTranslation();
  const [showReadingSettings, setShowReadingSettings] = useState(false);
  const [selectedBook, setSelectedBook] = useState('');

  // Defensive: if no schedule day was passed, compute today's calendar day of year
  // so we don't store chapter progress under the literal key "undefined".
  const fallbackScheduleDay = useMemo(() => {
    if (effectiveScheduleDay) return effectiveScheduleDay;
    const start = new Date(new Date().getFullYear(), 0, 0);
    const diff = new Date().getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [effectiveScheduleDay]);
  const safeScheduleDay = fallbackScheduleDay;

  const {
    getBibleChapterProgress,
    toggleBibleChapter,
    isBibleReadingComplete,
  } = useProgressStore();

  const { recordBibleReading } = useGamificationStore();

  const {
    setBibleReadingStartDay,
    setBibleReadingPace,
    resetBibleReadingSchedule,
  } = useSettingsStore();

  const todayReading = getBibleReading(safeScheduleDay);
  const chapters = getChaptersList(todayReading.chapters);
  const chapterProgress = getBibleChapterProgress(safeScheduleDay);
  const completedChapters = chapters.filter((_, i) => chapterProgress[i]);
  const bibleProgress = Math.round((completedChapters.length / chapters.length) * 100);
  const isBibleComplete = isBibleReadingComplete(safeScheduleDay);

  // Get unique books from schedule for the dropdown
  const uniqueBooks = [...new Set(BIBLE_READING_SCHEDULE.filter(r => !r.isReview).map(r => r.book))];

  // Get schedule entries for a selected book
  const getBookScheduleEntries = (bookName) => {
    return BIBLE_READING_SCHEDULE.filter(r => r.book === bookName && !r.isReview);
  };

  const handleSetCustomStart = (scheduleDay) => {
    haptics.medium();
    setBibleReadingStartDay(scheduleDay);
    setShowReadingSettings(false);
    setSelectedBook('');
  };

  const handleResetSchedule = () => {
    haptics.medium();
    resetBibleReadingSchedule();
    setShowReadingSettings(false);
    setSelectedBook('');
  };

  const handleChapterToggle = (index) => {
    haptics.light();
    toggleBibleChapter(safeScheduleDay, index);

    // Check if all chapters are now complete
    const newProgress = { ...chapterProgress, [index]: !chapterProgress[index] };
    const allComplete = chapters.every((_, i) => newProgress[i]);
    if (allComplete) {
      setTimeout(() => {
        haptics.success();
        recordBibleReading();
      }, 100);
    }
  };

  return (
    <article className="ios-grouped">
      {/* Header row */}
      <div className="ios-row">
        <div className="ios-icon jw-gold">
          <Book className="w-4 h-4" />
        </div>
        <div className="body">
          <div className="title">{t('bibleReading.heading')}</div>
          <div className="sub">
            {t('bibleReading.day', { num: effectiveScheduleDay })} — {todayReading.book} {todayReading.chapters}
          </div>
        </div>
        <button
          onClick={() => {
            haptics.light();
            setShowReadingSettings(!showReadingSettings);
          }}
          className="p-2 -mr-2"
          aria-label="Reading settings"
        >
          <Settings2 className="w-5 h-5 text-base-content/70" />
        </button>
        {isBibleComplete ? (
          <CheckCircle2 className="w-6 h-6 text-success" />
        ) : (
          <span className="text-xl font-bold" style={{ color: '#3F7020' }}>{bibleProgress}%</span>
        )}
      </div>

      {/* Reading Settings Panel */}
      {showReadingSettings && (
        <div className="px-4 pb-4">
          <div className="bg-base-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-sm">{t('bibleReading.readingScheduleSettings')}</h4>
              {bibleReadingSchedule?.useCustomSchedule && (
                <button
                  onClick={handleResetSchedule}
                  className="btn btn-ghost btn-sm gap-1.5 text-warning"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('bibleReading.reset')}
                </button>
              )}
            </div>

            {/* Pace Selector */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-base-content/70 uppercase tracking-wide mb-2">{t('bibleReading.readingPace')}</p>
              <div className="grid grid-cols-4 gap-2">
                {READING_PACE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      haptics.light();
                      setBibleReadingPace(option.value);
                    }}
                    className={`py-2.5 px-1 rounded-xl text-center transition-all active:scale-95 shadow-sm ${
                      (bibleReadingSchedule?.readingPace || 1) === option.value
                        ? 'bg-primary text-primary-content shadow-primary/25'
                        : 'bg-base-100 hover:bg-base-100/80'
                    }`}
                  >
                    <div className="font-bold text-sm">{option.label}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="divider my-0 text-xs font-medium text-base-content/70">{t('bibleReading.startingPoint')}</div>

            <p className="text-xs text-base-content/70 mb-3 mt-3">
              {t('bibleReading.customizeHint')}
            </p>

            {/* Book Selector */}
            <div className="mb-3">
              <select
                className="select select-bordered w-full font-medium"
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
              >
                <option value="">{t('bibleReading.chooseBook')}</option>
                {uniqueBooks.map((book) => (
                  <option key={book} value={book}>{book}</option>
                ))}
              </select>
            </div>

            {/* Chapter/Day Selector - shows when book is selected */}
            {selectedBook && (
              <div className="bg-base-100 rounded-xl p-2 max-h-52 overflow-y-auto">
                <div className="space-y-1.5">
                  {getBookScheduleEntries(selectedBook).map((entry) => (
                    <button
                      key={entry.day}
                      onClick={() => handleSetCustomStart(entry.day)}
                      className="flex items-center justify-between w-full p-3 bg-base-200/50 rounded-xl hover:bg-primary/10 active:scale-[0.98] transition-all text-left"
                    >
                      <div>
                        <span className="font-semibold text-sm">{entry.book} {entry.chapters}</span>
                        <span className="text-xs text-base-content/70 ml-2 bg-base-300/50 px-1.5 py-0.5 rounded">~{entry.time} {t('bibleReading.min')}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-base-content/70" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {bibleReadingSchedule?.useCustomSchedule && (
              <div className="mt-4 p-3 bg-success/10 rounded-xl text-sm text-success flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>
                  Started from Day {bibleReadingSchedule.startingScheduleDay} on {new Date(bibleReadingSchedule.customStartDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reading info row */}
      <div className="ios-row">
        <div className="ios-icon jw-gold">
          <Clock className="w-4 h-4" />
        </div>
        <div className="body">
          <div className="title">{todayReading.book} {todayReading.chapters}</div>
          <div className="sub">~{todayReading.time} {t('bibleReading.minutes')}</div>
        </div>
        <a
          href={getBibleChapterLink(todayReading.book, parseInt(todayReading.chapters.split('-')[0]) || 1)}
          target="_blank"
          rel="noopener noreferrer"
          className="ios-row min-h-[44px] gap-2 px-3"
          onClick={() => haptics.light()}
        >
          <ExternalLink className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary font-medium">{t('bibleReading.openInLibrary')}</span>
          <ChevronRight className="ios-chev ml-auto" />
        </a>
      </div>

      {/* Chapter buttons as iOS rows */}
      {chapters.map((chapter, index) => {
        const isComplete = chapterProgress[index];
        return (
          <button
            key={index}
            onClick={() => handleChapterToggle(index)}
            className={`ios-row w-full text-left ${isComplete ? 'done' : ''}`}
          >
            <div className={`ios-icon ${isComplete ? 'green' : 'jw-gold'}`}>
              {isComplete ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <span className="text-xs font-bold text-white">{index + 1}</span>
              )}
            </div>
            <div className="body">
              <div className="title">{chapter}</div>
            </div>
            <div className={`ios-check ${isComplete ? 'done' : ''}`}>
              {isComplete && <Check className="w-3.5 h-3.5" />}
            </div>
          </button>
        );
      })}

      {/* Progress bar */}
      <div className="px-4 pb-4">
        <div className="h-2 bg-base-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${isBibleComplete ? 'bg-success' : 'bg-secondary'}`}
            style={{ width: `${bibleProgress}%` }}
          />
        </div>
        {isBibleComplete && (
          <div className="mt-3 flex items-center justify-center gap-2 text-success text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            {t('bibleReading.complete')}
          </div>
        )}
      </div>
    </article>
  );
}

export default BibleReadingCard;