import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import {
  Users,
  Check,
  Plus,
  Link2,
  Trash2,
  ExternalLink,
  PenLine,
  Flame,
  BookOpen
} from 'lucide-react';
import useProgressStore from '../stores/progressStore';
import useGamificationStore from '../stores/gamificationStore';
import { haptics } from '../utils/native';
import { useToast } from './Toast';

function FamilyWorshipCard() {
  const { t } = useTranslation();
  const toast = useToast();
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekKey = format(weekStart, 'yyyy-MM-dd');

  const [expanded, setExpanded] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const progressStore = useProgressStore();
  const worship = progressStore.getFamilyWorship(weekKey);
  const worshipStreak = progressStore.getFamilyWorshipStreak();

  const [topicText, setTopicText] = useState(() => worship?.topic || '');
  const [notesText, setText] = useState(() => worship?.notes || '');

  const {
    toggleFamilyWorshipComplete,
    updateFamilyWorship,
    addStudyLink,
    removeStudyLink,
  } = progressStore;

  const gamificationStore = useGamificationStore();
  const { recordFamilyWorshipCompletion } = gamificationStore;

  const handleToggleComplete = () => {
    haptics.light();
    const wasCompleted = worship.completed;
    toggleFamilyWorshipComplete(weekKey);

    if (!wasCompleted) {
      haptics.success();
      recordFamilyWorshipCompletion();
      // Offer an undo action — the completion is "locked in for the week" otherwise
      toast.success('Family worship complete!', {
        duration: 8000,
        action: {
          label: 'Undo',
          onClick: () => {
            haptics.warning();
            toggleFamilyWorshipComplete(weekKey);
            toast.info('Marked as not complete');
          },
        },
      });
    } else {
      toast.info('Family worship marked as not complete');
    }
  };

  const handleAddLink = () => {
    if (newLinkTitle.trim() && newLinkUrl.trim()) {
      haptics.light();
      let url = newLinkUrl.trim();
      // Block dangerous schemes
      if (url.startsWith('javascript:') || url.startsWith('data:') || url.startsWith('vbscript:')) {
        return;
      }
      // Ensure URL has protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      addStudyLink(weekKey, { title: newLinkTitle.trim(), url });
      setNewLinkTitle('');
      setNewLinkUrl('');
      setShowAddLink(false);
    }
  };

  const handleRemoveLink = (linkId) => {
    haptics.light();
    removeStudyLink(weekKey, linkId);
  };

  const handleOpenLink = (url) => {
    haptics.light();
    // Prevent XSS: only allow http/https URLs
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      console.warn('Blocked unsafe URL:', url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSaveTopic = () => {
    if (topicText.trim()) {
      haptics.light();
      updateFamilyWorship(weekKey, { topic: topicText.trim() });
    }
  };

  const handleSave = () => {
    if (notesText.trim()) {
      haptics.light();
      updateFamilyWorship(weekKey, { notes: notesText.trim() });
    }
  };

  return (
    <div className="ios-grouped">
      {/* Header row */}
      <button
        onClick={() => {
          haptics.light();
          setExpanded(!expanded);
        }}
        className="ios-row w-full text-left"
        style={{ background: 'transparent', border: 0, margin: 0 }}
      >
        <div className="ios-icon orange">
          <Users className="w-4 h-4" />
        </div>
        <div className="body">
          <div className="title">{t('familyWorship.heading')}</div>
          <div className="sub">
            {t('familyWorship.weekOf', { start: format(weekStart, 'MMM d'), end: format(weekEnd, 'MMM d') })}
          </div>
        </div>
        {worshipStreak > 0 && (
          <span className="ios-pill" style={{ background: 'rgba(255,149,0,0.14)', color: 'var(--ios-orange)' }}>
            <Flame className="w-3 h-3" /> {worshipStreak}
          </span>
        )}
        <svg className="ios-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {expanded ? (
            <polyline points="18 15 12 9 6 15"></polyline>
          ) : (
            <polyline points="6 9 12 15 18 9"></polyline>
          )}
        </svg>
      </button>

      {/* Completion toggle row */}
      <button
        onClick={handleToggleComplete}
        className={`ios-row w-full text-left ${worship.completed ? 'done' : ''}`}
        style={{ background: 'transparent', border: 0, margin: 0 }}
      >
        <div className={`ios-check ${worship.completed ? 'done' : ''}`}>
          {worship.completed && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          )}
        </div>
        <div className="body">
          <div className="title">
            {worship.completed ? t('familyWorship.completed') : t('familyWorship.markComplete')}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <>
          {/* Topic/Theme row */}
          <div className="ios-row">
            <div className="ios-icon" style={{ background: 'rgba(0,122,255,0.14)' }}>
              <BookOpen className="w-4 h-4" style={{ color: 'var(--ios-blue)' }} />
            </div>
            <div className="body">
              <input
                type="text"
                value={topicText}
                onChange={(e) => setTopicText(e.target.value)}
                onBlur={handleSaveTopic}
                placeholder=""
                className="input input-bordered w-full"
                style={{ height: 36, fontSize: 15 }}
              />
            </div>
          </div>

          {/* Study Links section */}
          {worship.studyLinks && worship.studyLinks.length > 0 && (
            worship.studyLinks.map((link) => (
              <div key={link.id} className="ios-row">
                <div className="ios-icon" style={{ background: 'rgba(74,111,164,0.14)' }}>
                  <ExternalLink className="w-4 h-4" style={{ color: 'var(--ios-jw-blue)' }} />
                </div>
                <button
                  onClick={() => handleOpenLink(link.url)}
                  className="body text-left"
                  style={{ background: 'transparent', border: 0, margin: 0, padding: 0 }}
                >
                  <div className="title">{link.title}</div>
                </button>
                <button
                  onClick={() => handleRemoveLink(link.id)}
                  className="p-2 -mr-2"
                  style={{ background: 'transparent', border: 0 }}
                  aria-label="Remove link"
                >
                  <Trash2 className="w-4 h-4" style={{ color: 'var(--ios-red)' }} />
                </button>
              </div>
            ))
          )}

          {/* Add Study Link row */}
          {showAddLink ? (
            <div className="ios-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <input
                type="text"
                value={newLinkTitle}
                onChange={(e) => setNewLinkTitle(e.target.value)}
                placeholder=""
                className="input input-bordered w-full"
                style={{ height: 36, fontSize: 15 }}
              />
              <input
                type="url"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder=""
                className="input input-bordered w-full"
                style={{ height: 36, fontSize: 15 }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddLink}
                  disabled={!newLinkTitle.trim() || !newLinkUrl.trim()}
                  className="btn btn-primary btn-sm flex-1"
                >
                  {t('common.add')}
                </button>
                <button
                  onClick={() => {
                    setShowAddLink(false);
                    setNewLinkTitle('');
                    setNewLinkUrl('');
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                haptics.light();
                setShowAddLink(true);
              }}
              className="ios-row w-full text-left"
              style={{ background: 'transparent', border: 0, margin: 0 }}
            >
              <div className="ios-icon" style={{ background: 'rgba(0,122,255,0.14)' }}>
                <Plus className="w-4 h-4" style={{ color: 'var(--ios-blue)' }} />
              </div>
              <div className="body">
                <div className="title" style={{ color: 'var(--ios-blue)' }}>{t('familyWorship.addStudyLink')}</div>
              </div>
            </button>
          )}

          {/* Notes row */}
          <div className="ios-row" style={{ paddingTop: 8, paddingBottom: 12 }}>
            <div className="ios-icon" style={{ background: 'rgba(88,86,214,0.14)', alignSelf: 'flex-start', marginTop: 2 }}>
              <PenLine className="w-4 h-4" style={{ color: 'var(--ios-indigo)' }} />
            </div>
            <div className="body" style={{ paddingTop: 0 }}>
              <textarea
                value={notesText}
                onChange={(e) => setText(e.target.value)}
                onBlur={handleSave}
                placeholder=""
                className="textarea textarea-bordered w-full"
                rows={3}
                style={{ minHeight: 80, fontSize: 15 }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default FamilyWorshipCard;
