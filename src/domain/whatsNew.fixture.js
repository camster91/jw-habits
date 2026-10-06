/** Shape of the live jw.org What's New feed, trimmed to 3 items. Test-only. */
export const FIXTURE_TITLES = [
  'BOOKS | God’s Word Is Truth—A Handbook to the Bible',
  'VIDEOS | A Fixture Video Title',
  'ARTICLES | A Fixture Article Title',
];
export const FIXTURE_DESCRIPTIONS = [
  'Fixture description one',
  'Fixture description two',
  'Fixture description three',
];

const item = (i, guid, date) =>
  `<item><guid isPermaLink="false">${guid}</guid><title>${FIXTURE_TITLES[i]}</title>` +
  `<link>https://www.jw.org/en/library/x${i}/</link><description><![CDATA[` +
  `<img src="https://cms-imgp.jw-cdn.org/img/x${i}.jpg" width="100"/><p>${FIXTURE_DESCRIPTIONS[i]}</p>` +
  `]]></description><pubDate>${date}</pubDate></item>`;

export const FEED_XML =
  '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>' +
  '<title>JW.ORG - What’s New</title><link>https://www.jw.org/en/whats-new/</link>' +
  item(0, 'aaa111', 'Sat, 03 Oct 2026 00:00:00 +0000') +
  item(1, 'bbb222', 'Fri, 02 Oct 2026 00:00:00 +0000') +
  item(2, 'ccc333', 'Thu, 01 Oct 2026 00:00:00 +0000') +
  '</channel></rss>';

export const EMPTY_FEED_XML =
  '<rss version="2.0"><channel><title>JW.ORG - What’s New</title></channel></rss>';
