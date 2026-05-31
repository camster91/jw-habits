import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createSafeStorage } from '../utils/storageErrorHandler';

const JW_PUBLICATIONS = [
  { id: 'nwt', title: 'New World Translation', chapters: 66, category: 'bible' },
  { id: 'lff', title: 'Enjoy Life Forever!', chapters: 60, category: 'book' },
  { id: 'wcg', title: 'Draw Close to Jehovah', chapters: 33, category: 'book' },
  { id: 'od', title: 'Organized to Do Jehovah\'s Will', chapters: 18, category: 'book' },
  { id: 'es26', title: 'Examining the Scriptures Daily — 2026', chapters: 366, category: 'daily' },
  { id: 't-ftr', title: 'Teach Them From the Heart', chapters: 20, category: 'book' },
];

const useReadingStore = create(
  persist(
    (set, get) => ({
      // ── Books ──────────────────────────────────────────
      books: JW_PUBLICATIONS.map((pub) => ({
        ...pub,
        completedChapters: [],
        notes: {},
        started: false,
        finished: false,
      })),

      // ── Audio ──────────────────────────────────────────
      audioTracks: [],

      // ── Video ──────────────────────────────────────────
      watchedVideos: [],

      // ── Reading time log ──────────────────────────────
      readingLog: [],

      // ── Add custom book ──────────────────────────────
      addBook: (book) =>
        set((state) => ({
          books: [
            ...state.books,
            {
              id: crypto.randomUUID(),
              title: book.title,
              chapters: Number(book.chapters) || 1,
              category: 'custom',
              completedChapters: [],
              notes: {},
              started: false,
              finished: false,
            },
          ],
        })),

      // ── Mark chapter complete ─────────────────────────
      toggleChapter: (bookId, chapter) =>
        set((state) => {
          const books = state.books.map((b) => {
            if (b.id !== bookId) return b;
            const already = b.completedChapters.includes(chapter);
            const completedChapters = already
              ? b.completedChapters.filter((c) => c !== chapter)
              : [...b.completedChapters, chapter].sort((a, b) => a - b);
            const finished = completedChapters.length >= b.chapters && b.chapters > 0;
            return {
              ...b,
              completedChapters,
              started: completedChapters.length > 0,
              finished,
            };
          });
          return { books };
        }),

      // ── Add note to chapter ───────────────────────────
      setChapterNote: (bookId, chapter, note) =>
        set((state) => {
          const books = state.books.map((b) => {
            if (b.id !== bookId) return b;
            return {
              ...b,
              notes: { ...b.notes, [chapter]: note },
            };
          });
          return { books };
        }),

      // ── Remove book ────────────────────────────────────
      removeBook: (bookId) =>
        set((state) => ({
          books: state.books.filter((b) => b.id !== bookId),
        })),

      // ── Audio tracking ────────────────────────────────
      addAudioTrack: (track) =>
        set((state) => ({
          audioTracks: [
            ...state.audioTracks,
            { ...track, id: crypto.randomUUID(), listened: 0, startedAt: new Date().toISOString() },
          ],
        })),

      updateAudioProgress: (id, minutes) =>
        set((state) => ({
          audioTracks: state.audioTracks.map((t) =>
            t.id === id ? { ...t, listened: t.listened + minutes, lastUpdated: new Date().toISOString() } : t
          ),
        })),

      removeAudioTrack: (id) =>
        set((state) => ({
          audioTracks: state.audioTracks.filter((t) => t.id !== id),
        })),

      // ── Video tracking ────────────────────────────────
      addWatchedVideo: (video) =>
        set((state) => ({
          watchedVideos: [
            ...state.watchedVideos,
            {
              id: crypto.randomUUID(),
              title: video.title,
              url: video.url || '',
              duration: video.duration || 0,
              watchedAt: new Date().toISOString(),
            },
          ],
        })),

      removeWatchedVideo: (id) =>
        set((state) => ({
          watchedVideos: state.watchedVideos.filter((v) => v.id !== id),
        })),

      // ── Reading time log ──────────────────────────────
      logReadingTime: (minutes, source = 'book') =>
        set((state) => ({
          readingLog: [
            ...state.readingLog,
            {
              id: crypto.randomUUID(),
              minutes,
              source,
              date: new Date().toISOString(),
            },
          ],
        })),

      // ── Computed stats ────────────────────────────────
      getStats: () => {
        const state = get();
        const totalBooks = state.books.length;
        const finishedBooks = state.books.filter((b) => b.finished).length;
        const totalChaptersCompleted = state.books.reduce((sum, b) => sum + b.completedChapters.length, 0);
        const totalChapters = state.books.reduce((sum, b) => sum + b.chapters, 0);
        const audioMinutes = state.audioTracks.reduce((sum, t) => sum + (t.listened || 0), 0);
        const videosWatched = state.watchedVideos.length;

        // Weekly reading time
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weeklyReadingLog = state.readingLog.filter((log) => new Date(log.date) >= weekAgo);
        const weeklyReadingMinutes = weeklyReadingLog.reduce((sum, l) => sum + l.minutes, 0);

        return {
          totalBooks,
          finishedBooks,
          totalChaptersCompleted,
          totalChapters,
          audioMinutes,
          videosWatched,
          weeklyReadingMinutes,
        };
      },

      // ── Get progress for a specific book ──────────────
      getBookProgress: (bookId) => {
        const book = get().books.find((b) => b.id === bookId);
        if (!book) return { completed: 0, total: 0, pct: 0, started: false, finished: false };
        return {
          completed: book.completedChapters.length,
          total: book.chapters,
          pct: book.chapters > 0 ? Math.round((book.completedChapters.length / book.chapters) * 100) : 0,
          started: book.started,
          finished: book.finished,
        };
      },
    }),
    {
      name: 'jw-reading-storage',
      storage: createSafeStorage('jw-reading-storage'),
      version: 1,
      partialize: (state) => ({
        books: state.books,
        audioTracks: state.audioTracks,
        watchedVideos: state.watchedVideos,
        readingLog: state.readingLog,
      }),
    }
  )
);

export { JW_PUBLICATIONS };
export default useReadingStore;
