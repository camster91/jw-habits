import express from 'express';
import {
  getBibleReadingForDay,
  getTodaysBibleReading,
  getYearlyProgress,
  getBibleReadingRange
} from '../services/bibleReadingService.js';

const router = express.Router();

/**
 * GET /api/bible-reading/today
 * Get today's Bible reading assignment
 */
router.get('/today', async (req, res) => {
  try {
    const reading = await getTodaysBibleReading();

    if (!reading) {
      return res.status(404).json({ error: 'No reading found for today' });
    }

    res.json(reading);
  } catch (error) {
    console.error('Error fetching today\'s Bible reading:', error);
    res.status(500).json({
      error: 'Failed to fetch Bible reading',
      message: error.message
    });
  }
});

/**
 * GET /api/bible-reading/day/:dayOfYear
 * Get Bible reading for a specific day of the year
 */
router.get('/day/:dayOfYear', async (req, res) => {
  try {
    const dayOfYear = parseInt(req.params.dayOfYear);

    if (isNaN(dayOfYear) || dayOfYear < 1 || dayOfYear > 366) {
      return res.status(400).json({ error: 'Invalid day of year (must be 1-366)' });
    }

    const reading = await getBibleReadingForDay(dayOfYear);

    if (!reading) {
      return res.status(404).json({ error: 'No reading found for this day' });
    }

    res.json(reading);
  } catch (error) {
    console.error('Error fetching Bible reading:', error);
    res.status(500).json({
      error: 'Failed to fetch Bible reading',
      message: error.message
    });
  }
});

/**
 * GET /api/bible-reading/progress
 * Get yearly reading progress
 */
router.get('/progress', async (req, res) => {
  try {
    const progress = await getYearlyProgress();
    res.json(progress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({
      error: 'Failed to fetch progress',
      message: error.message
    });
  }
});

/**
 * GET /api/bible-reading/range?start=1&end=7
 * Get Bible reading range
 */
router.get('/range', async (req, res) => {
  try {
    const start = parseInt(req.query.start) || 1;
    const end = parseInt(req.query.end) || 7;

    if (start < 1 || end > 366 || start > end) {
      return res.status(400).json({ error: 'Invalid range parameters' });
    }

    const readings = await getBibleReadingRange(start, end);
    res.json(readings);
  } catch (error) {
    console.error('Error fetching reading range:', error);
    res.status(500).json({
      error: 'Failed to fetch reading range',
      message: error.message
    });
  }
});

export default router;
