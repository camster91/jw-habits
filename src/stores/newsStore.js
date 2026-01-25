import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// RSS Feed URL - Update this with your actual RSS feed URL
// Example: 'https://camster91.github.io/JW-Newsfeed/feed.xml'
const RSS_FEED_URL = null; // Set to your RSS feed URL when available

// API endpoint for fallback
const getApiUrl = () => '/api/news';

// Parse RSS XML to items
const parseRSSFeed = (xmlText) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const items = doc.querySelectorAll('item');

  return Array.from(items).map((item, index) => {
    const getElementText = (tagName) => {
      const el = item.querySelector(tagName);
      return el ? el.textContent.trim() : '';
    };

    // Try to get image from various RSS formats
    const getImage = () => {
      // media:thumbnail or media:content
      const mediaThumbnail = item.querySelector('thumbnail, content');
      if (mediaThumbnail?.getAttribute('url')) {
        return mediaThumbnail.getAttribute('url');
      }
      // enclosure
      const enclosure = item.querySelector('enclosure');
      if (enclosure?.getAttribute('url')?.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
        return enclosure.getAttribute('url');
      }
      // Look for image in description
      const description = getElementText('description');
      const imgMatch = description.match(/<img[^>]+src="([^"]+)"/);
      if (imgMatch) return imgMatch[1];

      return 'https://assetsnffrgf-a.akamaihd.net/assets/m/802013131/univ/art/802013131_univ_lsr_lg.jpg';
    };

    const title = getElementText('title');
    const link = getElementText('link');
    const description = getElementText('description')
      .replace(/<[^>]*>/g, '') // Strip HTML
      .slice(0, 200);
    const pubDate = getElementText('pubDate');
    const category = getElementText('category') || 'NEWS';

    // Determine filter category based on content
    let filterCategory = 'articles';
    const lowerTitle = title.toLowerCase();
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('video') || lowerTitle.includes('video')) {
      filterCategory = 'videos';
    } else if (lowerCategory.includes('magazine') || lowerTitle.includes('watchtower') || lowerTitle.includes('awake')) {
      filterCategory = 'magazines';
    }

    return {
      id: `rss-${index}-${Date.now()}`,
      type: filterCategory === 'videos' ? 'video' : 'news_release',
      filterCategory,
      category: category.toUpperCase(),
      title,
      description,
      thumbnail: getImage(),
      url: link,
      jwLibraryUrl: link,
      isVideo: filterCategory === 'videos',
      pubDate,
    };
  });
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
      rssFeedUrl: RSS_FEED_URL,

      // Filters
      activeFilter: 'all', // 'all' | 'articles' | 'magazines' | 'videos'

      // Read tracking
      readItems: {},

      // Actions
      setFilter: (filter) => set({ activeFilter: filter }),

      setRssFeedUrl: (url) => set({ rssFeedUrl: url, lastFetched: null }),

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

      // Fetch news - tries RSS feed first, then API, then fallback
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

        // Try RSS feed if configured
        if (state.rssFeedUrl) {
          try {
            const response = await fetch(state.rssFeedUrl, {
              signal: AbortSignal.timeout(10000),
            });

            if (response.ok) {
              const xmlText = await response.text();
              const rssItems = parseRSSFeed(xmlText);

              if (rssItems.length > 0) {
                set({
                  items: rssItems,
                  lastFetched: Date.now(),
                  isLoading: false,
                  error: null,
                });
                return;
              }
            }
          } catch (err) {
            console.warn('RSS feed fetch failed:', err);
          }
        }

        // Try API endpoint
        try {
          const response = await fetch(getApiUrl(), {
            signal: AbortSignal.timeout(10000),
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
          // API not available - use fallback
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
      version: 5, // Bump to force refresh from new RSS feed
      partialize: (state) => ({
        // Don't persist items - always fetch fresh from API
        readItems: state.readItems,
      }),
    }
  )
);

export default useNewsStore;
