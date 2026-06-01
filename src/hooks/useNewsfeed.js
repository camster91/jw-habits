import { useState, useEffect } from 'react';

const FEED_URL = 'https://camster91.github.io/JW-Newsfeed/jw_feed.xml';
const CACHE_KEY = 'jw-newsfeed-cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetches and caches JW.org newsfeed from the RSS feed.
 * Returns { items, loading, error }
 */
export default function useNewsfeed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchFeed() {
      try {
        // Check cache first
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < CACHE_TTL) {
              if (!cancelled) {
                setItems(parsed.items);
                setLoading(false);
              }
              return;
            }
          } catch {
            // Invalid cache — refetch
          }
        }

        const resp = await fetch(FEED_URL);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const xml = await resp.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'application/xml');
        const parseError = doc.querySelector('parsererror');
        if (parseError) throw new Error('XML parse failed');

        const itemNodes = doc.querySelectorAll('item');
        const parsed = [];
        for (const node of itemNodes) {
          const title = node.querySelector('title')?.textContent || '';
          const link = node.querySelector('link')?.textContent || '';
          const description = node.querySelector('description')?.textContent || '';
          const pubDate = node.querySelector('pubDate')?.textContent || '';
          const category = node.querySelector('category')?.textContent || '';
          const thumbnail =
            node.querySelector('thumbnail')?.getAttribute('url') ||
            node.querySelector('ns1\\:thumbnail')?.getAttribute('url') ||
            '';

          // Skip items without essential data
          if (!title || !link) continue;

          parsed.push({ title, link, description, pubDate, category, thumbnail });
        }

        // Cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), items: parsed }));

        if (!cancelled) {
          setItems(parsed);
          setLoading(false);
        }
      } catch (err) {
        // If fetch fails, try stale cache as fallback
        const staleCache = localStorage.getItem(CACHE_KEY);
        if (staleCache) {
          try {
            const parsed = JSON.parse(staleCache);
            if (!cancelled) {
              setItems(parsed.items);
              setLoading(false);
            }
            return;
          } catch {
            // Nothing we can do
          }
        }

        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    fetchFeed();
    return () => { cancelled = true; };
  }, []);

  return { items, loading, error };
}
