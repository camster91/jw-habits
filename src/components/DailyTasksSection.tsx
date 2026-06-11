import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { BookOpen, CheckCircle2, Globe, ExternalLink, BookHeart, PenLine, Save } from 'lucide-react';
import useProgressStore from '../stores/progressStore.js';
import useNewsStore from '../stores/newsStore.js';
import useMemoriesStore from '../stores/memoriesStore.js';
import useGamificationStore from '../stores/gamificationStore.js';
import { getDailyTextLink } from '../utils/jwLibraryLinks.js';
import { haptics } from '../utils/native.js';
import { formatRelativeDate } from '../utils/relativeDate.js';

function DailyTasksSection() {
  const { t } = useTranslation();
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

  const JW_WHATS_NEW = 'https://www.jw.org/en/whats-new/';

  const handleDailyCheck = () => {
    haptics.light();
    if (!hasCheckedToday) {
      checkToday();
      recordNewsRead();
    }
    window.open(JW_WHATS_NEW, '_blank', 'noopener,noreferrer');
  };

  const handleOpenJW = () => {
    haptics.light();
    window.open(dailyTextLink, '_blank', 'noopener,noreferrer');
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
      <div className="ios-grouped">
        {/* Daily Text */}
        <div
          className={`ios-row${dailyTextProgress.readScripture ? ' done' : ''}`}
          onClick={handleDailyTextCheck}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleDailyTextCheck()}
        >
          <div className="ios-icon jw-blue">
            <BookOpen size={16} />
          </div>
          <div className="body">
            <div className="title">{t('today.dailyText')}</div>
            <div className="sub">{t('today.readText')}</div>
          </div>
          {dailyTextProgress.readScripture ? (
            <div className="ios-check done">
              <CheckCircle2 size={14} />
            </div>
          ) : (
            <div className="ios-check" />
          )}
        </div>

        {/* Open on JW.org */}
        <div
          className="ios-row"
          onClick={handleOpenJW}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleOpenJW()}
        >
          <div className="ios-icon jw-blue">
            <Globe size={16} />
          </div>
          <div className="body">
            <div className="title">{t('today.openOnJw')}</div>
            <div className="sub">jw.org</div>
          </div>
          <div className="ios-chev">
            <ExternalLink size={20} />
          </div>
        </div>

        {/* Separator */}
        <div className="ios-row">
          <div className="ios-icon teal">
            <ExternalLink size={16} />
          </div>
          <div className="body">
            <div className="title">{t('today.checkIn')}</div>
            <div className="sub">
              {dailyCheckStreak > 0
                ? `${dailyCheckStreak} ${dailyCheckStreak === 1 ? t('stats.day') : t('stats.days')} streak`
                : t('today.checkInDesc')}
            </div>
          </div>
          <div
            className={`ios-check${hasCheckedToday ? ' done' : ''}`}
            onClick={handleDailyCheck}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleDailyCheck()}
          >
            {hasCheckedToday && <CheckCircle2 size={14} />}
          </div>
        </div>

        {/* Daily Reflection */}
        <div className="ios-row" onClick={() => setShowNotes(!showNotes)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setShowNotes(!showNotes)}>
          <div className="ios-icon jw-gold">
            <BookHeart size={16} />
          </div>
          <div className="body">
            <div className="title">{t('today.reflection')}</div>
            <div className="sub">
              {showNotes ? t('today.hide') : noteSaved ? `${t('today.saved')} · ${formatRelativeDate(today)}` : t('today.reflectionOptional')}
            </div>
          </div>
          <div className="ios-chev">
            <PenLine size={16} />
          </div>
        </div>

        {showNotes && (
          <div className="ios-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
            <textarea
              value={noteText}
              onChange={(e) => {
                setNoteText(e.target.value);
                setNoteSaved(false);
              }}
              className="textarea textarea-bordered w-full"
              placeholder={t('today.reflectionPlaceholder')}
              rows={3}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSaveNote();
              }}
              className={`btn btn-sm w-full${noteSaved ? ' btn-success' : ' btn-primary'}`}
            >
              <Save className="w-4 h-4" /> {noteSaved ? t('today.saved') : t('today.save')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DailyTasksSection;