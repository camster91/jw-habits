import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { BookOpen, Newspaper, Check, ExternalLink, ChevronRight, Star, CheckCircle2, Flame, PenLine, Save, BookHeart } from 'lucide-react';
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
    getDailyTextStreak,
  } = useProgressStore();

  const dailyTextStreak = getDailyTextStreak();

  const dailyTextProgress = getDailyTextProgress(today);
  const isDailyTextComplete = isDailyTextRead(today);
  const dailyTextLink = getDailyTextLink(new Date());

  // News state
  const { fetchNews, getUnreadItems, getUnreadCount, markAsRead } = useNewsStore();
  const unreadNews = getUnreadItems(3);
  const unreadCount = getUnreadCount();

  // Memories state
  const { saveReflection, getReflection, getReflectionCount } = useMemoriesStore();
  const reflectionCount = getReflectionCount();

  // Gamification state
  const { recordDailyTextCompletion, recordReflection, recordNewsRead } = useGamificationStore();

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

  const handleDailyTextCheck = () => {
    haptics.light();
    const newValue = !dailyTextProgress.readScripture;
    updateDailyTextProgress(today, 'readScripture', newValue);

    // Record completion for gamification
    if (newValue) {
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
  const dailyTextDone = dailyTextProgress.readScripture;

  return (
    <div className="space-y-3">
      {/* Streak Banner */}
      {dailyTextStreak > 0 && (
        <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl text-white shadow-lg animate-fade-in-up">
          <Flame className="w-5 h-5 animate-flame" />
          <span className="font-bold">{dailyTextStreak} Day Streak!</span>
          <Flame className="w-5 h-5 animate-flame" />
        </div>
      )}

      {/* Progress Overview */}
      {dailyTextDone && (
        <div className="flex items-center justify-center gap-2 p-4 bg-success/10 rounded-2xl text-success animate-fade-in-up">
          <Star className="w-5 h-5 animate-wiggle" />
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
            <p className="text-sm text-base-content/50">Read and apply today's text</p>
          </div>
          {isDailyTextComplete ? (
            <CheckCircle2 className="w-6 h-6 text-success" />
          ) : (
            <ExternalLink className="w-5 h-5 text-base-content/30" />
          )}
        </a>

        {/* Read Daily Text Checkbox */}
        <div className="px-4 pb-3">
          <button
            onClick={handleDailyTextCheck}
            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all active:scale-[0.98] ${
              dailyTextProgress.readScripture
                ? 'bg-success/10'
                : 'bg-base-200/50 active:bg-base-200'
            }`}
          >
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              dailyTextProgress.readScripture
                ? 'bg-success border-success'
                : 'border-base-content/20'
            }`}>
              {dailyTextProgress.readScripture && <Check className="w-4 h-4 text-white" />}
            </div>
            <span className={`font-medium ${dailyTextProgress.readScripture ? 'text-success' : ''}`}>
              Read Daily Text
            </span>
          </button>
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
            {reflectionCount > 0 && (
              <button
                onClick={() => {
                  haptics.light();
                  navigate('/memories');
                }}
                className="btn btn-ghost btn-sm w-full gap-2"
              >
                <BookHeart className="w-4 h-4" />
                View All Reflections ({reflectionCount})
              </button>
            )}
          </div>
        )}
      </article>

      {/* News Card - only show when there are unread items */}
      {unreadCount > 0 && (
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
            <span className="badge badge-accent font-bold">{unreadCount} new</span>
          </div>

          {/* Unread News Items - large tap targets */}
          {unreadNews.length > 0 && (
            <div className="px-4 space-y-1">
              {unreadNews.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNewsClick(item)}
                  className="flex items-center gap-3 w-full p-3 rounded-xl transition-all active:scale-[0.98] active:bg-base-200"
                >
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="w-14 h-14 rounded-xl object-cover bg-base-200 flex-shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-base-200 flex items-center justify-center flex-shrink-0">
                      <Newspaper className="w-6 h-6 text-base-content/30" />
                    </div>
                  )}
                  <p className="flex-1 min-w-0 text-left font-medium line-clamp-2">
                    {item.title}
                  </p>
                  <ChevronRight className="w-5 h-5 flex-shrink-0 text-base-content/30" />
                </button>
              ))}
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
      )}

    </div>
  );
}

export default DailyTasksSection;
