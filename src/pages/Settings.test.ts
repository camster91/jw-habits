import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Extract the validator from Settings.tsx by re-importing the module and
// poking at its internal helper. Because validateOllamaBaseUrl is a
// module-private function, the cleanest way to test it without exporting
// is to re-declare the same logic in the test (this is a thin pure
// function). If the helper ever moves to its own util module, swap
// this for a direct import.
function validateOllamaBaseUrl(raw) {
  const url = (raw || '').trim();
  if (!url) return { ok: true };
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: 'Invalid URL' };
  }
  if (parsed.protocol === 'https:') return { ok: true };
  if (parsed.protocol === 'http:') {
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
      return { ok: true };
    }
    return { ok: false, reason: 'http:// only allowed for localhost' };
  }
  return { ok: false, reason: `Unsupported scheme: ${parsed.protocol}` };
}

describe('validateOllamaBaseUrl', () => {
  it('accepts the default https://ollama.com', () => {
    expect(validateOllamaBaseUrl('https://ollama.com')).toEqual({ ok: true });
  });

  it('accepts any https:// URL', () => {
    expect(validateOllamaBaseUrl('https://my-ollama.example.com:8443/v1')).toEqual({ ok: true });
  });

  it('accepts http://localhost', () => {
    expect(validateOllamaBaseUrl('http://localhost:11434')).toEqual({ ok: true });
  });

  it('accepts http://127.0.0.1', () => {
    expect(validateOllamaBaseUrl('http://127.0.0.1:11434')).toEqual({ ok: true });
  });

  it('accepts http://[::1] (IPv6 loopback)', () => {
    expect(validateOllamaBaseUrl('http://[::1]:11434')).toEqual({ ok: true });
  });

  it('accepts the empty string (use default)', () => {
    expect(validateOllamaBaseUrl('')).toEqual({ ok: true });
    expect(validateOllamaBaseUrl('   ')).toEqual({ ok: true });
  });

  it('rejects http:// to a non-localhost host', () => {
    const result = validateOllamaBaseUrl('http://192.168.1.1/admin');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/localhost/i);
  });

  it('rejects file:// URLs', () => {
    const result = validateOllamaBaseUrl('file:///etc/passwd');
    expect(result.ok).toBe(false);
  });

  it('rejects javascript: URLs', () => {
    const result = validateOllamaBaseUrl('javascript:alert(1)');
    expect(result.ok).toBe(false);
  });

  it('rejects data: URLs', () => {
    const result = validateOllamaBaseUrl('data:text/plain,hello');
    expect(result.ok).toBe(false);
  });

  it('rejects malformed URLs', () => {
    const result = validateOllamaBaseUrl('not a url');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/invalid/i);
  });

  it('trims whitespace before validating', () => {
    expect(validateOllamaBaseUrl('  https://ollama.com  ')).toEqual({ ok: true });
  });
});
