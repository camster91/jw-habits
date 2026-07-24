import { describe, it, expect } from 'vitest';
import { sanitizeShareUrl } from './shareUrl.js';

describe('sanitizeShareUrl', () => {
  it('allows https jw.org URLs', () => {
    expect(sanitizeShareUrl('https://www.jw.org/en/library/')).toBe(
      'https://www.jw.org/en/library/'
    );
  });

  it('allows wol.jw.org and subdomain *.jw.org', () => {
    expect(sanitizeShareUrl('https://wol.jw.org/en/wol/h/r1/lp-e')).toContain('wol.jw.org');
    expect(sanitizeShareUrl('https://apps.jw.org/')).toContain('apps.jw.org');
  });

  it('blocks arbitrary https hosts (phishing)', () => {
    expect(sanitizeShareUrl('https://evil.example/phish')).toBeNull();
    expect(sanitizeShareUrl('https://jw.org.evil.com/')).toBeNull();
  });

  it('blocks javascript/data schemes', () => {
    expect(sanitizeShareUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeShareUrl('data:text/html,hi')).toBeNull();
  });

  it('blocks URLs with embedded credentials', () => {
    expect(sanitizeShareUrl('https://user:pass@www.jw.org/')).toBeNull();
  });

  it('returns null for empty/invalid input', () => {
    expect(sanitizeShareUrl('')).toBeNull();
    expect(sanitizeShareUrl(null)).toBeNull();
    expect(sanitizeShareUrl('not a url')).toBeNull();
  });
});
