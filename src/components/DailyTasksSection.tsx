import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { BookOpen, CheckCircle2, Flame, PenLine, Save, BookHeart, Globe } from 'lucide-react';
import useProgressStore from '../stores/progressStore';
import useNewsStore from '../stores/newsStore';
import useMemoriesStore from '../stores/memoriesStore';
import useGamificationStore from '../stores/gamificationStore';
import { getDailyTextLink } from '../utils/jwLibraryLinks';
import { haptics } from '../utils/native';

function DailyTasksSection() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  const {
    getDailyTextProgress,
    updateDailyTextProgress,
  } = useProgressStore();

  const dailyTextProgress = getDailyTextProgress(today);
  const dailyTextLink = getDailyTextLink(new Date());

  const { getHasCheckedToday, checkToday, getStreak } = useNewsStore();
  const hasCheckedToday = getHasCheckedToday();
  const dailyCheckStreak = getStreak();

  const { saveReflection, getReflection } = useMemoriesStore();
  const { recordDailyTextCompletion, recordReflection, recordNewsRead } = useGamificationStore();

  const existingReflection = getReflection(today);

  useEffect(() => {
    if (existingReflection && !noteText) {
      setNoteText(existingReflection);
      setNoteSaved(true);
    }
  }, [existingReflection, noteText]);

  const handleDailyCheck = () => {
    haptics.light();
    if (!hasCheckedToday) {
      checkToday();
      recordNewsRead();
    }
  };

  const handleOpenJW = () => {
    haptics.light();
    window.open(dailyTextLink, '_blank');
  };

  const handleDailyTextCheck = () => {
    haptics.light();
    const newValue = !dailyTextProgress.readScripture;
    updateDailyTextProgress(today, 'readScripture', newValue);

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

  return (
    <div className="space-y-4">
      {/* Daily Text */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Daily Text</h3>
          </div>
          <button
            onClick={handleDailyTextCheck}
            className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
              dailyTextProgress.readScripture
                ? 'bg-success/10 text-success-content'
                : 'bg-base-200'
            }`}
          >
            <span className="font-medium">Read today's text</span>
            {dailyTextProgress.readScripture ? <CheckCircle2 className="w-6 h-6" /> : <div className="w-6 h-6 rounded-full border-2 border-base-content/20" />}
          </button>
          <button onClick={handleOpenJW} className="btn btn-outline btn-sm mt-2 w-full gap-2">
            <Globe className="w-4 h-4" /> Open on JW.org
          </button>
        </div>
      </div>

      {/* Quick Check */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame className="w-5 h-5 text-warning" />
              <h3 className="font-semibold text-lg">Daily Check</h3>
            </div>
            {dailyCheckStreak > 0 && (
              <div className="text-sm font-bold text-warning">{dailyCheckStreak} day streak</div>
            )}
          </div>
          <button
            onClick={handleDailyCheck}
            disabled={hasCheckedToday}
            className={`btn w-full mt-2 ${hasCheckedToday ? 'btn-disabled' : 'btn-primary'}`}
          >
            {hasCheckedToday ? 'Checked in today' : 'Check in now'}
          </button>
        </div>
      </div>

      {/* Daily Reflection */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-3 w-full"
          >
            <BookHeart className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-lg flex-1 text-left">Daily Reflection</h3>
            <span className="text-xs text-base-content/50">
              {showNotes ? 'Hide' : noteSaved ? 'Saved' : 'Optional'}
            </span>
          </button>
          {showNotes && (
            <div className="mt-3 space-y-2">
              <textarea
                value={noteText}
                onChange={(e) => {
                  setNoteText(e.target.value);
                  setNoteSaved(false);
                }}
                className="textarea textarea-bordered w-full"
                placeholder="What did you learn today?"
                rows={3}
              />
              <button onClick={handleSaveNote} className={`btn btn-sm w-full ${noteSaved ? 'btn-success' : 'btn-primary'}`}>
                <Save className="w-4 h-4" /> {noteSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DailyTasksSection;