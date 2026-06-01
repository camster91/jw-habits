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
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
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
  localStorageMock.getItem.mockReturnValue(null);
});
