import { describe, it, expect } from 'vitest';
import {
  isTrustedJwHost,
  sanitizeOpenUrl,
  extractUrlFromText,
  sanitizeSameOriginPath,
} from './safeUrl';

describe('safeUrl', () => {
  describe('isTrustedJwHost', () => {
    it('accepts jw.org and subdomains', () => {
      expect(isTrustedJwHost('jw.org')).toBe(true);
      expect(isTrustedJwHost('www.jw.org')).toBe(true);
      expect(isTrustedJwHost('wol.jw.org')).toBe(true);
      expect(isTrustedJwHost('apps.jw.org')).toBe(true);
      expect(isTrustedJwHost('donate.jw.org')).toBe(true);
    });

    it('rejects lookalikes and unrelated hosts', () => {
      expect(isTrustedJwHost('evil-jw.org')).toBe(false);
      expect(isTrustedJwHost('jw.org.evil.com')).toBe(false);
      expect(isTrustedJwHost('example.com')).toBe(false);
      expect(isTrustedJwHost('')).toBe(false);
    });
  });

  describe('sanitizeOpenUrl', () => {
    it('allows https jw.org URLs', () => {
      expect(sanitizeOpenUrl('https://www.jw.org/en/')).toBe('https://www.jw.org/en/');
    });

    it('rejects javascript and data schemes', () => {
      expect(sanitizeOpenUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeOpenUrl('data:text/html,hi')).toBeNull();
    });

    it('rejects untrusted hosts by default', () => {
      expect(sanitizeOpenUrl('https://evil.example/phish')).toBeNull();
    });

    it('allows untrusted http(s) when requireTrustedHost is false', () => {
      expect(sanitizeOpenUrl('https://evil.example/phish', { requireTrustedHost: false })).toBe(
        'https://evil.example/phish'
      );
    });

    it('rejects URLs with embedded credentials', () => {
      expect(sanitizeOpenUrl('https://user:pass@www.jw.org/')).toBeNull();
    });

    it('trims whitespace', () => {
      expect(sanitizeOpenUrl('  https://www.jw.org/en/  ')).toBe('https://www.jw.org/en/');
    });
  });

  describe('extractUrlFromText', () => {
    it('pulls the first URL out of share text', () => {
      expect(extractUrlFromText('Read this https://www.jw.org/en/library/ thanks')).toBe(
        'https://www.jw.org/en/library/'
      );
    });

    it('can extract untrusted URLs when opted in', () => {
      expect(extractUrlFromText('see https://evil.example/x', { requireTrustedHost: false })).toBe(
        'https://evil.example/x'
      );
    });
  });

  describe('sanitizeSameOriginPath', () => {
    const origin = 'https://jwhabits.ashbi.ca';

    it('allows relative paths', () => {
      expect(sanitizeSameOriginPath('/share', origin)).toBe('/share');
    });

    it('rejects protocol-relative and external URLs', () => {
      expect(sanitizeSameOriginPath('//evil.com', origin)).toBe('/');
      expect(sanitizeSameOriginPath('https://evil.com/', origin)).toBe('/');
    });

    it('keeps same-origin absolute URLs as path', () => {
      expect(sanitizeSameOriginPath('https://jwhabits.ashbi.ca/share?x=1', origin)).toBe(
        '/share?x=1'
      );
    });
  });
});
