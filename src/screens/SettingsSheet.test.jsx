import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useCallback, useMemo, useState } from 'react';
// eslint-disable-next-line no-unused-vars -- used via JSX
import { StoreContext } from '../data/useStore.js';
import { defaultStore, exportJson } from '../domain/store.js';
import { scheduleOn, withScheduleChange } from '../domain/schedule.js';
// eslint-disable-next-line no-unused-vars -- used via JSX
import SettingsSheet from './SettingsSheet.jsx';
import { consumeBack } from '../utils/backStack.js';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { LocalNotifications } from '@capacitor/local-notifications';

const platform = vi.hoisted(() => ({ isNative: false }));
const foreground = vi.hoisted(() => ({ callback: null }));
vi.mock('../data/StoreProvider.jsx', () => ({
  onForeground: (callback) => {
    foreground.callback = callback;
    return () => {
      foreground.callback = null;
    };
  },
}));

vi.mock('../utils/native.js', () => ({
  get isNative() {
    return platform.isNative;
  },
}));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: vi.fn(() => Promise.resolve({ uri: 'file:///cache/backup.json' })),
    deleteFile: vi.fn(() => Promise.resolve()),
  },
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
}));
vi.mock('@capacitor/share', () => ({ Share: { share: vi.fn(() => Promise.resolve({})) } }));
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: { checkPermissions: vi.fn(), requestPermissions: vi.fn() },
}));

const TODAY = '2026-10-06'; // a Tuesday
const DISCLAIMER =
  'Faithful Days is an independent app. It is not affiliated with, endorsed by, or sponsored by Watch Tower Bible and Tract Society or jw.org, and contains no content from jw.org.';

function makeStore() {
  const s = {
    ...defaultStore('2026-09-01', 'en'),
    onboardingDone: true,
    log: [{ routine: 'meetingPrep', day: '2026-09-07', value: true }],
  };
  return withScheduleChange(s, '2026-09-01', { meetingDays: [2, 0] });
}

let current;

// eslint-disable-next-line no-unused-vars -- used via JSX
function Harness({ initial, onClose }) {
  const [store, setStore] = useState(initial);
  const [open, setOpen] = useState(true);
  current = store;
  const update = useCallback((fn) => setStore((s) => fn(s)), []);
  const value = useMemo(() => ({ store, update, today: TODAY }), [store, update]);
  return (
    <StoreContext.Provider value={value}>
      <button type="button" onClick={() => setOpen(true)}>
        Opener
      </button>
      <SettingsSheet
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      />
    </StoreContext.Provider>
  );
}

function renderSheet(store = makeStore()) {
  const onClose = vi.fn();
  const view = render(<Harness initial={store} onClose={onClose} />);
  return { ...view, onClose, initial: store };
}

const sheet = () => screen.getByRole('dialog', { name: 'Settings' });
const section = (name) => within(sheet()).getByRole('region', { name });
const backupFile = (obj) =>
  new File([typeof obj === 'string' ? obj : JSON.stringify(obj)], 'backup.json', {
    type: 'application/json',
  });

// jsdom has no object URLs: a URL subclass adds them for the export tests.
const objectUrls = vi.hoisted(() => ({ create: null, revoke: null }));

beforeEach(() => {
  platform.isNative = false;
  vi.spyOn(window, 'open').mockImplementation(() => null);
  vi.spyOn(window, 'confirm').mockImplementation(() => true);
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  objectUrls.create = vi.fn(() => 'blob:x');
  objectUrls.revoke = vi.fn();
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = (b) => objectUrls.create(b);
      static revokeObjectURL = (u) => objectUrls.revoke(u);
    }
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('SettingsSheet', () => {
  it('jumps from the top shortcut to Backup without changing any data', () => {
    const { initial } = renderSheet();
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Go to Backup' }));
    expect(within(section('Backup')).getByRole('heading', { name: 'Backup' })).toHaveFocus();
    expect(current).toEqual(initial);
    expect(
      within(section('Backup')).getByRole('button', { name: 'Export a backup' })
    ).toBeEnabled();
  });

  it('changing meeting days appends a schedule entry and keeps the past intact', () => {
    const { initial } = renderSheet();
    fireEvent.click(within(section('Your week')).getByRole('button', { name: 'Wednesday' }));
    expect(current.schedule).toHaveLength(2);
    expect(current.schedule[0]).toEqual(initial.schedule[0]);
    expect(current.schedule[1].from).toBe(TODAY);
    expect([...current.schedule[1].meetingDays].sort()).toEqual([0, 2, 3]);
    expect(scheduleOn(current, '2026-09-08').meetingDays).toEqual([2, 0]);
    expect(current.log).toEqual(initial.log);
  });

  it('turning a routine off writes through straight away, from today', () => {
    renderSheet();
    fireEvent.click(within(section('Routines')).getByRole('switch', { name: 'Ministry' }));
    expect(scheduleOn(current, TODAY).enabled.ministry).toBe(false);
    expect(scheduleOn(current, '2026-10-05').enabled.ministry).toBe(true);
  });

  it('importing a file with version 4 explains why and changes nothing', async () => {
    const { initial } = renderSheet();
    const input = screen.getByLabelText('Import a backup');
    expect(input).toHaveAttribute('accept', '.json,application/json');
    fireEvent.change(input, { target: { files: [backupFile({ ...initial, version: 4 })] } });
    expect(await screen.findByText(/from a newer version of Faithful Days/)).toBeInTheDocument();
    expect(current).toBe(initial);
    expect(screen.queryByText('Replace all data on this device?')).not.toBeInTheDocument();
  });

  it('importing a file that is not JSON explains why', async () => {
    const { initial } = renderSheet();
    fireEvent.change(screen.getByLabelText('Import a backup'), {
      target: { files: [backupFile('not json')] },
    });
    expect(await screen.findByText("This file isn't a Faithful Days backup.")).toBeInTheDocument();
    expect(current).toBe(initial);
  });

  it('a valid backup asks in-app before replacing; Cancel keeps everything', async () => {
    const { initial } = renderSheet();
    const backup = { ...initial, tone: 'quiet' };
    fireEvent.change(screen.getByLabelText('Import a backup'), {
      target: { files: [backupFile(backup)] },
    });
    expect(await screen.findByText('Replace all data on this device?')).toBeInTheDocument();
    expect(current).toBe(initial);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Replace all data on this device?')).not.toBeInTheDocument();
    expect(current).toBe(initial);
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('Replace adopts the backup and closes the sheet', async () => {
    const { initial, onClose } = renderSheet();
    const backup = { ...initial, tone: 'quiet', log: [], onboardingDone: false };
    fireEvent.change(screen.getByLabelText('Import a backup'), {
      target: { files: [backupFile(backup)] },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Replace' }));
    expect(current).toEqual(backup);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.confirm).not.toHaveBeenCalled();
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('Replace on a v2 backup adopts it upgraded to v3, its topic a plan made today', async () => {
    const { initial } = renderSheet();
    // eslint-disable-next-line no-unused-vars
    const { plans, activePlan, familyAgendas, badges, showGameLayer, showShare, ...rest } = initial;
    const v2 = { ...rest, version: 2, studyTopic: 'Daniel', tone: 'quiet' };
    fireEvent.change(screen.getByLabelText('Import a backup'), {
      target: { files: [backupFile(v2)] },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Replace' }));
    expect(current.version).toBe(3);
    expect(current.tone).toBe('quiet');
    expect(current).not.toHaveProperty('studyTopic');
    expect(current.plans.map((p) => [p.title, p.createdOn])).toEqual([['Daniel', TODAY]]);
    expect(current.activePlan.personalStudy).toBe(current.plans[0].id);
  });

  it('exports on the web as a dated download', async () => {
    const { initial } = renderSheet();
    const clicks = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      const entry = { name: this.download, revokedYet: null };
      clicks.push(entry);
      // Still usable once the code that clicked has run to the end of this task.
      queueMicrotask(() => (entry.revokedYet = objectUrls.revoke.mock.calls.length > 0));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Export a backup' }));
    await screen.findByText('Backup ready.');
    expect(clicks).toEqual([{ name: 'faithful-days-backup-2026-10-06.json', revokedYet: false }]);
    expect(await objectUrls.create.mock.calls[0][0].text()).toBe(exportJson(initial));
    // Revoked only after the click has had a chance to start the download.
    await vi.waitFor(() => expect(objectUrls.revoke).toHaveBeenCalledWith('blob:x'));
    expect(Filesystem.writeFile).not.toHaveBeenCalled();
  });

  it('exports on native through a cache file and the share sheet', async () => {
    platform.isNative = true;
    const { initial } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Export a backup' }));
    await screen.findByText('Backup ready.');
    expect(Filesystem.writeFile).toHaveBeenCalledWith({
      path: 'faithful-days-backup-2026-10-06.json',
      data: exportJson(initial),
      directory: 'CACHE',
      encoding: 'utf8',
    });
    expect(Share.share).toHaveBeenCalledWith({
      title: 'Faithful Days backup',
      url: 'file:///cache/backup.json',
    });
  });

  it('About contains the disclaimer verbatim, the links and the version', () => {
    renderSheet();
    const about = section('About');
    expect(within(about).getByText(DISCLAIMER)).toBeInTheDocument();
    fireEvent.click(within(about).getByRole('button', { name: 'Privacy policy' }));
    expect(window.open).toHaveBeenCalledWith(
      'https://jwhabits.ashbi.ca/privacy/',
      '_blank',
      'noopener'
    );
    fireEvent.click(within(about).getByRole('button', { name: 'Support' }));
    expect(window.open).toHaveBeenCalledWith(
      'https://jwhabits.ashbi.ca/support/',
      '_blank',
      'noopener'
    );
    expect(within(about).getByText(/^Version [0-9]/)).toBeInTheDocument();
  });

  it('links: save as typed when valid or empty; anything else stays local and is flagged', () => {
    const { initial } = renderSheet({
      ...makeStore(),
      links: { meetingPrep: 'https://old.example' },
    });
    const links = section('Links');
    const daily = within(links).getByLabelText('Daily text');
    expect(daily).toHaveAttribute(
      'placeholder',
      'https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&alias=daily-text&date=20261006'
    );
    expect(within(links).queryByRole('button')).not.toBeInTheDocument();
    fireEvent.change(daily, { target: { value: 'javascript:alert(1)' } });
    expect(current).toBe(initial);
    fireEvent.blur(daily);
    expect(within(links).getByText(/starts with https:/)).toBeInTheDocument();
    expect(daily).toHaveAttribute('aria-invalid', 'true');
    expect(current).toBe(initial);
    fireEvent.change(daily, { target: { value: 'https://example.org/text' } });
    expect(within(links).queryByText(/starts with https:/)).not.toBeInTheDocument();
    expect(current.links).toEqual({
      meetingPrep: 'https://old.example',
      dailyText: 'https://example.org/text',
    });
    fireEvent.change(within(links).getByLabelText('Meeting preparation'), {
      target: { value: '' },
    });
    expect(current.links).toEqual({ dailyText: 'https://example.org/text' });
  });

  it('a link typed and then Escape is kept', () => {
    const { onClose } = renderSheet();
    const daily = within(section('Links')).getByLabelText('Daily text');
    daily.focus();
    fireEvent.change(daily, { target: { value: 'https://example.org/daily' } });
    fireEvent.keyDown(daily, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(current.links).toEqual({ dailyText: 'https://example.org/daily' });
  });

  it('reminders: the master switch and per-routine switches write through', () => {
    renderSheet();
    const reminders = section('Reminders');
    const master = within(reminders).getByRole('switch', { name: 'Reminders' });
    expect(master).toBeChecked();
    // One switch per enabled routine.
    for (const name of ['Daily text', 'Bible reading', 'Meeting preparation', 'Ministry']) {
      expect(within(reminders).getByRole('switch', { name: `Reminder: ${name}` })).toBeChecked();
    }
    fireEvent.click(within(reminders).getByRole('switch', { name: 'Reminder: Bible reading' }));
    expect(current.reminders).toEqual({ enabled: true, off: ['bibleReading'] });
    fireEvent.click(within(reminders).getByRole('switch', { name: 'Reminder: Ministry' }));
    expect(current.reminders.off).toEqual(['bibleReading', 'ministry']);
    fireEvent.click(within(reminders).getByRole('switch', { name: 'Reminder: Bible reading' }));
    expect(current.reminders.off).toEqual(['ministry']);
    fireEvent.click(master);
    expect(current.reminders).toEqual({ enabled: false, off: ['ministry'] });
  });

  it('reminders: lists only enabled routines, and a migrated "off" can be turned on', () => {
    const s = withScheduleChange(
      { ...makeStore(), reminders: { enabled: false, off: [] } },
      TODAY,
      { enabled: { ministry: false } }
    );
    renderSheet(s);
    const reminders = section('Reminders');
    const master = within(reminders).getByRole('switch', { name: 'Reminders' });
    expect(master).not.toBeChecked();
    fireEvent.click(master);
    expect(current.reminders.enabled).toBe(true);
    expect(within(reminders).getByRole('switch', { name: 'Reminder: Daily text' })).toBeChecked();
    expect(within(reminders).queryByRole('switch', { name: 'Reminder: Ministry' })).toBeNull();
  });

  it("What's New and quiet hours write through", () => {
    renderSheet();
    fireEvent.click(screen.getByRole('switch', { name: "Show what's new on jw.org" }));
    expect(current.whatsNew.enabled).toBe(false);
    fireEvent.click(screen.getByRole('switch', { name: 'Quiet hours' }));
    expect(current.quietHours).toEqual({ start: '22:00', end: '07:00' });
    fireEvent.change(screen.getByLabelText('Quiet from'), { target: { value: '21:30' } });
    expect(current.quietHours).toEqual({ start: '21:30', end: '07:00' });
    fireEvent.click(screen.getByRole('switch', { name: 'Quiet hours' }));
    expect(current.quietHours).toBeNull();
  });

  it('the Android back button closes the open sheet first', () => {
    const { onClose } = renderSheet();
    let consumed;
    act(() => {
      consumed = consumeBack();
    });
    expect(consumed).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(consumeBack()).toBe(false);
  });

  describe('notification permission', () => {
    const HINT = /Notifications are turned off for Faithful Days/;
    const perm = (display) => ({ display });
    const off = () => ({ ...makeStore(), reminders: { enabled: false, off: [] } });
    const settle = () => act(async () => {});
    const toggleMaster = () =>
      fireEvent.click(within(section('Reminders')).getByRole('switch', { name: 'Reminders' }));

    beforeEach(() => {
      LocalNotifications.checkPermissions.mockReset();
      LocalNotifications.requestPermissions.mockReset();
    });

    it('never asks on the web, and shows no hint', async () => {
      renderSheet(off());
      toggleMaster();
      await settle();
      expect(LocalNotifications.checkPermissions).not.toHaveBeenCalled();
      expect(LocalNotifications.requestPermissions).not.toHaveBeenCalled();
      expect(within(section('Reminders')).queryByRole('status')).toBeEmptyDOMElement();
      expect(screen.queryByText(HINT)).toBeNull();
    });

    it('never asks on mount, even with reminders on and permission undecided', async () => {
      platform.isNative = true;
      LocalNotifications.checkPermissions.mockResolvedValue(perm('prompt'));
      renderSheet();
      await settle();
      expect(LocalNotifications.requestPermissions).not.toHaveBeenCalled();
      expect(screen.getByText(HINT)).toBeInTheDocument();
    });

    it('asks once when a migrated store turns reminders on, and still enables them', async () => {
      platform.isNative = true;
      LocalNotifications.checkPermissions.mockResolvedValue(perm('prompt'));
      LocalNotifications.requestPermissions.mockResolvedValue(perm('granted'));
      renderSheet(off());
      await settle();
      toggleMaster();
      await settle();
      expect(LocalNotifications.requestPermissions).toHaveBeenCalledTimes(1);
      expect(current.reminders.enabled).toBe(true);
      expect(screen.queryByText(HINT)).toBeNull();
    });

    it('does not ask when already granted, and shows no hint', async () => {
      platform.isNative = true;
      LocalNotifications.checkPermissions.mockResolvedValue(perm('granted'));
      renderSheet(off());
      await settle();
      toggleMaster();
      await settle();
      expect(LocalNotifications.requestPermissions).not.toHaveBeenCalled();
      expect(current.reminders.enabled).toBe(true);
      expect(screen.queryByText(HINT)).toBeNull();
    });

    it('shows the hint (role status) when the request is denied, and keeps the switch on', async () => {
      platform.isNative = true;
      LocalNotifications.checkPermissions.mockResolvedValue(perm('prompt'));
      LocalNotifications.requestPermissions.mockResolvedValue(perm('denied'));
      renderSheet(off());
      await settle();
      expect(screen.queryByText(HINT)).toBeNull(); // reminders are off: nothing to warn about
      toggleMaster();
      await settle();
      expect(current.reminders.enabled).toBe(true);
      expect(within(section('Reminders')).getByRole('status')).toHaveTextContent(HINT);
    });

    it('asks when a routine switch is turned on while the master is on', async () => {
      platform.isNative = true;
      LocalNotifications.checkPermissions.mockResolvedValue(perm('prompt'));
      LocalNotifications.requestPermissions.mockResolvedValue(perm('denied'));
      renderSheet({ ...makeStore(), reminders: { enabled: true, off: ['ministry'] } });
      await settle();
      fireEvent.click(
        within(section('Reminders')).getByRole('switch', { name: 'Reminder: Ministry' })
      );
      await settle();
      expect(LocalNotifications.requestPermissions).toHaveBeenCalledTimes(1);
      expect(current.reminders.off).toEqual([]);
    });

    it('never asks when a switch is turned off', async () => {
      platform.isNative = true;
      LocalNotifications.checkPermissions.mockResolvedValue(perm('prompt'));
      renderSheet();
      await settle();
      fireEvent.click(
        within(section('Reminders')).getByRole('switch', { name: 'Reminder: Ministry' })
      );
      toggleMaster();
      await settle();
      expect(LocalNotifications.requestPermissions).not.toHaveBeenCalled();
      expect(screen.queryByText(HINT)).toBeNull(); // master off: no hint
    });

    it('coalesces permission requests while switches overlap', async () => {
      platform.isNative = true;
      LocalNotifications.checkPermissions.mockResolvedValue(perm('prompt'));
      let finish;
      LocalNotifications.requestPermissions.mockImplementation(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      );
      renderSheet(off());
      await settle();
      toggleMaster();
      await settle();
      toggleMaster();
      toggleMaster();
      await settle();
      expect(LocalNotifications.requestPermissions).toHaveBeenCalledTimes(1);
      await act(async () => finish(perm('granted')));
      expect(screen.queryByText(HINT)).toBeNull();
    });

    it('requests on user activation even if the permission check failed', async () => {
      platform.isNative = true;
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      LocalNotifications.checkPermissions.mockRejectedValue(new Error('check failed'));
      LocalNotifications.requestPermissions.mockResolvedValue(perm('granted'));
      renderSheet(off());
      await settle();
      toggleMaster();
      await settle();
      expect(LocalNotifications.requestPermissions).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(HINT)).toBeNull();
    });

    it('refreshes permission after returning from OS settings', async () => {
      platform.isNative = true;
      LocalNotifications.checkPermissions.mockResolvedValue(perm('denied'));
      renderSheet();
      await settle();
      expect(screen.getByText(HINT)).toBeInTheDocument();
      LocalNotifications.checkPermissions.mockResolvedValue(perm('granted'));
      await act(async () => foreground.callback());
      expect(screen.queryByText(HINT)).toBeNull();
      expect(LocalNotifications.requestPermissions).not.toHaveBeenCalled();
    });

    it('unsubscribes safely while a permission request is pending', async () => {
      platform.isNative = true;
      LocalNotifications.checkPermissions.mockResolvedValue(perm('prompt'));
      let finish;
      LocalNotifications.requestPermissions.mockImplementation(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      );
      const view = renderSheet(off());
      await settle();
      toggleMaster();
      await settle();
      view.unmount();
      expect(foreground.callback).toBeNull();
      await act(async () => finish(perm('granted')));
      expect(LocalNotifications.requestPermissions).toHaveBeenCalledTimes(1);
    });

    it('catches plugin errors: the store change still lands, nothing throws', async () => {
      platform.isNative = true;
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      LocalNotifications.checkPermissions.mockRejectedValue(new Error('no plugin'));
      LocalNotifications.requestPermissions.mockRejectedValue(new Error('no plugin'));
      renderSheet(off());
      await settle();
      toggleMaster();
      await settle();
      expect(current.reminders.enabled).toBe(true);
      expect(warn).toHaveBeenCalled();
    });
  });

  it('is a real dialog: focus moves in, is trapped, Escape closes and focus returns', () => {
    const { onClose, rerender } = renderSheet();
    const close = within(sheet()).getByRole('button', { name: 'Close' });
    expect(sheet()).toHaveAttribute('aria-modal', 'true');
    expect(close).toHaveFocus();
    // Shift+Tab from the first control wraps to the last.
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    const focusables = sheet().querySelectorAll('button, input, select, textarea');
    expect(document.activeElement).toBe(focusables[focusables.length - 1]);
    fireEvent.keyDown(document.activeElement, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(sheet(), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    void rerender;
  });

  it('sends focus that lands outside back into the sheet', () => {
    renderSheet();
    const opener = screen.getByRole('button', { name: 'Opener' });
    opener.focus();
    expect(opener).not.toHaveFocus();
    expect(sheet()).toContainElement(document.activeElement);
  });

  it('returns focus to the opener when closed with the close button', () => {
    renderSheet();
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Close' }));
    const opener = screen.getByRole('button', { name: 'Opener' });
    opener.focus();
    fireEvent.click(opener);
    expect(within(sheet()).getByRole('button', { name: 'Close' })).toHaveFocus();
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Close' }));
    expect(opener).toHaveFocus();
  });
});
