import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { defaultStore } from './domain/store.js';
import { ACCENTS, accentText, applyTheme } from './theme/theme.js';

const platform = vi.hoisted(() => ({ isWeb: true }));

vi.mock('./utils/native.js', () => ({
  get isWeb() {
    return platform.isWeb;
  },
  isNative: false,
  haptics: { success: () => {} },
  appLifecycle: { onStateChange: () => () => {} },
}));
vi.mock('./components/InstallPrompt', () => ({
  default: () => <div data-testid="install-prompt" />,
}));
vi.mock('./components/UpdatePrompt', () => ({ default: () => null }));
vi.mock('./components/OfflineIndicator', () => ({ default: () => null }));

// eslint-disable-next-line no-unused-vars -- used inside renderApp() via JSX
import App from './App.jsx';
// eslint-disable-next-line no-unused-vars -- used inside renderApp() via JSX
import { StoreProvider, STORE_KEY } from './data/StoreProvider.jsx';

function renderApp() {
  return render(
    <StoreProvider>
      <App />
    </StoreProvider>
  );
}

function seed(overrides) {
  const store = { ...defaultStore('2026-10-06', 'en'), ...overrides };
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

let listeners;
let prefersDark;

beforeEach(() => {
  window.scrollTo = vi.fn();
  listeners = new Set();
  prefersDark = false;
  window.matchMedia = vi.fn(() => ({
    get matches() {
      return prefersDark;
    },
    addEventListener: (_type, fn) => listeners.add(fn),
    removeEventListener: (_type, fn) => listeners.delete(fn),
  }));
  platform.isWeb = true;
  window.history.pushState({}, '', '/');
});

describe('App shell', () => {
  it('shows onboarding until it is done', async () => {
    seed({ onboardingDone: false });
    renderApp();
    expect(await screen.findByTestId('onboarding')).toBeInTheDocument();
    expect(screen.queryByTestId('today')).not.toBeInTheDocument();
  });

  it('shows Today once onboarding is done', async () => {
    seed({ onboardingDone: true });
    renderApp();
    expect(await screen.findByTestId('today')).toBeInTheDocument();
    expect(screen.queryByTestId('onboarding')).not.toBeInTheDocument();
  });

  it('shows Progress on /progress', async () => {
    seed({ onboardingDone: true });
    window.history.pushState({}, '', '/progress');
    renderApp();
    expect(await screen.findByTestId('progress')).toBeInTheDocument();
  });

  it('opens the badge collection and keeps Progress active', async () => {
    seed({ onboardingDone: true, badges: { firstStep: '2026-10-06' } });
    window.history.pushState({}, '', '/progress/badges');
    renderApp();
    expect(await screen.findByRole('heading', { name: 'Badges', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Earned 2026-10-06')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('link', { name: 'Progress' })
        .some((link) => link.getAttribute('aria-current') === 'page')
    ).toBe(true);
  });

  it('shows family weeks on /plans/family with the Plans tab active', async () => {
    seed({ onboardingDone: true });
    window.history.pushState({}, '', '/plans/family');
    renderApp();
    expect(await screen.findByTestId('family-weeks')).toBeInTheDocument();
    expect(screen.queryByTestId('plan-trail')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Plans' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows the tab bar on Today and Progress but not during onboarding', async () => {
    seed({ onboardingDone: false });
    const first = renderApp();
    await screen.findByTestId('onboarding');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    first.unmount();
    localStorage.clear();
    seed({ onboardingDone: true });
    renderApp();
    await screen.findByTestId('today');
    fireEvent.click(screen.getByRole('link', { name: 'Progress' }));
    expect(await screen.findByTestId('progress')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Progress' })).toHaveAttribute('aria-current', 'page');
  });

  it('renders the install prompt on the web', async () => {
    seed({ onboardingDone: true });
    renderApp();
    await screen.findByTestId('today');
    expect(screen.getByTestId('install-prompt')).toBeInTheDocument();
  });

  it('omits the install prompt outside the web build', async () => {
    platform.isWeb = false;
    seed({ onboardingDone: true });
    renderApp();
    await screen.findByTestId('today');
    expect(screen.queryByTestId('install-prompt')).not.toBeInTheDocument();
  });

  it('opens and closes the Settings sheet from Today', async () => {
    seed({ onboardingDone: true });
    renderApp();
    await screen.findByTestId('today');
    expect(screen.queryByTestId('settings-sheet')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const sheet = screen.getByTestId('settings-sheet');
    expect(sheet).toHaveAttribute('role', 'dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('settings-sheet')).not.toBeInTheDocument();
  });

  it('opens the Settings sheet from the tab bar on Progress', async () => {
    seed({ onboardingDone: true });
    window.history.pushState({}, '', '/progress');
    renderApp();
    await screen.findByTestId('progress');
    fireEvent.click(
      within(screen.getByRole('navigation')).getByRole('button', { name: 'Settings' })
    );
    expect(screen.getByTestId('settings-sheet')).toBeInTheDocument();
  });

  it('applies the stored theme and accent to the document', async () => {
    seed({ onboardingDone: true, accent: 3, theme: 'dark' });
    renderApp();
    await screen.findByTestId('today');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.getPropertyValue('--fd-accent')).toBe(ACCENTS[3]);
  });
});

describe('applyTheme', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('--fd-accent');
    document.documentElement.style.removeProperty('--fd-accent-text');
  });

  it('sets data-theme and --fd-accent from the store', () => {
    applyTheme({ accent: 2, theme: 'dark' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.style.getPropertyValue('--fd-accent')).toBe(ACCENTS[2]);
    expect(document.documentElement.style.getPropertyValue('--fd-accent-text')).toBe(
      accentText(2, 'dark')
    );
    applyTheme({ accent: 1, theme: 'light' });
    expect(document.documentElement.style.getPropertyValue('--fd-accent-text')).toBe(
      accentText(1, 'light')
    );
  });

  it('offers six accents starting with the brand blue', () => {
    expect(ACCENTS).toHaveLength(6);
    expect(ACCENTS[0]).toBe('#4A6FA4');
    expect(new Set(ACCENTS).size).toBe(6);
  });

  it('follows the system setting, including later changes, and stops once cleaned up', () => {
    const stop = applyTheme({ accent: 0, theme: 'system' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    prefersDark = true;
    listeners.forEach((fn) => fn());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.style.getPropertyValue('--fd-accent-text')).toBe(
      accentText(0, 'dark')
    );
    stop();
    expect(listeners.size).toBe(0);
  });

  it('ignores the system setting when the theme is explicit', () => {
    prefersDark = true;
    applyTheme({ accent: 0, theme: 'light' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(listeners.size).toBe(0);
  });
});
