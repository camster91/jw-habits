/**
 * Tests for doneState shape helpers (backward-compat for the
 * "personal note per row" feature).
 */
import { describe, it, expect } from 'vitest';
import { getDone, setDone, isDone, getNote, NOTE_MAX_LENGTH } from './doneState';

describe('doneState', () => {
  describe('getDone', () => {
    it('returns false/empty for an undefined entry', () => {
      expect(getDone({}, 'text')).toEqual({ done: false, note: '' });
    });

    it('returns false/empty for a null done map', () => {
      expect(getDone(null, 'text')).toEqual({ done: false, note: '' });
    });

    it('coerces a legacy boolean true', () => {
      expect(getDone({ text: true }, 'text')).toEqual({ done: true, note: '' });
    });

    it('coerces a legacy boolean false', () => {
      expect(getDone({ text: false }, 'text')).toEqual({ done: false, note: '' });
    });

    it('reads a new-shape object', () => {
      expect(getDone({ text: { done: true, note: 'hi' } }, 'text')).toEqual({
        done: true,
        note: 'hi',
      });
    });

    it('truncates an over-long note to NOTE_MAX_LENGTH', () => {
      const long = 'x'.repeat(NOTE_MAX_LENGTH + 50);
      const out = getDone({ text: { done: true, note: long } }, 'text');
      expect(out.note.length).toBe(NOTE_MAX_LENGTH);
    });

    it('treats a non-string note as empty', () => {
      expect(getDone({ text: { done: true, note: 42 } }, 'text').note).toBe('');
    });
  });

  describe('setDone', () => {
    it('preserves the note when toggling done', () => {
      const out = setDone({ text: { done: false, note: 'keep me' } }, 'text', {
        done: true,
      });
      expect(out.text).toEqual({ done: true, note: 'keep me' });
    });

    it('truncates a too-long note', () => {
      const long = 'y'.repeat(NOTE_MAX_LENGTH + 1);
      const out = setDone({}, 'text', { note: long });
      expect(out.text.note.length).toBe(NOTE_MAX_LENGTH);
    });

    it('does not mutate the input map', () => {
      const orig = { text: { done: true, note: 'a' } };
      const out = setDone(orig, 'text', { done: false });
      expect(orig.text.done).toBe(true);
      expect(out.text.done).toBe(false);
    });
  });

  describe('isDone / getNote', () => {
    it('isDone handles legacy booleans', () => {
      expect(isDone({ text: true }, 'text')).toBe(true);
      expect(isDone({ text: false }, 'text')).toBe(false);
    });

    it('isDone handles new shape', () => {
      expect(isDone({ text: { done: true, note: '' } }, 'text')).toBe(true);
    });

    it('getNote returns empty for a legacy boolean', () => {
      expect(getNote({ text: true }, 'text')).toBe('');
    });

    it('getNote returns the stored note', () => {
      expect(getNote({ text: { done: true, note: 'abc' } }, 'text')).toBe('abc');
    });
  });
});
