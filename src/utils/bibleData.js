// Bible reading schedule for "Read the Bible in a Year"
// This is a simplified version - in production, load from bible.txt file

export const getBibleReadingForDay = (dayOfYear) => {
  // Sample data - replace with actual schedule
  const schedule = {
    1: { books: 'Genesis 1-2', chapters: 'Genesis 1-2' },
    2: { books: 'Genesis 3-5', chapters: 'Genesis 3-5' },
    3: { books: 'Genesis 6-9', chapters: 'Genesis 6-9' },
    4: { books: 'Genesis 10-13', chapters: 'Genesis 10-13' },
    5: { books: 'Genesis 14-17', chapters: 'Genesis 14-17' },
    6: { books: 'Genesis 18-20', chapters: 'Genesis 18-20' },
    7: { books: 'Genesis 21-23', chapters: 'Genesis 21-23' },
    8: { books: 'Genesis 24-25', chapters: 'Genesis 24-25' },
    9: { books: 'Genesis 26-28', chapters: 'Genesis 26-28' },
    10: { books: 'Genesis 29-31', chapters: 'Genesis 29-31' },
    // Add more days...
  };

  return schedule[dayOfYear] || { books: 'Genesis 1', chapters: 'Genesis 1' };
};

export const getEstimatedReadingTime = (reading) => {
  // Rough estimate: 1 chapter = 3-5 minutes
  const chapterCount = reading.split('-').length > 1 ?
    parseInt(reading.split('-')[1]) - parseInt(reading.split('-')[0].match(/\d+/)[0]) + 1 : 1;
  return chapterCount * 4; // 4 minutes per chapter average
};

export const getWOLLink = (reading) => {
  // Generate WOL (Watchtower Online Library) link for the reading
  // Example: https://wol.jw.org/en/wol/b/r1/lp-e/nwtsty/E/2026/1/1
  const bookAbbr = reading.split(' ')[0].toLowerCase();
  const bookMap = {
    'genesis': { num: 1, abbr: 'Gen' },
    'exodus': { num: 2, abbr: 'Ex' },
    'leviticus': { num: 3, abbr: 'Lev' },
    // Add more books...
  };

  const book = bookMap[bookAbbr] || bookMap['genesis'];
  return `https://wol.jw.org/en/wol/b/r1/lp-e/nwtsty/E/2026/${book.num}/1`;
};
