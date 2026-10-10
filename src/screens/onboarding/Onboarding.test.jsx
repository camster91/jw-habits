// eslint-disable-next-line no-unused-vars -- JSX
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useCallback, useMemo, useState } from 'react';
// eslint-disable-next-line no-unused-vars -- used via JSX
import { StoreContext } from '../../data/useStore.js';
import { defaultStore } from '../../domain/store.js';
import { ACCENTS } from '../../theme/theme.js';
import en from '../../locales/en.json';
// eslint-disable-next-line no-unused-vars -- used via JSX
import Onboarding from './Onboarding.jsx';
// eslint-disable-next-line no-unused-vars -- used via JSX
import Today from '../Today.jsx';
// eslint-disable-next-line no-unused-vars -- used via JSX
import Progress from '../Progress.jsx';
import { LocalNotifications } from '@capacitor/local-notifications';

const platform = vi.hoisted(() => ({ isNative: false }));

vi.mock('../../utils/native.js', () => ({
  get isNative() {
    return platform.isNative;
  },
  haptics: { success: vi.fn() },
}));
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: { requestPermissions: vi.fn(() => Promise.resolve({ display: 'denied' })) },
}));

const TODAY = '2026-10-06'; // a Tuesday
const SKIP = 'Skip — use defaults';

let current;

// Mirrors App: onboarding until it is done, then the screens.
// eslint-disable-next-line no-unused-vars -- used via JSX
function Harness({ initial }) {
  const [store, setStore] = useState(initial);
  current = store;
  const update = useCallback((fn) => setStore((s) => fn(s)), []);
  const value = useMemo(() => ({ store, update, today: TODAY }), [store, update]);
  return (
    <StoreContext.Provider value={value}>
      {store.onboardingDone ? (
        <>
          <Today />
          <Progress />
        </>
      ) : (
        <Onboarding />
      )}
    </StoreContext.Provider>
  );
}

const initialStore = () => defaultStore(TODAY, 'en');
const renderOnboarding = (store = initialStore()) =>
  render(
    <MemoryRouter>
      <Harness initial={store} />
    </MemoryRouter>
  );
const click = (name) => fireEvent.click(screen.getByRole('button', { name }));
const heading = () => screen.getByRole('heading', { level: 1 });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 6, 9));
  platform.isNative = false;
  window.open = vi.fn();
});
afterEach(() => vi.useRealTimers());

describe('Onboarding', () => {
  it('skipping every step ends on Today with the default store, done', () => {
    const initial = initialStore();
    renderOnboarding(initial);
    expect(screen.getByTestId('onboarding')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: SKIP })).not.toBeInTheDocument();
    click('Get started');
    for (let i = 0; i < 5; i++) click(SKIP);
    expect(screen.getByTestId('today')).toBeInTheDocument();
    expect(current).toEqual({ ...initial, onboardingDone: true });
  });

  it('starts directly from welcome without resetting existing history or asking for permission', () => {
    platform.isNative = true;
    const initial = initialStore();
    initial.labels.dailyText = 'Morning reading';
    initial.log = [{ day: TODAY, routine: 'dailyText', value: true }];
    renderOnboarding(initial);
    click('Start with defaults');
    expect(screen.getByTestId('today')).toBeInTheDocument();
    expect(current).toEqual({ ...initial, onboardingDone: true });
    expect(LocalNotifications.requestPermissions).not.toHaveBeenCalled();
  });

  it('announces the step and allows going back', () => {
    renderOnboarding();
    click('Get started');
    expect(screen.getByText('Step 2 of 6')).toBeInTheDocument();
    expect(heading()).toHaveTextContent('Your routines');
    expect(heading()).toHaveFocus();
    click('Next');
    expect(screen.getByText('Step 3 of 6')).toBeInTheDocument();
    click('Back');
    expect(heading()).toHaveTextContent('Your routines');
  });

  it('commits nothing until the last step', () => {
    const initial = initialStore();
    renderOnboarding(initial);
    click('Get started');
    fireEvent.click(screen.getByRole('switch', { name: 'Ministry' }));
    click('Next');
    expect(current).toBe(initial);
  });

  it('renaming Meeting preparation shows the new label on Today and leaves the log alone', () => {
    renderOnboarding();
    click('Get started');
    click('Rename Meeting preparation');
    fireEvent.change(screen.getByLabelText('Name for Meeting preparation'), {
      target: { value: 'Prepare comments' },
    });
    click('Next');
    // A Wednesday meeting opens its prep on Tuesday.
    fireEvent.click(screen.getByRole('button', { name: 'Wednesday' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sunday' }));
    click('Next');
    for (let i = 0; i < 3; i++) click(SKIP);
    expect(within(screen.getByTestId('today')).getByText('Prepare comments')).toBeInTheDocument();
    expect(current.labels).toEqual({ meetingPrep: 'Prepare comments' });
    expect(current.log).toEqual([]);
  });

  it('limits a name to 30 characters and can reset it', () => {
    renderOnboarding();
    click('Get started');
    click('Rename Daily text');
    const input = screen.getByLabelText('Name for Daily text');
    expect(input).toHaveAttribute('maxLength', '30');
    fireEvent.change(input, { target: { value: 'Morning text' } });
    expect(screen.getByRole('switch', { name: 'Morning text' })).toBeInTheDocument();
    click('Reset Daily text to default');
    expect(screen.getByRole('switch', { name: 'Daily text' })).toBeInTheDocument();
  });

  it('never saves a name that is only spaces', () => {
    renderOnboarding();
    click('Get started');
    click('Rename Daily text');
    fireEvent.change(screen.getByLabelText('Name for Daily text'), { target: { value: '   ' } });
    expect(current.labels).toEqual({});
    expect(screen.getByRole('switch', { name: 'Daily text' })).toBeInTheDocument();
  });

  it('Psalms 1 with earlier books counted gives 18 books on Progress', () => {
    renderOnboarding();
    click('Get started');
    click('Next');
    click('Next');
    fireEvent.change(screen.getByLabelText('Starting book'), { target: { value: '19' } });
    expect(screen.getByLabelText('Starting chapter')).toHaveValue('1');
    fireEvent.click(screen.getByLabelText('Count earlier books as read'));
    click('Next');
    click(SKIP);
    click(SKIP);
    expect(screen.getByText('18 of 66 books')).toBeInTheDocument();
    expect(current.reading).toEqual({
      plan: 'year',
      start: { book: 19, chapter: 1 },
      startedOn: TODAY,
      countEarlierAsRead: true,
    });
  });

  it('choosing accent 3 updates the decorative preview', () => {
    renderOnboarding();
    click('Get started');
    for (let i = 0; i < 4; i++) click('Next');
    expect(heading()).toHaveTextContent('Your look');
    const preview = screen.getByTestId('look-preview');
    expect(preview).toHaveAttribute('aria-hidden', 'true');
    expect(preview.style.getPropertyValue('--fd-accent')).toBe(ACCENTS[0]);
    fireEvent.click(screen.getByRole('radio', { name: 'Rust' }));
    expect(preview.style.getPropertyValue('--fd-accent')).toBe(ACCENTS[3]);
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(preview).toHaveAttribute('data-theme', 'dark');
    click('Start my first day');
    expect(current.accent).toBe(3);
    expect(current.theme).toBe('dark');
    expect(current.onboardingDone).toBe(true);
  });

  it('skip throws away edits made on that step', () => {
    const initial = initialStore();
    renderOnboarding(initial);
    click('Get started');
    fireEvent.click(screen.getByRole('switch', { name: 'Ministry' }));
    click('Rename Ministry');
    fireEvent.change(screen.getByLabelText('Name for Ministry'), { target: { value: 'Field' } });
    click(SKIP);
    for (let i = 0; i < 4; i++) click(SKIP);
    expect(current).toEqual({ ...initial, onboardingDone: true });
  });

  it('keeps the reminder clock independent of the chosen routine cue', () => {
    renderOnboarding();
    click('Get started');
    for (let i = 0; i < 3; i++) click('Next');
    expect(heading()).toHaveTextContent('Your rhythm');
    const time = screen.getByLabelText('Reminder time');
    fireEvent.change(time, { target: { value: '22:15' } });
    for (const cue of [
      'Before bed',
      'After breakfast',
      'With family prayer',
      'Just a clock time',
    ]) {
      fireEvent.click(screen.getByRole('radio', { name: cue }));
      expect(time).toHaveValue('22:15');
    }
    fireEvent.click(screen.getByRole('radio', { name: 'Before bed' }));
    expect(screen.getByText(/cannot detect breakfast/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'With a scripture reference' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Evening wrap-up notification' }));
    click('Next');
    expect(screen.getByRole('region', { name: 'Review your setup' })).toHaveTextContent(
      'Daily-text cue: Before bed. Reminder time: 22:15'
    );
    click('Start my first day');
    expect(current.anchors).toEqual({ dailyText: { time: '22:15', phrase: 'beforeBed' } });
    expect(current.tone).toBe('scripture');
    expect(current.wrapUpNotification).toBe(true);
  });

  it('asks for notification permission on native only, after the explainer', async () => {
    platform.isNative = true;
    renderOnboarding();
    click('Get started');
    for (let i = 0; i < 2; i++) click('Next');
    expect(LocalNotifications.requestPermissions).not.toHaveBeenCalled();
    click('Next');
    const explainer = screen.getByText(/gentle reminder/);
    const allow = screen.getByRole('button', { name: 'Allow notifications' });
    expect(
      explainer.compareDocumentPosition(allow) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    fireEvent.click(allow);
    expect(LocalNotifications.requestPermissions).toHaveBeenCalledTimes(1);
    await vi.waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Notifications are not enabled')
    );
    // Declining is fine: the step carries on.
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled());
    click('Next');
    expect(heading()).toHaveTextContent('Your look');
  });

  it('lets the owner retry an interrupted notification request without saving setup', async () => {
    platform.isNative = true;
    LocalNotifications.requestPermissions.mockRejectedValueOnce(new Error('interrupted'));
    const initial = initialStore();
    renderOnboarding(initial);
    click('Get started');
    for (let i = 0; i < 3; i++) click('Next');
    click('Allow notifications');
    await vi.waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Permission could not be checked')
    );
    expect(screen.getByRole('button', { name: 'Allow notifications' })).toBeEnabled();
    expect(current).toEqual(initial);
    click('Allow notifications');
    await vi.waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Notifications are not enabled')
    );
    expect(current).toEqual(initial);
  });

  it('never asks for notification permission on the web', () => {
    renderOnboarding();
    click('Get started');
    for (let i = 0; i < 3; i++) click('Next');
    expect(screen.queryByRole('button', { name: 'Allow notifications' })).not.toBeInTheDocument();
    expect(LocalNotifications.requestPermissions).not.toHaveBeenCalled();
  });

  it('welcome carries the disclaimer and the on-device promise', () => {
    renderOnboarding();
    expect(
      screen.getByText(
        'Faithful Days is an independent app. It is not affiliated with, endorsed by, or sponsored by Watch Tower Bible and Tract Society or jw.org, and contains no content from jw.org.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Routines, plans and notes stay on this device/)).toBeInTheDocument();
  });

  it('explains the tracking day interactively without recording activity', () => {
    const initial = initialStore();
    renderOnboarding(initial);
    click('Your ideas');
    expect(screen.getByText(/Keep your own questions/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('How does a day work?'));
    click('4 a.m.');
    expect(screen.getByText(/At 4 a.m., your check-in belongs to the new day/)).toBeInTheDocument();
    click('1 a.m.');
    expect(
      screen.getByText(/At 1 a.m., your check-in belongs to the previous day/)
    ).toBeInTheDocument();
    expect(current).toEqual(initial);
  });

  it('reviews the actual draft before saving and keeps Back editable', () => {
    const initial = initialStore();
    renderOnboarding(initial);
    click('Get started');
    fireEvent.click(screen.getByRole('switch', { name: 'Ministry' }));
    click('Next');
    click('Wednesday');
    click('Next');
    fireEvent.click(screen.getByRole('radio', { name: 'My own pace' }));
    fireEvent.change(screen.getByLabelText('Starting book'), { target: { value: '19' } });
    click('Next');
    fireEvent.click(screen.getByRole('radio', { name: 'Quiet' }));
    click('Next');
    const review = screen.getByRole('region', { name: 'Review your setup' });
    expect(review).toHaveTextContent('Meetings: Wednesday');
    expect(review).toHaveTextContent('Psalms 1');
    expect(review).toHaveTextContent('My own pace');
    expect(review).toHaveTextContent('Encouragement: Quiet');
    expect(review).not.toHaveTextContent('Ministry');
    expect(current).toEqual(initial);
    click('Back');
    fireEvent.click(screen.getByRole('radio', { name: 'Warm' }));
    click('Next');
    expect(screen.getByRole('region', { name: 'Review your setup' })).toHaveTextContent(
      'Encouragement: Warm'
    );
    click('Start my first day');
    expect(current.tone).toBe('warm');
    expect(current.reading.plan).toBe('ownPace');
    expect(current.log).toEqual(initial.log);
  });

  it('setting copy never says missed, broke, failed or lost', () => {
    const text = JSON.stringify([en.fd.onboarding, en.fd.settings]);
    expect(text).not.toMatch(/missed|broke|failed|lost/i);
  });
});

it('starts quickly with selected routines and own-pace reading without requesting notifications', () => {
  renderOnboarding();
  click('Get started');
  fireEvent.click(screen.getByRole('switch', { name: 'Personal study', exact: true }));
  click('Start with these routines');
  expect(current.onboardingDone).toBe(true);
  expect(current.reading.plan).toBe('ownPace');
  expect(current.schedule.at(-1).enabled.personalStudy).toBe(false);
  expect(LocalNotifications.requestPermissions).not.toHaveBeenCalled();
});
