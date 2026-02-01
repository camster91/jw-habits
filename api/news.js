// Vercel Serverless Function to fetch JW.org RSS feed
// This runs server-side, avoiding CORS issues

const RSS_FEED_URL = 'https://www.jw.org/en/whats-new/rss/WhatsNewWebArticles/feed.xml';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate'); // 30 min cache

  try {
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
      items,
      source: 'rss',
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('RSS fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      items: [],
    });
  }
}

// Parse RSS XML feed
function parseRSSFeed(xml) {
  const items = [];

  // Extract all <item> elements
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

  itemMatches.forEach((itemXml, index) => {
    const getTagContent = (tag) => {
      const match = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      if (match) {
        // Handle CDATA
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
      .replace(/<[^>]*>/g, '') // Strip HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim()
      .slice(0, 250);
    const pubDate = getTagContent('pubDate');
    const category = getTagContent('category') || 'NEWS';

    // Extract image from enclosure or media:thumbnail
    let thumbnail = '';
    const enclosureMatch = itemXml.match(/<enclosure[^>]+url="([^"]+)"/);
    if (enclosureMatch) {
      thumbnail = enclosureMatch[1];
    }
    const mediaMatch = itemXml.match(/<media:thumbnail[^>]+url="([^"]+)"/);
    if (mediaMatch) {
      thumbnail = mediaMatch[1];
    }
    // Try to extract image from description HTML
    if (!thumbnail) {
      const imgMatch = getTagContent('description').match(/src="([^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);
      if (imgMatch) {
        thumbnail = imgMatch[1];
      }
    }
    // Default thumbnail
    if (!thumbnail) {
      thumbnail = 'https://assetsnffrgf-a.akamaihd.net/assets/m/802013131/univ/art/802013131_univ_lsr_lg.jpg';
    }

    // Determine type and filter category
    const type = getType(category, title, link);
    const filterCategory = getFilterCategory(type);

    // Generate stable ID from URL
    const generateStableId = (url) => {
      let hash = 0;
      for (let i = 0; i < url.length; i++) {
        const char = url.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return `item-${Math.abs(hash)}`;
    };

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
        jwLibraryUrl: link.replace('https://www.jw.org', 'jwlibrary://'),
      });
    }
  });

  return items.slice(0, 30); // Limit to 30 items
}

function getType(category, title, url) {
  const combined = `${category} ${title}`.toUpperCase();
  const urlLower = (url || '').toLowerCase();

  // Check URL patterns for actual videos
  const isVideoUrl = urlLower.includes('/videos/') ||
                     urlLower.includes('mediaitems') ||
                     urlLower.includes('/video/');

  // Exclude articles that mention "video" but aren't videos
  const isVideoArticle = combined.includes('VIDEO REFERENCE') ||
                         combined.includes('VIDEO GUIDE') ||
                         combined.includes('ABOUT VIDEO');

  // Only mark as video if URL indicates video OR category explicitly says video (not just title)
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
