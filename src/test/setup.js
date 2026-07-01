import '@testing-library/jest-dom';
import { vi } from 'vitest';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';

// ── Initialize i18n for tests ─────────────────────────
i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// ── Mock localStorage ─────────────────────────────────
// Real in-memory Map-backed store. The earlier vi.fn()
// mock couldn't roundtrip values, which broke any test
// that saved then read back (e.g. settingsStore).
const localStorageStore = new Map();
const localStorageMock = {
  getItem: (key) => (localStorageStore.has(key) ? localStorageStore.get(key) : null),
  setItem: (key, value) => { localStorageStore.set(key, String(value)); },
  removeItem: (key) => { localStorageStore.delete(key); },
  clear: () => { localStorageStore.clear(); },
  get length() { return localStorageStore.size; },
  key: (i) => Array.from(localStorageStore.keys())[i] ?? null,
};
global.localStorage = localStorageMock;

// ── Mock Notification API ─────────────────────────────
global.Notification = {
  permission: 'default',
  requestPermission: vi.fn(() => Promise.resolve('granted')),
};

// ── Mock Service Worker ───────────────────────────────
global.navigator.serviceWorker = {
  ready: Promise.resolve({
    showNotification: vi.fn(),
  }),
};

// ── Reset mocks between tests ─────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  localStorageStore.clear();
});
