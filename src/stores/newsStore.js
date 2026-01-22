import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Multiple CORS proxies to try in order
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
];

// Curated news items as fallback when fetch fails
const getFallbackItems = () => {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      id: 'fallback-whats-new',
      type: 'news_release',
      filterCategory: 'articles',
      category: 'WHAT\'S NEW',
      title: 'Latest Updates on JW.org',
      description: 'Visit jw.org to see the latest news, articles, and spiritual encouragement.',
      thumbnail: '',
      url: 'https://www.jw.org/en/whats-new/',
      jwLibraryUrl: 'jwlibrary://content',
      publishDate: today,
      duration: null,
      isVideo: false,
      isRead: false,
    },
    {
      id: 'fallback-videos',
      type: 'video',
      filterCategory: 'videos',
      category: 'VIDEOS',
      title: 'Latest Videos',
      description: 'Watch the newest videos including talks, dramatizations, and music.',
      thumbnail: '',
      url: 'https://www.jw.org/en/library/videos/#en/categories/LatestVideos',
      jwLibraryUrl: 'jwlibrary://content',
      publishDate: today,
      duration: null,
      isVideo: true,
      isRead: false,
    },
    {
      id: 'fallback-watchtower',
      type: 'magazine',
      filterCategory: 'magazines',
      category: 'THE WATCHTOWER',
      title: 'Watchtower Study Articles',
      description: 'Read the latest Watchtower study edition for meeting preparation.',
      thumbnail: '',
      url: 'https://www.jw.org/en/library/magazines/watchtower-study/',
      jwLibraryUrl: 'jwlibrary://content',
      publishDate: today,
      duration: null,
      isVideo: false,
      isRead: false,
    },
    {
      id: 'fallback-newsroom',
      type: 'news_release',
      filterCategory: 'articles',
      category: 'NEWSROOM',
      title: 'JW Newsroom',
      description: 'Official news releases and press information from Jehovah\'s Witnesses.',
      thumbnail: '',
      url: 'https://www.jw.org/en/news/',
      jwLibraryUrl: 'jwlibrary://content',
      publishDate: today,
      duration: null,
      isVideo: false,
      isRead: false,
    },
    {
      id: 'fallback-meeting-workbook',
      type: 'magazine',
      filterCategory: 'magazines',
      category: 'MEETING WORKBOOK',
      title: 'Life and Ministry Meeting Workbook',
      description: 'Prepare for the midweek meeting with the latest workbook.',
      thumbnail: '',
      url: 'https://www.jw.org/en/library/jw-meeting-workbook/',
      jwLibraryUrl: 'jwlibrary://content',
      publishDate: today,
      duration: null,
      isVideo: false,
      isRead: false,
    },
  ];
};

// Category type mappings
const CATEGORY_TYPES = {
  'NEWS RELEASES': 'news_release',
  'NEWS': 'news_release',
  'LIFE STORIES': 'life_story',
  'LIFE STORY': 'life_story',
  'THE WATCHTOWER': 'magazine',
  'THE WATCHTOWER—STUDY EDITION': 'magazine',
  'AWAKE!': 'magazine',
  'MEETING WORKBOOK': 'magazine',
  'WAS IT DESIGNED?': 'educational',
  'VIDEO': 'video',
  'VIDEOS': 'video',
};

// Get filter category from type
const getFilterCategory = (type) => {
  switch (type) {
    case 'news_release':
    case 'life_story':
    case 'educational':
      return 'articles';
    case 'magazine':
      return 'magazines';
    case 'video':
      return 'videos';
    default:
      return 'articles';
  }
};

// Parse HTML to extract news items
const parseWhatsNew = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const items = [];

  // Find all synopsis items (cards)
  const cards = doc.querySelectorAll('.synopsis, .card, [class*="item"], article');

  cards.forEach((card, index) => {
    try {
      // Try different selectors for title
      const titleEl = card.querySelector('h3 a, h2 a, .title a, a.lnk, .headline a, a');
      const title = titleEl?.textContent?.trim();
      if (!title) return;

      // Get URL
      let url = titleEl?.getAttribute('href') || '';
      if (url && !url.startsWith('http')) {
        url = `https://www.jw.org${url}`;
      }

      // Get category
      const categoryEl = card.querySelector('.category, .cardType, [class*="type"], .contextTitle');
      const category = categoryEl?.textContent?.trim()?.toUpperCase() || 'ARTICLES';

      // Get description
      const descEl = card.querySelector('.synopsis, .desc, .description, p');
      const description = descEl?.textContent?.trim() || '';

      // Get thumbnail
      const imgEl = card.querySelector('img');
      let thumbnail = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';
      if (thumbnail && !thumbnail.startsWith('http')) {
        thumbnail = `https://www.jw.org${thumbnail}`;
      }

      // Get date
      const dateEl = card.querySelector('.date, time, [class*="date"]');
      let publishDate = dateEl?.textContent?.trim() || '';
      // Try to parse date or use today
      if (!publishDate || publishDate.length < 8) {
        publishDate = new Date().toISOString().split('T')[0];
      }

      // Determine type
      const type = CATEGORY_TYPES[category] || 'news_release';
      const isVideo = type === 'video' || category.includes('VIDEO');

      // Check for duration (videos)
      const durationEl = card.querySelector('.duration, [class*="duration"], time');
      let duration = null;
      if (isVideo && durationEl) {
        const durationText = durationEl.textContent;
        const match = durationText.match(/(\d+):(\d+)/);
        if (match) {
          duration = parseInt(match[1]) * 60 + parseInt(match[2]);
        }
      }

      items.push({
        id: `news-${index}-${Date.now()}`,
        type,
        filterCategory: getFilterCategory(type),
        category,
        title,
        description: description.substring(0, 200),
        thumbnail,
        url,
        jwLibraryUrl: url.replace('https://www.jw.org', 'jwlibrary://'),
        publishDate,
        duration,
        isVideo,
        isRead: false,
      });
    } catch {
      // Skip malformed items
    }
  });

  return items;
};

const useNewsStore = create(
  persist(
    (set, get) => ({
      // Feed state
      items: [],
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

      // Fetch news from JW.org
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

        const whatsNewUrl = encodeURIComponent('https://www.jw.org/en/whats-new/');
        let fetchSuccess = false;
        let parsedItems = [];

        // Try each CORS proxy until one works
        for (const proxy of CORS_PROXIES) {
          try {
            const response = await fetch(`${proxy}${whatsNewUrl}`, {
              signal: AbortSignal.timeout(10000), // 10 second timeout
            });

            if (response.ok) {
              const html = await response.text();
              parsedItems = parseWhatsNew(html);
              fetchSuccess = true;
              break;
            }
          } catch {
            // Try next proxy
            continue;
          }
        }

        // Use parsed items if successful, otherwise use curated fallback
        const finalItems = fetchSuccess && parsedItems.length > 0
          ? parsedItems
          : getFallbackItems();

        set({
          items: finalItems,
          lastFetched: Date.now(),
          isLoading: false,
          error: fetchSuccess ? null : 'Using offline content - visit jw.org for latest updates',
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

      // Clear cache
      clearCache: () =>
        set({
          items: [],
          lastFetched: null,
          error: null,
        }),
    }),
    {
      name: 'jw-news-storage',
      version: 1,
      partialize: (state) => ({
        items: state.items,
        lastFetched: state.lastFetched,
        readItems: state.readItems,
      }),
    }
  )
);

export default useNewsStore;
