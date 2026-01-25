import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { BookOpen, Newspaper, Check, ExternalLink, ChevronRight, Sparkles, CheckCircle2, Flame, PenLine, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useProgressStore from '../stores/progressStore';
import useNewsStore from '../stores/newsStore';
import useMemoriesStore from '../stores/memoriesStore';
import useGamificationStore from '../stores/gamificationStore';
import { getDailyTextLink } from '../utils/jwLibraryLinks';
import { haptics } from '../utils/native';

function DailyTasksSection() {
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Local state for notes
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  // Daily Text state
  const {
    isDailyTextRead,
    getDailyTextProgress,
    updateDailyTextProgress,
  } = useProgressStore();

  const dailyTextProgress = getDailyTextProgress(today);
  const isDailyTextComplete = isDailyTextRead(today);
  const dailyTextLink = getDailyTextLink(new Date());

  // News state
  const { fetchNews, getLatestItems, getUnreadCount, markAsRead, isItemRead } = useNewsStore();
  const latestNews = getLatestItems(3);
  const unreadCount = getUnreadCount();

  // Memories state
  const { saveReflection, getReflection } = useMemoriesStore();

  // Gamification state
  const { currentStreak, recordDailyTextCompletion, recordReflection, recordNewsRead } = useGamificationStore();

  // Load existing reflection on mount
  const existingReflection = getReflection(today);
  useEffect(() => {
    if (existingReflection && !noteText) {
      setNoteText(existingReflection);
      setNoteSaved(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewsClick = (item) => {
    haptics.light();
    markAsRead(item.id);
    recordNewsRead();
    window.open(item.url, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleDailyTextCheck = (field) => {
    haptics.light();
    const newValue = !dailyTextProgress[field];
    updateDailyTextProgress(today, field, newValue);

    // Check if completing all tasks
    const newProgress = { ...dailyTextProgress, [field]: newValue };
    if (newProgress.readScripture && newProgress.meditated) {
      setTimeout(() => {
        haptics.success();
        recordDailyTextCompletion();
      }, 100);
    }
  };

  const handleSaveNote = () => {
    if (noteText.trim()) {
      haptics.success();
      saveReflection(today, noteText.trim());
      setNoteSaved(true);
      if (!existingReflection) {
        recordReflection();
      }
    }
  };

  const handleViewNews = () => {
    haptics.light();
    navigate('/news');
  };

  // Calculate overall progress
  const dailyTextDone = dailyTextProgress.readScripture && dailyTextProgress.meditated;

  return (
    <div className="space-y-3">
      {/* Streak Banner */}
      {currentStreak > 0 && (
        <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl text-white">
          <Flame className="w-5 h-5" />
          <span className="font-bold">{currentStreak} Day Streak!</span>
          <Flame className="w-5 h-5" />
        </div>
      )}

      {/* Progress Overview */}
      {dailyTextDone && (
        <div className="flex items-center justify-center gap-2 p-4 bg-success/10 rounded-2xl text-success">
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">Daily Text complete!</span>
        </div>
      )}

      {/* Daily Text Card */}
      <article className="card bg-base-100 shadow-sm rounded-2xl overflow-hidden">
        {/* Header - tappable to open JW Library */}
        <a
          href={dailyTextLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 active:bg-base-200 transition-colors"
          onClick={() => haptics.light()}
        >
          <div className={`p-3 rounded-2xl ${isDailyTextComplete ? 'bg-success/10' : 'bg-primary/10'}`}>
            <BookOpen className={`w-6 h-6 ${isDailyTextComplete ? 'text-success' : 'text-primary'}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">Daily Text</h3>
            <p className="text-sm text-base-content/50">Scripture & meditation</p>
          </div>
          {isDailyTextComplete ? (
            <CheckCircle2 className="w-6 h-6 text-success" />
          ) : (
            <ExternalLink className="w-5 h-5 text-base-content/30" />
          )}
        </a>

        {/* Checklist - 2 items now */}
        <div className="px-4 pb-3 space-y-2">
          {[
            { field: 'readScripture', label: 'Read Scripture & Comments' },
            { field: 'meditated', label: 'Meditated & Applied' },
          ].map(({ field, label }) => (
            <button
              key={field}
              onClick={() => handleDailyTextCheck(field)}
              className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all active:scale-[0.98] ${
                dailyTextProgress[field]
                  ? 'bg-success/10'
                  : 'bg-base-200/50 active:bg-base-200'
              }`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                dailyTextProgress[field]
                  ? 'bg-success border-success'
                  : 'border-base-content/20'
              }`}>
                {dailyTextProgress[field] && <Check className="w-4 h-4 text-white" />}
              </div>
              <span className={`font-medium ${dailyTextProgress[field] ? 'text-success' : ''}`}>
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Notes Toggle */}
        <button
          onClick={() => {
            haptics.light();
            setShowNotes(!showNotes);
          }}
          className="flex items-center justify-center gap-2 w-full p-3 border-t border-base-200 text-primary font-medium active:bg-base-200 transition-colors"
        >
          <PenLine className="w-4 h-4" />
          {noteSaved ? 'View My Reflection' : 'Add Personal Reflection'}
        </button>

        {/* Notes Section */}
        {showNotes && (
          <div className="px-4 pb-4 space-y-3">
            <textarea
              value={noteText}
              onChange={(e) => {
                setNoteText(e.target.value);
                setNoteSaved(false);
              }}
              placeholder="Write your personal reflection, thoughts, or how you'll apply today's text..."
              className="textarea textarea-bordered w-full min-h-[120px] text-base"
              rows={4}
            />
            <button
              onClick={handleSaveNote}
              disabled={!noteText.trim() || noteSaved}
              className={`btn w-full gap-2 ${noteSaved ? 'btn-success' : 'btn-primary'}`}
            >
              {noteSaved ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Saved to Memories
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Reflection
                </>
              )}
            </button>
          </div>
        )}
      </article>

      {/* News Card */}
      <article className="card bg-base-100 shadow-sm rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4">
          <div className="p-3 rounded-2xl bg-accent/10">
            <Newspaper className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">News</h3>
            <p className="text-sm text-base-content/50">Latest from JW.org</p>
          </div>
          {unreadCount > 0 && (
            <span className="badge badge-accent font-bold">{unreadCount} new</span>
          )}
        </div>

        {/* News Items - large tap targets */}
        {latestNews.length > 0 && (
          <div className="px-4 space-y-1">
            {latestNews.map((item) => {
              const isRead = isItemRead(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => handleNewsClick(item)}
                  className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all active:scale-[0.98] ${
                    isRead ? 'bg-success/5' : 'active:bg-base-200'
                  }`}
                >
                  {item.thumbnail ? (
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <img
                        src={item.thumbnail}
                        alt=""
                        className={`w-14 h-14 rounded-xl object-cover bg-base-200 ${isRead ? 'opacity-60' : ''}`}
                        loading="lazy"
                      />
                      {isRead && (
                        <div className="absolute inset-0 flex items-center justify-center bg-success/30 rounded-xl">
                          <CheckCircle2 className="w-6 h-6 text-success" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-base-200 flex items-center justify-center flex-shrink-0">
                      {isRead ? (
                        <CheckCircle2 className="w-6 h-6 text-success" />
                      ) : (
                        <Newspaper className="w-6 h-6 text-base-content/30" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`font-medium line-clamp-2 ${isRead ? 'text-base-content/50' : ''}`}>
                      {item.title}
                    </p>
                    {isRead && (
                      <span className="text-xs text-success flex items-center gap-1 mt-1">
                        <Check className="w-3 h-3" />
                        Read
                      </span>
                    )}
                  </div>
                  <ChevronRight className={`w-5 h-5 flex-shrink-0 ${isRead ? 'text-success/50' : 'text-base-content/30'}`} />
                </button>
              );
            })}
          </div>
        )}

        {/* View All Button */}
        <button
          onClick={handleViewNews}
          className="flex items-center justify-center gap-2 w-full p-4 text-accent font-medium active:bg-base-200 transition-colors"
        >
          View All News
          <ChevronRight className="w-5 h-5" />
        </button>
      </article>

    </div>
  );
}

export default DailyTasksSection;
