import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSettings,
  saveSettings,
  clearSettings,
  SETTINGS_SCHEMA_VERSION,
  STORAGE_KEY,
} from './settingsStore.js';

describe('settingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when localStorage is empty', () => {
    const s = loadSettings();
    expect(s.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION);
    expect(s.midweekDay).toBe(2);
    expect(s.weekendDay).toBe(0);
    expect(s.reminderTime).toBe(null);
    expect(s.quietHours).toBe(null);
  });

  it('persists and reloads values', () => {
    saveSettings({
      schemaVersion: 1,
      midweekDay: 3,
      weekendDay: 6,
      reminderTime: '08:30',
      quietHours: { start: '22:00', end: '07:00' },
    });
    const s = loadSettings();
    expect(s.midweekDay).toBe(3);
    expect(s.weekendDay).toBe(6);
    expect(s.reminderTime).toBe('08:30');
    expect(s.quietHours).toEqual({ start: '22:00', end: '07:00' });
  });

  it('rejects out-of-range day values', () => {
    saveSettings({
      schemaVersion: 1,
      midweekDay: 99,
      weekendDay: -1,
      reminderTime: null,
      quietHours: null,
    });
    const s = loadSettings();
    expect(s.midweekDay).toBe(2); // fallback to default
    expect(s.weekendDay).toBe(0);
  });

  it('rejects malformed reminderTime', () => {
    saveSettings({
      schemaVersion: 1,
      midweekDay: 2,
      weekendDay: 0,
      reminderTime: 'not-a-time',
      quietHours: null,
    });
    expect(loadSettings().reminderTime).toBe(null);
  });

  it('accepts valid HH:MM times', () => {
    saveSettings({
      schemaVersion: 1,
      midweekDay: 2,
      weekendDay: 0,
      reminderTime: '00:00',
      quietHours: null,
    });
    expect(loadSettings().reminderTime).toBe('00:00');
  });

  it('drops unknown fields', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        midweekDay: 2,
        weekendDay: 0,
        reminderTime: null,
        quietHours: null,
        hackerField: 'evil',
      })
    );
    const s = loadSettings();
    expect(s).not.toHaveProperty('hackerField');
  });

  it('handles corrupt JSON without throwing', () => {
    localStorage.setItem(STORAGE_KEY, 'not json at all');
    const s = loadSettings();
    expect(s.midweekDay).toBe(2);
  });

  it('clearSettings removes the storage key', () => {
    saveSettings({
      schemaVersion: 1,
      midweekDay: 2,
      weekendDay: 0,
      reminderTime: null,
      quietHours: null,
    });
    expect(localStorage.getItem(STORAGE_KEY)).not.toBe(null);
    clearSettings();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(null);
  });

  it('quietHours can be null', () => {
    saveSettings({
      schemaVersion: 1,
      midweekDay: 2,
      weekendDay: 0,
      reminderTime: null,
      quietHours: null,
    });
    expect(loadSettings().quietHours).toBe(null);
  });

  it('STORAGE_KEY is namespaced', () => {
    expect(STORAGE_KEY).toBe('jw-user-settings');
    expect(STORAGE_KEY).not.toBe('jw-daily-habits-state');
  });
});
