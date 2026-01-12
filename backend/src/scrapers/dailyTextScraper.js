import puppeteer from 'puppeteer';

/**
 * Scrape daily text from WOL (Watchtower Online Library)
 * @param {Date} date - The date to fetch daily text for
 * @returns {Promise<Object>} Daily text data
 */
export async function scrapeDailyText(date = new Date()) {
  let browser;

  try {
    // Format date as YYYY/M/D for WOL URL
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const url = `https://wol.jw.org/en/wol/dt/r1/lp-e/${year}/${month}/${day}`;

    console.log(`Scraping daily text from: ${url}`);

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

    // Wait for content to load
    await page.waitForSelector('.todaysText', { timeout: 10000 });

    // Extract daily text data
    const dailyText = await page.evaluate(() => {
      const container = document.querySelector('.todaysText');
      if (!container) return null;

      // Get scripture reference
      const scriptureEl = container.querySelector('header a');
      const scripture = scriptureEl ? scriptureEl.textContent.trim() : '';

      // Get the text itself
      const textParagraphs = container.querySelectorAll('.pGroup > p');
      const textParts = [];
      textParagraphs.forEach(p => {
        const text = p.textContent.trim();
        if (text) textParts.push(text);
      });

      // Get theme/title
      const themeEl = container.querySelector('h2');
      const theme = themeEl ? themeEl.textContent.trim() : '';

      // Get the scripture text (quoted verse)
      const scriptureTextEl = container.querySelector('.themeScrp');
      const scriptureText = scriptureTextEl ? scriptureTextEl.textContent.trim() : '';

      // Get commentary
      const commentaryEl = container.querySelector('.bodyTxt');
      const commentary = commentaryEl ? commentaryEl.textContent.trim() : '';

      return {
        scripture,
        theme,
        scriptureText,
        text: textParts.join('\n\n'),
        commentary
      };
    });

    if (!dailyText) {
      throw new Error('Could not extract daily text from page');
    }

    // Format the date
    const dateFormatted = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return {
      date: date.toISOString().split('T')[0],
      dateFormatted,
      ...dailyText,
      sourceUrl: url
    };

  } catch (error) {
    console.error('Error scraping daily text:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Get daily text with fallback to sample data
 */
export async function getDailyTextWithFallback(date = new Date()) {
  try {
    return await scrapeDailyText(date);
  } catch (error) {
    console.error('Failed to scrape daily text, using fallback data');

    // Return sample data as fallback
    const dateFormatted = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return {
      date: date.toISOString().split('T')[0],
      dateFormatted,
      scripture: 'Zephaniah 2:3',
      theme: 'Keep Seeking Jehovah',
      scriptureText: 'Seek Jehovah, all you meek ones of the earth, who observe his righteous decrees. Seek righteousness, seek meekness. Probably you will be concealed on the day of Jehovah's anger.',
      text: 'In these critical times, it is more important than ever to seek Jehovah through prayer, Bible study, and association with fellow believers.',
      commentary: 'By cultivating meekness and righteousness, we prepare ourselves for Jehovah's day. Let us never stop seeking him with our whole heart.',
      sourceUrl: 'https://wol.jw.org/en/wol/dt/r1/lp-e',
      isFallback: true
    };
  }
}
