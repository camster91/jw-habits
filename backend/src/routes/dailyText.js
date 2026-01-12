import express from 'express';
import NodeCache from 'node-cache';
import { getDailyTextWithFallback } from '../scrapers/dailyTextScraper.js';

const router = express.Router();

// Cache for 12 hours (43200 seconds)
const cache = new NodeCache({ stdTTL: 43200 });

/**
 * GET /api/daily-text/today
 * Get today's daily text
 */
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `daily-text-${today}`;

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // Scrape fresh data
    const dailyText = await getDailyTextWithFallback();

    // Cache the result
    cache.set(cacheKey, dailyText);

    res.json(dailyText);
  } catch (error) {
    console.error('Error fetching daily text:', error);
    res.status(500).json({
      error: 'Failed to fetch daily text',
      message: error.message
    });
  }
});

/**
 * GET /api/daily-text/:date
 * Get daily text for a specific date (YYYY-MM-DD)
 */
router.get('/:date', async (req, res) => {
  try {
    const { date } = req.params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const cacheKey = `daily-text-${date}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // Scrape for specific date
    const dateObj = new Date(date);
    const dailyText = await getDailyTextWithFallback(dateObj);

    // Cache the result
    cache.set(cacheKey, dailyText);

    res.json(dailyText);
  } catch (error) {
    console.error('Error fetching daily text:', error);
    res.status(500).json({
      error: 'Failed to fetch daily text',
      message: error.message
    });
  }
});

export default router;
