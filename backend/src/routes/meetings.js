import express from 'express';
import NodeCache from 'node-cache';
import { getMeetingScheduleWithFallback } from '../scrapers/meetingsScraper.js';

const router = express.Router();

// Cache for 24 hours (86400 seconds)
const cache = new NodeCache({ stdTTL: 86400 });

/**
 * GET /api/meetings/current
 * Get this week's meeting schedule
 */
router.get('/current', async (req, res) => {
  try {
    const today = new Date();
    const weekKey = `week-${today.getFullYear()}-${Math.floor(today.getTime() / (7 * 24 * 60 * 60 * 1000))}`;

    // Check cache
    const cached = cache.get(weekKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // Scrape fresh data
    const meetingData = await getMeetingScheduleWithFallback(today);

    // Cache the result
    cache.set(weekKey, meetingData);

    res.json(meetingData);
  } catch (error) {
    console.error('Error fetching meeting schedule:', error);
    res.status(500).json({
      error: 'Failed to fetch meeting schedule',
      message: error.message
    });
  }
});

/**
 * GET /api/meetings/week/:year/:weekNumber
 * Get meeting schedule for a specific week
 */
router.get('/week/:year/:weekNumber', async (req, res) => {
  try {
    const { year, weekNumber } = req.params;
    const yearNum = parseInt(year);
    const weekNum = parseInt(weekNumber);

    if (isNaN(yearNum) || isNaN(weekNum) || weekNum < 1 || weekNum > 53) {
      return res.status(400).json({ error: 'Invalid year or week number' });
    }

    const weekKey = `week-${year}-${weekNumber}`;

    // Check cache
    const cached = cache.get(weekKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // Calculate date for that week
    const jan1 = new Date(yearNum, 0, 1);
    const daysOffset = (weekNum - 1) * 7;
    const targetDate = new Date(jan1.getTime() + daysOffset * 24 * 60 * 60 * 1000);

    // Scrape data
    const meetingData = await getMeetingScheduleWithFallback(targetDate);

    // Cache the result
    cache.set(weekKey, meetingData);

    res.json(meetingData);
  } catch (error) {
    console.error('Error fetching meeting schedule:', error);
    res.status(500).json({
      error: 'Failed to fetch meeting schedule',
      message: error.message
    });
  }
});

/**
 * POST /api/meetings/clear-cache
 * Clear the meetings cache (for testing/admin)
 */
router.post('/clear-cache', (req, res) => {
  cache.flushAll();
  res.json({ message: 'Cache cleared successfully' });
});

export default router;
