import { describe, it, expect } from 'vitest';
import { isSafeHttpUrl, isAllowedShareUrl, toSameOriginPath } from './safeUrls';

describe('isSafeHttpUrl', () => {
  it('accepts http and https', () => {
    expect(isSafeHttpUrl('https://example.com/en/')).toBe(true);
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

describe('isAllowedShareUrl', () => {
  it('allows nothing by default', () => {
    // The app ships no allowlisted third party.
    expect(isAllowedShareUrl('https://example.com/x')).toBe(false);
    expect(isAllowedShareUrl('https://www.example.org/en/')).toBe(false);
  });

  it('allows a host the caller explicitly permits', () => {
    expect(isAllowedShareUrl('https://example.com/x', ['example.com'])).toBe(true);
    expect(isAllowedShareUrl('https://www.example.com/x', ['example.com'])).toBe(true);
  });

  it('rejects subdomain tricks against an allowed host', () => {
    // "evilexample.com" and "example.com.evil.net" must not pass.
    expect(isAllowedShareUrl('https://evilexample.com/', ['example.com'])).toBe(false);
    expect(isAllowedShareUrl('https://example.com.evil.net/', ['example.com'])).toBe(false);
  });

  it('rejects other hosts (phishing trampoline)', () => {
    expect(isAllowedShareUrl('https://evil.example/phish', ['example.com'])).toBe(false);
  });

  it('still rejects non-http schemes', () => {
    expect(isAllowedShareUrl('javascript:alert(1)', ['example.com'])).toBe(false);
    expect(isAllowedShareUrl('custom-scheme:///finder?docid=1', ['example.com'])).toBe(false);
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
