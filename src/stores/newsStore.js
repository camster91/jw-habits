import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// RSS Feed URL - JW-Newsfeed GitHub Pages (contains both articles and videos)
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

// Classify item type from category, title, and URL
const getItemType = (category, title, url) => {
  const combined = `${category} ${title}`.toUpperCase();
  const urlLower = (url || '').toLowerCase();

  // Check URL patterns for actual videos
  const isVideoUrl = urlLower.includes('/videos/') ||
                     urlLower.includes('mediaitems') ||
                     urlLower.includes('/video/') ||
                     urlLower.includes('_video');

  // Exclude articles that mention "video" but aren't videos
  const isVideoArticle = combined.includes('VIDEO REFERENCE') ||
                         combined.includes('VIDEO GUIDE');

  if (isVideoUrl || (category.toUpperCase().includes('VIDEO') && !isVideoArticle)) {
    return 'video';
  }
  if (combined.includes('BROADCAST') && !isVideoArticle) {
    return 'video';
  }
  if (combined.includes('WATCHTOWER') || combined.includes('AWAKE') ||
      combined.includes('WORKBOOK') || combined.includes('MAGAZINE') ||
      urlLower.includes('/magazines/')) {
    return 'magazine';
  }
  if (combined.includes('LIFE STOR')) {
    return 'life_story';
  }
  return 'news_release';
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

    // Determine type and filter category using URL, title, and category
    const type = getItemType(category, title, link);
    const filterCategory = type === 'video' ? 'videos' : type === 'magazine' ? 'magazines' : 'articles';

    return {
      id: generateStableId(link),
      type,
      filterCategory,
      category: category.toUpperCase(),
      title,
      description,
      thumbnail: getImage(),
      url: link,
      jwLibraryUrl: link,
      isVideo: type === 'video',
      pubDate,
    };
  }).filter((item) => {
    // Filter out meta/self-referential items
    return item.url !== 'https://www.jw.org/en/whats-new/' && item.title !== 'See What\'s New';
  });
};

// Split fetched items into articles and videos
const splitItems = (allItems) => {
  const newsItems = allItems.filter((item) => item.type !== 'video');
  const videoItems = allItems.filter((item) => item.type === 'video');
  return { newsItems, videoItems };
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
      // Feed state — items = articles/magazines, videoItems = videos
      // Both are derived from the same single feed
      items: getCuratedItems().filter((i) => i.type !== 'video'),
      videoItems: getCuratedItems().filter((i) => i.type === 'video'),
      lastFetched: null,
      isLoading: false,
      error: null,
      rssFeedUrl: RSS_FEED_URL,

      // Active feed: 'news' (What's New) or 'videos' (Latest Videos)
      activeFeed: 'news',

      // Filters
      activeFilter: 'all', // 'all' | 'articles' | 'magazines' | 'videos' | 'saved'

      // Read tracking (shared across both feeds)
      readItems: {},

      // Saved for later tracking (shared across both feeds)
      savedItems: {},

      // Actions
      setActiveFeed: (feed) => set({ activeFeed: feed, activeFilter: 'all' }),

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
        set((state) => {
          const currentItems = state.activeFeed === 'videos' ? state.videoItems : state.items;
          return {
            readItems: {
              ...state.readItems,
              ...currentItems.reduce((acc, item) => {
                acc[item.id] = true;
                return acc;
              }, {}),
            },
          };
        }),

      isItemRead: (itemId) => {
        const state = get();
        return state.readItems[itemId] || false;
      },

      // Total unread count across both feeds (for nav badge)
      getTotalUnreadCount: () => {
        const state = get();
        const newsUnread = state.items.filter((item) => !state.readItems[item.id]).length;
        const videosUnread = state.videoItems.filter((item) => !state.readItems[item.id]).length;
        return newsUnread + videosUnread;
      },

      // Unread count for current active feed
      getUnreadCount: () => {
        const state = get();
        const currentItems = state.activeFeed === 'videos' ? state.videoItems : state.items;
        return currentItems.filter((item) => !state.readItems[item.id]).length;
      },

      // Per-feed unread counts (for feed tab badges)
      getNewsUnreadCount: () => {
        const state = get();
        return state.items.filter((item) => !state.readItems[item.id]).length;
      },
      getVideosUnreadCount: () => {
        const state = get();
        return state.videoItems.filter((item) => !state.readItems[item.id]).length;
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

      // Fetch feed — single fetch, split into articles vs videos
      fetchNews: async (forceRefresh = false) => {
        const state = get();

        // Check cache validity
        if (
          !forceRefresh &&
          state.lastFetched &&
          Date.now() - state.lastFetched < CACHE_DURATION &&
          (state.items.length > 0 || state.videoItems.length > 0)
        ) {
          return; // Use cached data
        }

        set({ isLoading: true, error: null });

        let allItems = null;

        // Try API endpoint first (fetches from jw.org RSS with correct dates)
        try {
          const response = await fetch(getApiUrl(), {
            signal: AbortSignal.timeout(10000),
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.items && data.items.length > 0) {
              allItems = data.items;
            }
          }
        } catch {
          // API not available — try RSS feed
        }

        // Fallback to GitHub-hosted RSS feed
        if (!allItems) {
          try {
            const response = await fetch(state.rssFeedUrl || RSS_FEED_URL, {
              signal: AbortSignal.timeout(10000),
            });
            if (response.ok) {
              const xmlText = await response.text();
              const rssItems = parseRSSFeed(xmlText);
              if (rssItems.length > 0) {
                allItems = rssItems;
              }
            }
          } catch (err) {
            console.warn('RSS feed fetch failed:', err);
          }
        }

        // Fallback to curated content
        if (!allItems) {
          allItems = getCuratedItems();
        }

        // Split into news (articles/magazines) and videos
        const { newsItems, videoItems } = splitItems(allItems);

        set({
          items: newsItems,
          videoItems,
          lastFetched: Date.now(),
          isLoading: false,
          error: null,
        });
      },

      // Get filtered items for the active feed
      getFilteredItems: () => {
        const state = get();
        const currentItems = state.activeFeed === 'videos' ? state.videoItems : state.items;

        if (state.activeFilter === 'all') {
          return currentItems;
        }
        if (state.activeFilter === 'saved') {
          return get().getSavedItems();
        }
        return currentItems.filter((item) => item.filterCategory === state.activeFilter);
      },

      // Get latest items for dashboard widget (from news feed)
      getLatestItems: (count = 3) => {
        const state = get();
        return state.items.slice(0, count);
      },

      // Get unread items from both feeds for dashboard widget
      getUnreadItems: (count = 3) => {
        const state = get();
        const allItems = [...state.items, ...state.videoItems];
        return allItems
          .filter((item) => !state.readItems[item.id])
          .slice(0, count);
      },

      // Refresh content
      clearCache: () => {
        const curated = getCuratedItems();
        const { newsItems, videoItems } = splitItems(curated);
        set({
          items: newsItems,
          videoItems,
          lastFetched: null,
          error: null,
        });
      },
    }),
    {
      name: 'jw-news-storage',
      version: 9, // Single-feed split into articles + videos
      partialize: (state) => ({
        // Persist read status and saved items
        readItems: state.readItems,
        savedItems: state.savedItems,
      }),
      migrate: (persistedState, version) => {
        // Migration from old versions - keep existing data
        if (version < 9) {
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
