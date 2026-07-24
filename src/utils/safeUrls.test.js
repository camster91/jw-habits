import { describe, it, expect } from 'vitest';
import { isSafeHttpUrl, toSameOriginPath } from './safeUrls';

describe('isSafeHttpUrl', () => {
  it('accepts http and https', () => {
    expect(isSafeHttpUrl('https://www.jw.org/en/')).toBe(true);
    expect(isSafeHttpUrl('http://example.com/path')).toBe(true);
  });

  it('rejects javascript/data and credentialed URLs', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,hi')).toBe(false);
    expect(isSafeHttpUrl('https://user:pass@evil.com/')).toBe(false);
  });

  it('rejects empty / garbage', () => {
    expect(isSafeHttpUrl('')).toBe(false);
    expect(isSafeHttpUrl('not a url')).toBe(false);
    expect(isSafeHttpUrl(null)).toBe(false);
  });
});

describe('toSameOriginPath', () => {
  const origin = 'https://jwhabits.ashbi.ca';

  it('keeps same-origin relative paths', () => {
    expect(toSameOriginPath('/share?x=1', origin)).toBe('/share?x=1');
  });

  it('rewrites absolute same-origin URLs', () => {
    expect(toSameOriginPath('https://jwhabits.ashbi.ca/foo', origin)).toBe('/foo');
  });

  it('falls back for external or protocol-relative URLs', () => {
    expect(toSameOriginPath('https://evil.example/', origin)).toBe('/');
    expect(toSameOriginPath('//evil.example/phish', origin)).toBe('/');
    expect(toSameOriginPath('\\evil', origin)).toBe('/');
  });
});
