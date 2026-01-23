import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// API endpoint - works on Vercel, falls back for local dev
const getApiUrl = () => {
  // In production (Vercel), use relative path
  // In development, the API won't be available, so we'll use fallback
  return '/api/news';
};

// Curated JW.org content - reliable fallback that always works
const getCuratedItems = () => {
  return [
    {
      id: 'whats-new',
      type: 'news_release',
      filterCategory: 'articles',
      category: "WHAT'S NEW",
      title: 'Latest Updates on JW.org',
      description: 'See the latest news, articles, videos, and spiritual encouragement from jw.org.',
      thumbnail: 'https://assetsnffrgf-a.akamaihd.net/assets/m/802013131/univ/art/802013131_univ_lsr_lg.jpg',
      url: 'https://www.jw.org/en/whats-new/',
      jwLibraryUrl: 'jwlibrary://content',
      isVideo: false,
    },
    {
      id: 'latest-videos',
      type: 'video',
      filterCategory: 'videos',
      category: 'VIDEOS',
      title: 'Latest Videos',
      description: 'Watch the newest videos including talks, dramatizations, music, and more.',
      thumbnail: 'https://assetsnffrgf-a.akamaihd.net/assets/m/1011214/univ/art/1011214_univ_lsr_lg.jpg',
      url: 'https://www.jw.org/en/library/videos/#en/categories/LatestVideos',
      jwLibraryUrl: 'jwlibrary://content',
      isVideo: true,
    },
    {
      id: 'watchtower-study',
      type: 'magazine',
      filterCategory: 'magazines',
      category: 'THE WATCHTOWER',
      title: 'Watchtower Study Edition',
      description: 'Read the latest Watchtower study edition for meeting preparation.',
      thumbnail: 'https://assetsnffrgf-a.akamaihd.net/assets/m/2025007/univ/art/2025007_univ_lsr_lg.jpg',
      url: 'https://www.jw.org/en/library/magazines/watchtower-study/',
      jwLibraryUrl: 'jwlibrary://finder?wtlocale=E&pub=w',
      isVideo: false,
    },
    {
      id: 'newsroom',
      type: 'news_release',
      filterCategory: 'articles',
      category: 'NEWSROOM',
      title: 'JW Newsroom',
      description: "Official news releases and press information from Jehovah's Witnesses worldwide.",
      thumbnail: 'https://assetsnffrgf-a.akamaihd.net/assets/m/102015323/univ/art/102015323_univ_lsr_lg.jpg',
      url: 'https://www.jw.org/en/news/',
      jwLibraryUrl: 'jwlibrary://content',
      isVideo: false,
    },
    {
      id: 'meeting-workbook',
      type: 'magazine',
      filterCategory: 'magazines',
      category: 'MEETING WORKBOOK',
      title: 'Life and Ministry Meeting Workbook',
      description: 'Prepare for the midweek meeting with the current workbook.',
      thumbnail: 'https://assetsnffrgf-a.akamaihd.net/assets/m/mwb25/univ/art/mwb25_univ_lsr_lg.jpg',
      url: 'https://www.jw.org/en/library/jw-meeting-workbook/',
      jwLibraryUrl: 'jwlibrary://finder?wtlocale=E&pub=mwb',
      isVideo: false,
    },
    {
      id: 'awake',
      type: 'magazine',
      filterCategory: 'magazines',
      category: 'AWAKE!',
      title: 'Awake! Magazine',
      description: 'Read the latest Awake! articles covering practical life topics.',
      thumbnail: 'https://assetsnffrgf-a.akamaihd.net/assets/m/g25/univ/art/g25_univ_lsr_lg.jpg',
      url: 'https://www.jw.org/en/library/magazines/awake/',
      jwLibraryUrl: 'jwlibrary://finder?wtlocale=E&pub=g',
      isVideo: false,
    },
    {
      id: 'bible-study',
      type: 'educational',
      filterCategory: 'articles',
      category: 'BIBLE STUDY',
      title: 'Enjoy Life Forever! - Bible Study',
      description: 'Free interactive Bible study course available in many languages.',
      thumbnail: 'https://assetsnffrgf-a.akamaihd.net/assets/m/1102021232/univ/art/1102021232_univ_lsr_lg.jpg',
      url: 'https://www.jw.org/en/bible-teachings/guided-bible-study-course/',
      jwLibraryUrl: 'jwlibrary://finder?wtlocale=E&pub=lff',
      isVideo: false,
    },
    {
      id: 'original-songs',
      type: 'video',
      filterCategory: 'videos',
      category: 'MUSIC',
      title: 'Original Songs',
      description: 'Listen to original songs and music videos for encouragement.',
      thumbnail: 'https://assetsnffrgf-a.akamaihd.net/assets/m/1011231/univ/art/1011231_univ_lsr_lg.jpg',
      url: 'https://www.jw.org/en/library/music-songs/original-songs/',
      jwLibraryUrl: 'jwlibrary://content',
      isVideo: true,
    },
    {
      id: 'broadcasting',
      type: 'video',
      filterCategory: 'videos',
      category: 'JW BROADCASTING',
      title: 'JW Broadcasting',
      description: 'Monthly programs with spiritual encouragement, news, and interviews.',
      thumbnail: 'https://assetsnffrgf-a.akamaihd.net/assets/m/sjjm/univ/art/sjjm_univ_lsr_lg.jpg',
      url: 'https://www.jw.org/en/library/videos/#en/mediaitems/StudioMonthlyPrograms/pub-jwb',
      jwLibraryUrl: 'jwlibrary://content',
      isVideo: true,
    },
    {
      id: 'daily-text',
      type: 'educational',
      filterCategory: 'articles',
      category: 'DAILY TEXT',
      title: "Examining the Scriptures Daily",
      description: "Today's daily text and comments for personal Bible study.",
      thumbnail: 'https://assetsnffrgf-a.akamaihd.net/assets/m/es25/univ/art/es25_univ_lsr_lg.jpg',
      url: 'https://www.jw.org/en/library/jw-meeting-workbook/',
      jwLibraryUrl: 'jwlibrary://finder?wtlocale=E&pub=es',
      isVideo: false,
    },
  ];
};

const useNewsStore = create(
  persist(
    (set, get) => ({
      // Feed state - initialize with curated items
      items: getCuratedItems(),
      lastFetched: null,
      isLoading: false,
      error: null,

      // Filters
      activeFilter: 'all', // 'all' | 'articles' | 'magazines' | 'videos'

      // Read tracking
      readItems: {},

      // Actions
      setFilter: (filter) => set({ activeFilter: filter }),

      markAsRead: (itemId) =>
        set((state) => ({
          readItems: { ...state.readItems, [itemId]: true },
        })),

      markAllAsRead: () =>
        set((state) => ({
          readItems: state.items.reduce((acc, item) => {
            acc[item.id] = true;
            return acc;
          }, {}),
        })),

      isItemRead: (itemId) => {
        const state = get();
        return state.readItems[itemId] || false;
      },

      getUnreadCount: () => {
        const state = get();
        return state.items.filter((item) => !state.readItems[item.id]).length;
      },

      // Fetch news from API (Vercel serverless) with fallback to curated content
      fetchNews: async (forceRefresh = false) => {
        const state = get();

        // Check cache validity
        if (
          !forceRefresh &&
          state.lastFetched &&
          Date.now() - state.lastFetched < CACHE_DURATION &&
          state.items.length > 0
        ) {
          return; // Use cached data
        }

        set({ isLoading: true, error: null });

        try {
          const response = await fetch(getApiUrl(), {
            signal: AbortSignal.timeout(10000), // 10 second timeout
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.items && data.items.length > 0) {
              set({
                items: data.items,
                lastFetched: Date.now(),
                isLoading: false,
                error: null,
              });
              return;
            }
          }
        } catch {
          // API not available (local dev or network error) - use fallback
        }

        // Fallback to curated content
        set({
          items: getCuratedItems(),
          lastFetched: Date.now(),
          isLoading: false,
          error: null,
        });
      },

      // Get filtered items
      getFilteredItems: () => {
        const state = get();
        if (state.activeFilter === 'all') {
          return state.items;
        }
        return state.items.filter((item) => item.filterCategory === state.activeFilter);
      },

      // Get latest items for dashboard widget
      getLatestItems: (count = 3) => {
        const state = get();
        return state.items.slice(0, count);
      },

      // Refresh content
      clearCache: () =>
        set({
          items: getCuratedItems(),
          lastFetched: null,
          error: null,
        }),
    }),
    {
      name: 'jw-news-storage',
      version: 3,
      partialize: (state) => ({
        items: state.items,
        lastFetched: state.lastFetched,
        readItems: state.readItems,
      }),
    }
  )
);

export default useNewsStore;
