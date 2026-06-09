import { useState } from 'react';
import { BookOpen, Headphones, Video, Check, Plus, Trash2, ChevronDown, Clock, BarChart3, Play } from 'lucide-react';
// Icon is imported but not used; TABS handles icons via the icon property
const _TABS = [
  { id: 'books', label: 'Books', icon: BookOpen },
  { id: 'audio', label: 'Audio', icon: Headphones },
  { id: 'video', label: 'Video', icon: Video },
];
import useReadingStore from '../stores/readingStore';
import useGamificationStore from '../stores/gamificationStore';
import { haptics } from '../utils/native';
import { useToast } from '../components/Toast';

function ReadingSection() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('books');
  const [expandedBook, setExpandedBook] = useState(null);
  const [showAddBook, setShowAddBook] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', chapters: '' });
  const [addAudioTitle, setAddAudioTitle] = useState('');
  const [addVideoTitle, setAddVideoTitle] = useState('');

  const {
    books, audioTracks, watchedVideos,
    toggleChapter, addBook,
    addAudioTrack, updateAudioProgress, removeAudioTrack,
    addWatchedVideo, removeWatchedVideo,
    logReadingTime, getStats, getBookProgress,
  } = useReadingStore();

  const { recordBibleReading, addPoints } = useGamificationStore();
  const format = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const handleToggleChapter = (bookId, chapter) => {
    haptics.light();
    toggleChapter(bookId, chapter);
    logReadingTime(5, 'book');
    addPoints(5);
    recordBibleReading?.();
    toast('success', 'Chapter logged');
  };

  const handleAddBook = () => {
    if (!newBook.title.trim()) return;
    haptics.success();
    addBook({ title: newBook.title.trim(), chapters: parseInt(newBook.chapters) || 10 });
    setNewBook({ title: '', chapters: '' });
    setShowAddBook(false);
    toast('success', 'Book added');
  };

  const handleAddAudio = () => {
    if (!addAudioTitle.trim()) return;
    haptics.success();
    addAudioTrack({ title: addAudioTitle.trim() });
    setAddAudioTitle('');
    toast('success', 'Audio track added');
  };

  const handleAddVideo = () => {
    if (!addVideoTitle.trim()) return;
    haptics.success();
    addWatchedVideo({ title: addVideoTitle.trim() });
    setAddVideoTitle('');
    toast('success', 'Video added');
  };

  const stats = getStats();

  const renderChapterGrid = (book) => {
    const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);
    const prog = getBookProgress(book.id);
    return (
      <div className="mt-3 space-y-2">
        {book.chapters <= 20 ? (
          <div className="flex flex-wrap gap-1.5">
            {chapters.map((ch) => {
              const done = book.completedChapters.includes(ch);
              return (
                <button
                  key={ch}
                  onClick={() => handleToggleChapter(book.id, ch)}
                  className={`w-8 h-8 rounded text-xs font-medium flex items-center justify-center transition-all ${
                    done
                      ? 'bg-primary text-primary-content scale-100'
                      : 'bg-base-300 text-base-content/60 hover:bg-base-200 hover:scale-105'
                  }`}
                  aria-label={`Chapter ${ch}`}
                >
                  {done ? <Check className="w-3 h-3" /> : ch}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-base-content/50">
            {book.completedChapters.length} of {book.chapters} chapters — tap to expand (large book)
          </p>
        )}
        <progress
          className="progress progress-primary w-full h-1.5"
          value={prog.pct} max="100"
        />
        <span className="text-xs text-base-content/50">{prog.pct}% complete</span>
        {prog.finished && <span className="badge badge-success badge-sm ml-2">Finished!</span>}
      </div>
    );
  };

  return (
    <section className="card bg-base-100 shadow-sm">
      <div className="card-body p-4">
        {/* ── Stats bar ──────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2 mb-4 text-center text-sm">
          <div className="p-2 rounded bg-primary/5">
            <div className="font-bold text-primary">{stats.finishedBooks}</div>
            <div className="text-xs text-base-content/50">Books done</div>
          </div>
          <div className="p-2 rounded bg-secondary/5">
            <div className="font-bold text-secondary">{stats.totalChaptersCompleted}</div>
            <div className="text-xs text-base-content/50">Chapters</div>
          </div>
          <div className="p-2 rounded bg-accent/5">
            <div className="font-bold text-accent">{Math.round(stats.audioMinutes / 60)}h</div>
            <div className="text-xs text-base-content/50">Audio</div>
          </div>
          <div className="p-2 rounded bg-info/5">
            <div className="font-bold text-info">{stats.videosWatched}</div>
            <div className="text-xs text-base-content/50">Videos</div>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────── */}
        <div className="tabs tabs-boxed mb-4">
          {_TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => { haptics.light(); setActiveTab(id); }}
              className={`tab tab-sm gap-1 ${activeTab === id ? 'tab-active' : ''}`}
            >
              {icon && <icon className="w-4 h-4" />}
              {label}
            </button>
          ))}
        </div>

        {/* ── Books Tab ───────────────────────────────── */}
        {activeTab === 'books' && (
          <div className="space-y-3">
            {books.map((book) => {
              const isExpanded = expandedBook === book.id;
              const prog = getBookProgress(book.id);
              return (
                <div key={book.id} className="p-3 rounded-lg bg-base-200/50">
                  <button
                    onClick={() => setExpandedBook(isExpanded ? null : book.id)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div>
                      <span className="text-sm font-medium">{book.title}</span>
                      <span className="text-xs text-base-content/50 ml-2">
                        {prog.completed}/{prog.total}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {prog.finished && <Check className="w-4 h-4 text-success" />}
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {isExpanded && renderChapterGrid(book)}
                </div>
              );
            })}
            {!showAddBook ? (
              <button
                onClick={() => setShowAddBook(true)}
                className="btn btn-ghost btn-sm w-full gap-1"
              >
                <Plus className="w-4 h-4" /> Add Book
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text" placeholder="Book title"
                  className="input input-bordered input-sm flex-1"
                  value={newBook.title} onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                />
                <input
                  type="number" placeholder="Chapters"
                  className="input input-bordered input-sm w-20"
                  value={newBook.chapters} onChange={(e) => setNewBook({ ...newBook, chapters: e.target.value })}
                  min="1"
                />
                <button onClick={handleAddBook} className="btn btn-primary btn-sm">Add</button>
                <button onClick={() => setShowAddBook(false)} className="btn btn-ghost btn-sm">X</button>
              </div>
            )}
          </div>
        )}

        {/* ── Audio Tab ───────────────────────────────── */}
        {activeTab === 'audio' && (
          <div className="space-y-3">
            {audioTracks.length === 0 && (
              <p className="text-sm text-base-content/50 text-center py-4">No audio tracks yet</p>
            )}
            {audioTracks.map((track) => (
              <div key={track.id} className="flex items-center justify-between p-3 rounded-lg bg-base-200/50">
                <div>
                  <span className="text-sm font-medium block">{track.title}</span>
                  <span className="text-xs text-base-content/50">
                    {track.listened} min listened — since {format(track.startedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { updateAudioProgress(track.id, 10); logReadingTime(10, 'audio'); toast('info', '+10 min'); }}
                    className="btn btn-ghost btn-xs gap-1"
                  >
                    <Play className="w-3 h-3" />+10m
                  </button>
                  <button
                    onClick={() => removeAudioTrack(track.id)}
                    className="btn btn-ghost btn-xs btn-circle text-error/60"
                    aria-label="Remove audio track"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text" placeholder="Audio track title"
                className="input input-bordered input-sm flex-1"
                value={addAudioTitle} onChange={(e) => setAddAudioTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAudio()}
              />
              <button onClick={handleAddAudio} className="btn btn-primary btn-sm">Add</button>
            </div>
          </div>
        )}

        {/* ── Video Tab ───────────────────────────────── */}
        {activeTab === 'video' && (
          <div className="space-y-3">
            {watchedVideos.length === 0 && (
              <p className="text-sm text-base-content/50 text-center py-4">No videos watched yet</p>
            )}
            {watchedVideos.map((video) => (
              <div key={video.id} className="flex items-center justify-between p-3 rounded-lg bg-base-200/50">
                <div>
                  <span className="text-sm font-medium block">{video.title}</span>
                  <span className="text-xs text-base-content/50">Watched {format(video.watchedAt)}</span>
                </div>
                <button
                  onClick={() => removeWatchedVideo(video.id)}
                  className="btn btn-ghost btn-xs btn-circle text-error/60"
                  aria-label="Remove video"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text" placeholder="Video title"
                className="input input-bordered input-sm flex-1"
                value={addVideoTitle} onChange={(e) => setAddVideoTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()}
              />
              <button onClick={handleAddVideo} className="btn btn-primary btn-sm">Add</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default ReadingSection;
