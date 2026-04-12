const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const VITE_PORT = process.env.VITE_PORT || 5174;

const allowedOrigins = [
  'https://budget.ashbi.ca',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:3009',
];

// Enable CORS for allowed origins only
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));

// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));

// API endpoint for news (mimics Vercel serverless function)
app.get('/api/news', async (req, res) => {
  try {
    // Import the API handler from api/news.js
    // Since it's an ES module, we'll implement a simplified version here
    const RSS_FEED_URL = 'https://www.jw.org/en/whats-new/rss/WhatsNewWebArticles/';
    
    const response = await fetch(RSS_FEED_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JW-News-App/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS: ${response.status}`);
    }

    const xml = await response.text();
    const items = parseRSSFeed(xml);

    res.status(200).json({
      success: true,
      items: items.slice(0, 30),
      source: 'rss',
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('RSS fetch error:', error);
    
    // Fallback to curated items
    const curatedItems = getCuratedItems();
    res.status(200).json({
      success: true,
      items: curatedItems,
      source: 'curated',
      fetchedAt: new Date().toISOString(),
    });
  }
});

// Helper functions from api/news.js
function parseRSSFeed(xml) {
  const items = [];
  
  // Simple regex-based parsing (similar to api/news.js)
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  
  itemMatches.forEach((itemXml) => {
    const getTagContent = (tag) => {
      const match = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      if (match) {
        let content = match[1];
        const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
        if (cdataMatch) {
          content = cdataMatch[1];
        }
        return content.trim();
      }
      return '';
    };

    const title = getTagContent('title');
    const link = getTagContent('link');
    const description = getTagContent('description')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim()
      .slice(0, 250);
    const pubDate = getTagContent('pubDate');
    const category = getTagContent('category') || 'NEWS';
    
    // Generate a stable ID
    const generateStableId = (url) => {
      let hash = 0;
      for (let i = 0; i < url.length; i++) {
        const char = url.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return `item-${Math.abs(hash)}`;
    };
    
    // Determine type
    const type = getItemType(category, title, link);
    const filterCategory = getFilterCategory(type);
    
    let thumbnail = '';
    const enclosureMatch = itemXml.match(/<enclosure[^>]+url="([^"]+)"/);
    if (enclosureMatch) {
      thumbnail = enclosureMatch[1];
    }
    const mediaMatch = itemXml.match(/<media:thumbnail[^>]+url="([^"]+)"/);
    if (mediaMatch) {
      thumbnail = mediaMatch[1];
    }
    if (!thumbnail) {
      const imgMatch = getTagContent('description').match(/src="([^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);
      if (imgMatch) {
        thumbnail = imgMatch[1];
      }
    }
    if (!thumbnail) {
      thumbnail = 'https://www.jw.org/assets/img/logo-jw.svg';
    }
    
    if (title && link) {
      items.push({
        id: generateStableId(link),
        title,
        url: link,
        description,
        thumbnail,
        pubDate,
        category: category.toUpperCase(),
        type,
        filterCategory,
        isVideo: type === 'video',
        jwLibraryUrl: link.replace('https://www.jw.org/', 'jwlibrary:/'),
      });
    }
  });
  
  return items;
}

function getItemType(category, title, url) {
  const combined = `${category} ${title}`.toUpperCase();
  const urlLower = (url || '').toLowerCase();
  
  const isVideoUrl = urlLower.includes('/videos/') ||
                     urlLower.includes('mediaitems') ||
                     urlLower.includes('/video/');
  
  const isVideoArticle = combined.includes('VIDEO REFERENCE') ||
                         combined.includes('VIDEO GUIDE') ||
                         combined.includes('ABOUT VIDEO');
  
  if (isVideoUrl || (category.toUpperCase().includes('VIDEO') && !isVideoArticle)) {
    return 'video';
  }
  if (combined.includes('BROADCAST') && !isVideoArticle) {
    return 'video';
  }
  if (combined.includes('WATCHTOWER') || combined.includes('AWAKE') || combined.includes('WORKBOOK') || combined.includes('MAGAZINE')) {
    return 'magazine';
  }
  if (combined.includes('LIFE STOR')) {
    return 'life_story';
  }
  return 'news_release';
}

function getFilterCategory(type) {
  switch (type) {
    case 'video': return 'videos';
    case 'magazine': return 'magazines';
    default: return 'articles';
  }
}

function getCuratedItems() {
  return [
    {
      id: 'whats-new',
      type: 'news_release',
      filterCategory: 'articles',
      category: "WHAT'S NEW",
      title: 'Latest Updates on JW.org',
      description: 'See the latest news, articles, videos, and spiritual encouragement from jw.org.',
      thumbnail: 'https://www.jw.org/assets/img/logo-jw.svg',
      url: 'https://www.jw.org/en/whats-new/',
      jwLibraryUrl: 'jwlibrary:/en/whats-new/',
      isVideo: false,
    },
    {
      id: 'latest-videos',
      type: 'video',
      filterCategory: 'videos',
      category: 'VIDEOS',
      title: 'Latest Videos',
      description: 'Watch the newest videos including talks, dramatizations, music, and more.',
      thumbnail: 'https://www.jw.org/assets/img/logo-jw.svg',
      url: 'https://www.jw.org/en/whats-new/videos/',
      jwLibraryUrl: 'jwlibrary:/en/whats-new/videos/',
      isVideo: true,
    },
    {
      id: 'watchtower-study',
      type: 'magazine',
      filterCategory: 'magazines',
      category: 'THE WATCHTOWER',
      title: 'Watchtower Study Edition',
      description: 'Read the latest Watchtower study edition for meeting preparation.',
      thumbnail: 'https://www.jw.org/assets/img/logo-jw.svg',
      url: 'https://www.jw.org/en/library/magazines/watchtower-study/',
      jwLibraryUrl: 'jwlibrary:/en/library/magazines/watchtower-study/',
      isVideo: false,
    },
  ];
}

// In development, proxy all other requests to Vite dev server
if (process.env.NODE_ENV !== 'production') {
  app.use(
    '/',
    createProxyMiddleware({
      target: `http://localhost:${VITE_PORT}`,
      changeOrigin: true,
      ws: true, // Enable WebSocket proxying for HMR
      logLevel: 'silent',
    })
  );
  
  console.log(`Development mode: Proxying to Vite dev server on port ${VITE_PORT}`);
} else {
  // In production, serve static files from dist directory
  app.use(express.static(path.join(__dirname, 'dist')));
  
  // Handle SPA routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
  
  console.log('Production mode: Serving static files from dist directory');
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api/news`);
});