// Vercel Serverless Function to fetch JW.org news
// This runs server-side, avoiding CORS issues

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate'); // 30 min cache

  try {
    const response = await fetch('https://www.jw.org/en/whats-new/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JW-News-App/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const items = parseWhatsNew(html);

    res.status(200).json({
      success: true,
      items,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      items: [],
    });
  }
}

// Parse the What's New page HTML
function parseWhatsNew(html) {
  const items = [];
  const lines = html.split('\n');
  let currentItem = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for article links
    const linkMatch = line.match(/href="(\/en\/[^"]+)"[^>]*>\s*([^<]+)/);
    if (linkMatch && linkMatch[2].trim().length > 10) {
      if (currentItem && currentItem.title) {
        items.push(currentItem);
      }
      currentItem = {
        id: `news-${items.length}-${Date.now()}`,
        url: `https://www.jw.org${linkMatch[1]}`,
        title: linkMatch[2].trim(),
        description: '',
        thumbnail: '',
        category: 'ARTICLES',
        type: 'news_release',
        filterCategory: 'articles',
        isVideo: false,
      };
    }

    // Look for images
    if (currentItem) {
      const imgMatch = line.match(/(?:src|data-src)="([^"]*(?:\.jpg|\.png|\.webp)[^"]*)"/i);
      if (imgMatch && !currentItem.thumbnail) {
        let thumb = imgMatch[1];
        if (!thumb.startsWith('http')) {
          thumb = `https://www.jw.org${thumb}`;
        }
        currentItem.thumbnail = thumb;
      }

      // Look for category
      const catMatch = line.match(/class="[^"]*(?:contextTitle|category)[^"]*"[^>]*>([^<]+)/i);
      if (catMatch) {
        currentItem.category = catMatch[1].trim().toUpperCase();
        currentItem.type = getType(currentItem.category);
        currentItem.filterCategory = getFilterCategory(currentItem.type);
        currentItem.isVideo = currentItem.type === 'video';
      }
    }
  }

  if (currentItem && currentItem.title) {
    items.push(currentItem);
  }

  // Filter to only valid items with titles
  const validItems = items
    .filter(item => item.title && item.title.length > 5 && item.url)
    .slice(0, 20); // Limit to 20 items

  // Add JW Library URLs
  validItems.forEach(item => {
    item.jwLibraryUrl = item.url.replace('https://www.jw.org', 'jwlibrary://');
  });

  return validItems;
}

function getType(category) {
  const upper = category.toUpperCase();
  if (upper.includes('VIDEO') || upper.includes('BROADCAST')) return 'video';
  if (upper.includes('WATCHTOWER') || upper.includes('AWAKE') || upper.includes('WORKBOOK')) return 'magazine';
  if (upper.includes('LIFE STOR')) return 'life_story';
  return 'news_release';
}

function getFilterCategory(type) {
  switch (type) {
    case 'video': return 'videos';
    case 'magazine': return 'magazines';
    default: return 'articles';
  }
}
