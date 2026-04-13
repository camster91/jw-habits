import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import {
  Users,
  Check,
  CheckCircle2,
  Plus,
  Link2,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  PenLine,
  Flame,
  BookOpen
} from 'lucide-react';
import useProgressStore from '../stores/progressStore';
import useGamificationStore from '../stores/gamificationStore';
import { haptics } from '../utils/native';

function FamilyWorshipCard() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekKey = format(weekStart, 'yyyy-MM-dd');
  const weekLabel = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;

  const [expanded, setExpanded] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [topicText, setTopicText] = useState('');
  const [notesText, setNotesText] = useState('');

  const {
    getFamilyWorship,
    toggleFamilyWorshipComplete,
    updateFamilyWorship,
    addStudyLink,
    removeStudyLink,
    getFamilyWorshipStreak
  } = useProgressStore();

  const { recordFamilyWorshipCompletion } = useGamificationStore();

  const worship = getFamilyWorship(weekKey);
  const worshipStreak = getFamilyWorshipStreak();

  // Initialize local state from stored data
  useEffect(() => {
    if (worship.topic) setTopicText(worship.topic);
    if (worship.notes) setNotesText(worship.notes);
  }, [worship.topic, worship.notes]);

  const handleToggleComplete = () => {
    haptics.light();
    toggleFamilyWorshipComplete(weekKey);

    if (!worship.completed) {
      haptics.success();
      recordFamilyWorshipCompletion();
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

  const handleSaveNotes = () => {
    if (notesText.trim()) {
      haptics.light();
      updateFamilyWorship(weekKey, { notes: notesText.trim() });
    }
  };

  return (
    <article className="card bg-base-100 shadow-sm rounded-2xl overflow-hidden">
      {/* Header - Tappable to expand */}
      <button
        onClick={() => {
          haptics.light();
          setExpanded(!expanded);
        }}
        className="flex items-center gap-3 p-4 w-full active:bg-base-200/50 transition-colors"
      >
        <div className={`p-3 rounded-2xl ${worship.completed ? 'bg-success/10' : 'bg-purple-500/10'}`}>
          <Users className={`w-6 h-6 ${worship.completed ? 'text-success' : 'text-purple-500'}`} />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-bold">Family Worship</h3>
          <p className="text-sm text-base-content/50">
            Week of {weekLabel}
          </p>
        </div>
        {worshipStreak > 0 && (
          <div className="badge badge-warning gap-1 mr-2">
            <Flame className="w-3 h-3 animate-flame" />
            {worshipStreak} week{worshipStreak !== 1 ? 's' : ''}
          </div>
        )}
        {worship.completed ? (
          <CheckCircle2 className="w-6 h-6 text-success" />
        ) : expanded ? (
          <ChevronUp className="w-5 h-5 text-base-content/30" />
        ) : (
          <ChevronDown className="w-5 h-5 text-base-content/30" />
        )}
      </button>

      {/* Completion Toggle */}
      <div className="px-4 pb-3">
        <button
          onClick={handleToggleComplete}
          className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all active:scale-[0.98] ${
            worship.completed
              ? 'bg-success/10'
              : 'bg-base-200/50 active:bg-base-200'
          }`}
        >
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            worship.completed
              ? 'bg-success border-success'
              : 'border-base-content/20'
          }`}>
            {worship.completed && <Check className="w-4 h-4 text-white" />}
          </div>
          <span className={`font-medium ${worship.completed ? 'text-success' : ''}`}>
            {worship.completed ? 'Completed this week!' : 'Mark as complete'}
          </span>
        </button>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-base-200 pt-4">
          {/* Topic/Theme */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-base-content/70">
              <BookOpen className="w-4 h-4" />
              Topic / Theme
            </label>
            <input
              type="text"
              value={topicText}
              onChange={(e) => setTopicText(e.target.value)}
              onBlur={handleSaveTopic}
              placeholder="What will you study this week?"
              className="input input-bordered w-full"
            />
          </div>

          {/* Study Links Section */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-base-content/70">
              <Link2 className="w-4 h-4" />
              Study Links
            </label>

            {/* Existing Links */}
            {worship.studyLinks && worship.studyLinks.length > 0 && (
              <div className="space-y-2">
                {worship.studyLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 p-3 bg-base-200/50 rounded-xl"
                  >
                    <button
                      onClick={() => handleOpenLink(link.url)}
                      className="flex-1 flex items-center gap-2 text-left active:opacity-70"
                    >
                      <ExternalLink className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium text-primary truncate">
                        {link.title}
                      </span>
                    </button>
                    <button
                      onClick={() => handleRemoveLink(link.id)}
                      className="p-2 rounded-lg active:bg-base-300"
                    >
                      <Trash2 className="w-4 h-4 text-error" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Link Form */}
            {showAddLink ? (
              <div className="space-y-2 p-3 bg-base-200/30 rounded-xl">
                <input
                  type="text"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  placeholder="Link title (e.g., 'Watchtower Article')"
                  className="input input-bordered input-sm w-full"
                />
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="URL (e.g., jw.org/...)"
                  className="input input-bordered input-sm w-full"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddLink}
                    disabled={!newLinkTitle.trim() || !newLinkUrl.trim()}
                    className="btn btn-primary btn-sm flex-1"
                  >
                    Add Link
                  </button>
                  <button
                    onClick={() => {
                      setShowAddLink(false);
                      setNewLinkTitle('');
                      setNewLinkUrl('');
                    }}
                    className="btn btn-ghost btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  haptics.light();
                  setShowAddLink(true);
                }}
                className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-base-300 rounded-xl text-base-content/50 active:bg-base-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Study Link
              </button>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-base-content/70">
              <PenLine className="w-4 h-4" />
              Notes
            </label>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder="Planning notes, discussion points, activities..."
              className="textarea textarea-bordered w-full min-h-[80px]"
              rows={3}
            />
          </div>
        </div>
      )}
    </article>
  );
}

export default FamilyWorshipCard;
