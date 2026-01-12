import puppeteer from 'puppeteer';
import { startOfWeek, format } from 'date-fns';

/**
 * Get the ISO week number for a date
 */
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Scrape weekly meeting schedule from WOL
 * @param {Date} date - Date within the week to fetch
 * @returns {Promise<Object>} Meeting data
 */
export async function scrapeMeetingSchedule(date = new Date()) {
  let browser;

  try {
    const year = date.getFullYear();
    const weekNumber = getISOWeek(date);

    const url = `https://wol.jw.org/en/wol/meetings/r1/lp-e/${year}/${weekNumber}`;

    console.log(`Scraping meeting schedule from: ${url}`);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for content
    await page.waitForSelector('.todayItems', { timeout: 10000 });

    // Extract meeting data
    const meetingData = await page.evaluate(() => {
      const result = {
        weekOf: '',
        bibleReading: '',
        songs: [],
        midweekMeeting: {
          theme: '',
          parts: []
        },
        weekendMeeting: {
          publicTalk: '',
          watchtowerArticle: ''
        }
      };

      // Get week range
      const weekRangeEl = document.querySelector('.todayItems h2');
      if (weekRangeEl) {
        result.weekOf = weekRangeEl.textContent.trim();
      }

      // Get Bible reading
      const bibleReadingEl = document.querySelector('.dc-icon--bible');
      if (bibleReadingEl && bibleReadingEl.nextElementSibling) {
        result.bibleReading = bibleReadingEl.nextElementSibling.textContent.trim();
      }

      // Get songs
      const songElements = document.querySelectorAll('.dc-icon--music');
      songElements.forEach(el => {
        if (el.nextElementSibling) {
          const songText = el.nextElementSibling.textContent.trim();
          const songNumber = songText.match(/\d+/);
          if (songNumber) {
            result.songs.push(parseInt(songNumber[0]));
          }
        }
      });

      // Get midweek meeting theme
      const midweekThemeEl = document.querySelector('.todayItems h3');
      if (midweekThemeEl) {
        result.midweekMeeting.theme = midweekThemeEl.textContent.trim();
      }

      // Get meeting parts
      const partsList = document.querySelectorAll('.todayItems li');
      partsList.forEach(li => {
        const title = li.querySelector('.du-color--maroon, .du-color--gold, .du-color--mediumEmphasis');
        const time = li.querySelector('.du-fontSize--baseMinus1');

        if (title) {
          result.midweekMeeting.parts.push({
            title: title.textContent.trim(),
            time: time ? time.textContent.trim() : '',
            section: li.closest('[class*="section"]')?.className || ''
          });
        }
      });

      // Try to get Watchtower study article
      const wtStudyEl = document.querySelector('a[href*="study-edition"]');
      if (wtStudyEl) {
        result.weekendMeeting.watchtowerArticle = wtStudyEl.textContent.trim();
      }

      return result;
    });

    // Calculate week start date (Monday)
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekStartFormatted = format(weekStart, 'yyyy-MM-dd');

    return {
      weekStart: weekStartFormatted,
      year,
      weekNumber,
      ...meetingData,
      sourceUrl: url
    };

  } catch (error) {
    console.error('Error scraping meeting schedule:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Get meeting schedule with fallback
 */
export async function getMeetingScheduleWithFallback(date = new Date()) {
  try {
    return await scrapeMeetingSchedule(date);
  } catch (error) {
    console.error('Failed to scrape meeting schedule, using fallback data');

    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekStartFormatted = format(weekStart, 'yyyy-MM-dd');

    return {
      weekStart: weekStartFormatted,
      year: date.getFullYear(),
      weekNumber: getISOWeek(date),
      weekOf: format(weekStart, 'MMMM d') + ' - ' + format(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000), 'MMMM d, yyyy'),
      bibleReading: 'Genesis 17-18',
      songs: [1, 25, 103, 45, 72, 133],
      midweekMeeting: {
        theme: 'Appreciating God\'s Mercy',
        parts: [
          { title: 'Opening Comments', time: '1 min', section: 'opening' },
          { title: 'Treasures From God\'s Word', time: '10 min', section: 'treasures' },
          { title: 'Spiritual Gems', time: '10 min', section: 'treasures' },
          { title: 'Bible Reading', time: '4 min', section: 'ministry' },
          { title: 'Initial Call', time: '3 min', section: 'ministry' },
          { title: 'Return Visit', time: '4 min', section: 'ministry' },
          { title: 'Bible Study', time: '5 min', section: 'ministry' },
          { title: 'Congregation Bible Study', time: '30 min', section: 'living' }
        ]
      },
      weekendMeeting: {
        publicTalk: 'Why We Can Trust the Bible',
        watchtowerArticle: 'Love Bears All Things'
      },
      sourceUrl: 'https://wol.jw.org/en/wol/meetings/r1/lp-e',
      isFallback: true
    };
  }
}
