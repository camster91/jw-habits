import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

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
    } catch (e) {
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

        try {
          // Fetch What's New page via CORS proxy
          const whatsNewUrl = encodeURIComponent('https://www.jw.org/en/whats-new/');
          const response = await fetch(`${CORS_PROXY}${whatsNewUrl}`);

          if (!response.ok) {
            throw new Error('Failed to fetch news');
          }

          const html = await response.text();
          const items = parseWhatsNew(html);

          // If parsing didn't work well, use sample data as fallback
          const finalItems =
            items.length > 0
              ? items
              : [
                  {
                    id: 'sample-1',
                    type: 'news_release',
                    filterCategory: 'articles',
                    category: 'NEWS RELEASES',
                    title: 'Visit jw.org for the latest news',
                    description: 'Check jw.org/whats-new for current updates from Jehovah\'s Witnesses.',
                    thumbnail: '',
                    url: 'https://www.jw.org/en/whats-new/',
                    jwLibraryUrl: 'jwlibrary://content',
                    publishDate: new Date().toISOString().split('T')[0],
                    duration: null,
                    isVideo: false,
                    isRead: false,
                  },
                ];

          set({
            items: finalItems,
            lastFetched: Date.now(),
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error.message || 'Failed to fetch news',
          });
        }
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
