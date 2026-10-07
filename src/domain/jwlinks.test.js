import { describe, it, expect } from 'vitest';
import { dailyTextUrl, isJwFinderLink, linkLabel } from './jwlinks.js';
import { routineLink } from './links.js';
import { defaultStore } from './store.js';

const store = () => ({ ...defaultStore('2026-10-07', 'en'), links: {} });
const t = (key) => key;

describe('dailyTextUrl', () => {
  it('builds the finder link with wtlocale and an undashed date', () => {
    expect(dailyTextUrl('es', '2026-10-07')).toBe(
      'https://www.jw.org/finder?srcid=jwlshare&wtlocale=S&prefer=lang&alias=daily-text&date=20261007'
    );
    expect(dailyTextUrl('en', '2026-01-02')).toContain('wtlocale=E');
    expect(dailyTextUrl('fr', '2026-01-02')).toContain('wtlocale=F');
  });
});

describe('routineLink daily text', () => {
  it('uses the finder format with the given day', () => {
    expect(routineLink(store(), 'dailyText', 'fr', undefined, '2026-10-07')).toBe(
      'https://www.jw.org/finder?srcid=jwlshare&wtlocale=F&prefer=lang&alias=daily-text&date=20261007'
    );
  });
  it('uses the current app day when none is given', () => {
    expect(routineLink(store(), 'dailyText', 'fr')).toMatch(
      /^https:[/][/]www[.]jw[.]org[/]finder[?].*wtlocale=F.*date=[0-9]{8}$/
    );
  });
  it('keeps meetings on wol.jw.org', () => {
    expect(routineLink(store(), 'meetingPrep', 'en', undefined, '2026-10-07')).toBe(
      'https://wol.jw.org/en/wol/meetings/r1/lp-e'
    );
  });
});

describe('isJwFinderLink', () => {
  it('is true for finder links', () => {
    for (const u of [
      'https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&alias=daily-text&date=20261007',
      'https://www.jw.org/finder?wtlocale=E&prefer=lang&bible=19003001&pub=nwtsty',
      'https://jw.org/finder?wtlocale=S&docid=1102026001',
      'https://www.jw.org/finder?wtlocale=F&pub=w&issue=202601',
    ])
      expect(isJwFinderLink(u)).toBe(true);
  });
  it('is false for everything else', () => {
    expect(isJwFinderLink('https://wol.jw.org/en/wol/dt/r1/lp-e')).toBe(false);
    expect(isJwFinderLink('http://www.jw.org/finder?x=1')).toBe(false);
    expect(isJwFinderLink('https://www.jw.org/en/')).toBe(false);
    expect(isJwFinderLink('https://evil.example/finder')).toBe(false);
    expect(isJwFinderLink('nonsense')).toBe(false);
    expect(isJwFinderLink(null)).toBe(false);
  });
});

describe('linkLabel', () => {
  it('names JW Library for finder links, otherwise the host', () => {
    expect(linkLabel('https://www.jw.org/finder?wtlocale=E', t)).toBe('fd.links.opensInLibrary');
    expect(linkLabel('https://wol.jw.org/en/wol/dt/r1/lp-e', t)).toBe('wol.jw.org');
  });
});
