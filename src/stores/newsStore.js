import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// RSS Feed URL - JW-Newsfeed GitHub Pages
const RSS_FEED_URL = 'https://camster91.github.io/JW-Newsfeed/jw_feed.xml';

// API endpoint for fallback
const getApiUrl = () => '/api/news';

// Generate stable ID from URL
const generateStableId = (url) => {
  // Create a simple hash from the URL for a stable ID
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `item-${Math.abs(hash)}`;
};

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
      // media:thumbnail or media:content (namespace-aware search)
      // querySelector doesn't match namespace-prefixed elements like ns1:thumbnail,
      // so we search all elements for those with a 'url' attribute and matching local name
      const allElements = item.getElementsByTagName('*');
      for (const el of allElements) {
        const localName = el.localName || el.nodeName.split(':').pop();
        if ((localName === 'thumbnail' || localName === 'content') && el.getAttribute('url')) {
          return el.getAttribute('url');
        }
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
      id: generateStableId(link),
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
  }).sort((a, b) => {
    // Sort by publication date, newest first
    const dateA = a.pubDate ? new Date(a.pubDate) : new Date(0);
    const dateB = b.pubDate ? new Date(b.pubDate) : new Date(0);
    return dateB - dateA;
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
    {
      id: 'bible-dramatizations',
      type: 'video',
      filterCategory: 'videos',
      category: 'DRAMATIZATIONS',
      title: 'Bible Dramatizations',
      description: 'Dramatic video presentations of Bible accounts brought to life.',
      thumbnail: 'https://assetsnffrgf-a.akamaihd.net/assets/m/1001100116/univ/art/1001100116_univ_lsr_lg.jpg',
      url: 'https://www.jw.org/en/library/videos/#en/categories/VODBibleDramatizations',
      jwLibraryUrl: 'jwlibrary://content',
      isVideo: true,
    },
    {
      id: 'original-songs',
      type: 'video',
      filterCategory: 'videos',
      category: 'MUSIC',
      title: 'Original Songs',
      description: 'Beautiful original songs and music videos for worship and encouragement.',
      thumbnail: 'https://assetsnffrgf-a.akamaihd.net/assets/m/1001071810/univ/art/1001071810_univ_lsr_lg.jpg',
      url: 'https://www.jw.org/en/library/videos/#en/categories/VODMusicVideos',
      jwLibraryUrl: 'jwlibrary://content',
      isVideo: true,
    },
    {
      id: 'morning-worship',
      type: 'video',
      filterCategory: 'videos',
      category: 'MORNING WORSHIP',
      title: 'Morning Worship',
      description: 'Spiritual talks given at Bethel morning worship programs.',
      thumbnail: 'https://assetsnffrgf-a.akamaihd.net/assets/m/1001100110/univ/art/1001100110_univ_lsr_lg.jpg',
      url: 'https://www.jw.org/en/library/videos/#en/categories/VODBiblePrinciples/VODMorningWorship',
      jwLibraryUrl: 'jwlibrary://content',
      isVideo: true,
    },
    {
      id: 'convention-releases',
      type: 'video',
      filterCategory: 'videos',
      category: 'CONVENTIONS',
      title: 'Convention Releases',
      description: 'Videos and content released at regional conventions.',
      thumbnail: 'https://assetsnffrgf-a.akamaihd.net/assets/m/1001100113/univ/art/1001100113_univ_lsr_lg.jpg',
      url: 'https://www.jw.org/en/library/videos/#en/categories/VODConventionsRegional',
      jwLibraryUrl: 'jwlibrary://content',
      isVideo: true,
    },
    {
      id: 'whiteboard-animations',
      type: 'video',
      filterCategory: 'videos',
      category: 'ANIMATIONS',
      title: 'Whiteboard Animations',
      description: 'Animated explanations of Bible topics and principles.',
      thumbnail: 'https://assetsnffrgf-a.akamaihd.net/assets/m/1001100111/univ/art/1001100111_univ_lsr_lg.jpg',
      url: 'https://www.jw.org/en/library/videos/#en/categories/VODMinistryTools/VODWhiteboardAnimations',
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

      // Saved for later tracking
      savedItems: {},

      // Actions
      setFilter: (filter) => set({ activeFilter: filter }),

      setRssFeedUrl: (url) => set({ rssFeedUrl: url, lastFetched: null }),

      markAsRead: (itemId, itemUrl = null) =>
        set((state) => {
          const updates = { [itemId]: true };
          // Also track by URL hash as backup
          if (itemUrl) {
            updates[generateStableId(itemUrl)] = true;
          }
          return { readItems: { ...state.readItems, ...updates } };
        }),

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

      // Save for later functions
      toggleSaveItem: (item) =>
        set((state) => {
          const isSaved = state.savedItems[item.id];
          if (isSaved) {
            // Remove from saved
            const { [item.id]: _, ...rest } = state.savedItems;
            return { savedItems: rest };
          } else {
            // Add to saved (store the full item for offline access)
            return {
              savedItems: {
                ...state.savedItems,
                [item.id]: { ...item, savedAt: new Date().toISOString() }
              }
            };
          }
        }),

      isItemSaved: (itemId) => {
        const state = get();
        return !!state.savedItems[itemId];
      },

      getSavedItems: () => {
        const state = get();
        return Object.values(state.savedItems).sort(
          (a, b) => new Date(b.savedAt) - new Date(a.savedAt)
        );
      },

      getSavedCount: () => {
        const state = get();
        return Object.keys(state.savedItems).length;
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
            // Append cache-buster to bypass CDN/browser HTTP caching
            const feedUrl = new URL(state.rssFeedUrl);
            feedUrl.searchParams.set('_t', Date.now());

            const response = await fetch(feedUrl.toString(), {
              signal: AbortSignal.timeout(10000),
              cache: 'no-store',
              headers: {
                'Accept': 'application/rss+xml, application/xml, text/xml, */*',
              },
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

        // Fallback to curated content - show warning so user knows live feed failed
        const hasPreviousItems = state.items.length > 0 &&
          !state.items.every(item => getCuratedItems().some(c => c.id === item.id));

        set({
          items: hasPreviousItems ? state.items : getCuratedItems(),
          lastFetched: hasPreviousItems ? state.lastFetched : Date.now(),
          isLoading: false,
          error: 'Could not reach the news feed. Showing cached or default content.',
        });
      },

      // Get filtered items
      getFilteredItems: () => {
        const state = get();
        if (state.activeFilter === 'all') {
          return state.items;
        }
        if (state.activeFilter === 'saved') {
          return get().getSavedItems();
        }
        return state.items.filter((item) => item.filterCategory === state.activeFilter);
      },

      // Get latest items for dashboard widget
      getLatestItems: (count = 3) => {
        const state = get();
        return state.items.slice(0, count);
      },

      // Get unread items only for dashboard widget
      getUnreadItems: (count = 3) => {
        const state = get();
        return state.items
          .filter((item) => !state.readItems[item.id])
          .slice(0, count);
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
      version: 7, // Stable IDs for persistent read tracking
      partialize: (state) => ({
        // Persist read status and saved items
        readItems: state.readItems,
        savedItems: state.savedItems,
      }),
      migrate: (persistedState, version) => {
        // Migration from old versions - keep existing data
        if (version < 7) {
          return {
            ...persistedState,
            readItems: persistedState.readItems || {},
            savedItems: persistedState.savedItems || {},
          };
        }
        return persistedState;
      },
    }
  )
);

export default useNewsStore;
