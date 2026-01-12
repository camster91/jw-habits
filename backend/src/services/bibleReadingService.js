import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache for Bible reading data
let bibleReadingCache = null;
let daysScriptureCache = null;

/**
 * Load Bible reading schedule from bible.txt
 */
async function loadBibleReadingSchedule() {
  if (bibleReadingCache) {
    return bibleReadingCache;
  }

  try {
    const biblePath = join(__dirname, '../../../bible.txt');
    const fileContent = await readFile(biblePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());

    bibleReadingCache = lines.map((line, index) => ({
      dayOfYear: index + 1,
      reading: line.trim()
    }));

    console.log(`✅ Loaded ${bibleReadingCache.length} days of Bible reading`);
    return bibleReadingCache;
  } catch (error) {
    console.error('Error loading Bible reading schedule:', error.message);
    return [];
  }
}

/**
 * Load daily scripture texts from days.txt
 */
async function loadDailyScriptures() {
  if (daysScriptureCache) {
    return daysScriptureCache;
  }

  try {
    const daysPath = join(__dirname, '../../../days.txt');
    const fileContent = await readFile(daysPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());

    daysScriptureCache = lines.map((line, index) => ({
      dayOfYear: index + 1,
      scripture: line.trim()
    }));

    console.log(`✅ Loaded ${daysScriptureCache.length} daily scriptures`);
    return daysScriptureCache;
  } catch (error) {
    console.error('Error loading daily scriptures:', error.message);
    return [];
  }
}

/**
 * Get Bible reading for a specific day of the year
 */
export async function getBibleReadingForDay(dayOfYear) {
  const schedule = await loadBibleReadingSchedule();
  const scriptures = await loadDailyScriptures();

  const reading = schedule.find(item => item.dayOfYear === dayOfYear);
  const scripture = scriptures.find(item => item.dayOfYear === dayOfYear);

  if (!reading) {
    return null;
  }

  // Estimate reading time (roughly 4 minutes per chapter)
  const chapterMatch = reading.reading.match(/(\d+)-(\d+)/);
  let estimatedTime = 5; // default
  if (chapterMatch) {
    const start = parseInt(chapterMatch[1]);
    const end = parseInt(chapterMatch[2]);
    const chapters = end - start + 1;
    estimatedTime = chapters * 4;
  }

  return {
    dayOfYear,
    reading: reading.reading,
    scripture: scripture ? scripture.scripture : '',
    estimatedMinutes: estimatedTime,
    wolUrl: generateWOLUrl(reading.reading)
  };
}

/**
 * Get Bible reading for today
 */
export async function getTodaysBibleReading() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  return await getBibleReadingForDay(dayOfYear);
}

/**
 * Get yearly progress (how many days of reading completed)
 */
export async function getYearlyProgress() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const currentDayOfYear = Math.floor(diff / oneDay);

  const schedule = await loadBibleReadingSchedule();

  return {
    currentDay: currentDayOfYear,
    totalDays: schedule.length,
    percentComplete: Math.round((currentDayOfYear / schedule.length) * 100)
  };
}

/**
 * Generate WOL URL for a Bible reading
 */
function generateWOLUrl(reading) {
  // Parse the reading text (e.g., "Genesis 1-3")
  const bookMatch = reading.match(/^([A-Za-z\s]+)\s+(\d+)/);
  if (!bookMatch) {
    return 'https://wol.jw.org/en/wol/binav/r1/lp-e';
  }

  const book = bookMatch[1].trim().toLowerCase();
  const chapter = bookMatch[2];

  // Simple book mapping (you can expand this)
  const bookMap = {
    'genesis': { num: 1, abbr: 'ge' },
    'exodus': { num: 2, abbr: 'ex' },
    'leviticus': { num: 3, abbr: 'le' },
    'numbers': { num: 4, abbr: 'nu' },
    'deuteronomy': { num: 5, abbr: 'de' },
    'joshua': { num: 6, abbr: 'jos' },
    'judges': { num: 7, abbr: 'jg' },
    'ruth': { num: 8, abbr: 'ru' },
    '1 samuel': { num: 9, abbr: '1sa' },
    '2 samuel': { num: 10, abbr: '2sa' },
    // Add more as needed
  };

  const bookInfo = bookMap[book];
  if (!bookInfo) {
    return `https://wol.jw.org/en/wol/binav/r1/lp-e/nwtsty/E/2026/${chapter}`;
  }

  return `https://wol.jw.org/en/wol/b/r1/lp-e/nwtsty/E/2026/${bookInfo.num}/${chapter}`;
}

/**
 * Get Bible reading range (multiple days)
 */
export async function getBibleReadingRange(startDay, endDay) {
  const schedule = await loadBibleReadingSchedule();
  return schedule.filter(item => item.dayOfYear >= startDay && item.dayOfYear <= endDay);
}
