import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  BookMarked,
  CalendarRange,
  Church,
  Sparkles,
  Users,
  UsersRound,
  ArrowUpRight,
  ChevronDown,
  StickyNote,
  Share2,
  ExternalLink,
} from 'lucide-react';
import {
  getDailyTextLink,
  getCurrentYearTextUrl,
  getMemorialRow,
  getSundayWatchtowerRow,
  getThisWeekMeetingUrl,
  getTodayRow,
  JW_ORG_SECTIONS,
} from '../utils/jwLibraryLinks';
import { getDailyReading } from '../utils/dailyBibleReading';
import { bibleReadingProgress, dailyTextProgress } from '../utils/habitProgress';
import { currentStreak, bestStreakFromHistory, todayProgress } from '../utils/streak';
import SettingsAccordion from '../components/SettingsAccordion';
import { loadSettings } from '../utils/settingsStore';
import { getDone, setDone, NOTE_MAX_LENGTH } from '../utils/doneState';
import {
  markBibleReadToday,
  unmarkBibleReadToday,
  bibleReadDaysCount,
} from '../utils/bibleReadingTracker';
import {
  markSundayWatchtowerWeek,
  unmarkSundayWatchtowerWeek,
  sundayWatchtowerWeeksCount,
} from '../utils/sundayWatchtowerTracker';
import {
  useHabitState,
  markInteracted,
  readBestStreak,
  writeBestStreak,
  loadInitialState,
  hasInteracted as hasUserInteracted,
  pruneHistory,
  todayKey,
} from '../hooks/useHabitState';

/**
 * Home — the only in-app page. Five habit rows plus two
 * special-date rows:
 *   1. Daily text         → opens jw.org
 *   2. Bible reading     → opens today's reading on jw.org
 *   3. Prayer            → links to a quiet reflection page
 *   4. Family worship     → links to family resources
 *   5. Meeting prep      → links to this week's workbook
 *   6. Sunday Watchtower Study  → visible Sat 8 AM - Sun EOD
 *
 * Special-date rows (Memorial + Sunday Watchtower) render
 * only on the relevant dates; see `getMemorialRow` and
 * `getSundayWatchtowerRow` in jwLibraryLinks.js. Outside their
 * windows the rows are omitted entirely (null-safe).
 *
 * Each row has two tap targets:
 *   - the title / icon / link arrow: open the jw.org surface
 *   - the checkbox on the right: mark "done" (persisted in
 *     localStorage; no toast, no animation, no "complete" card)
 *
 * State: a single localStorage key per day,
 *   jw-daily-habits-state = { date: 'YYYY-MM-DD', done: { today, text, bible, thisWeek, family, meeting, memorial? } }  // memorial is conditional
 *
 * When the user opens the app on a new day, the per-day state
 * resets automatically. Yesterday's checks don't carry over.
 *
 * The page is intentionally minimal. No streak, no XP, no
 * timer, no "see you tomorrow" celebration, no toasts, no
 * settings menu, no hamburger. Just five rows, each with a
 * link to do the actual habit on jw.org and a checkbox to
 * mark it done. The actual content lives on jw.org, not in
 * this app — we only track progress.
 */

function Home() {
  const { t, i18n } = useTranslation();
  // Expose the active i18n language as a global so pure utility
  // functions in jwLibraryLinks (which can't import i18next
  // without a circular dep) can pick up the locale for date
  // formatting. Updated on every render so language changes
  // are reflected immediately.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__jw_lang = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
    }
  }, [i18n.resolvedLanguage, i18n.language]);
  // Initialize from localStorage. We re-read on `storage` events
  // and on visibilitychange so the checkbox state stays current
  // across tabs and on wake-from-sleep. If the saved state's
  // date is from a previous day, we write a fresh empty state
  // for today so the localStorage key always reflects the
  // current day (yesterday's per-day state never carries over).
  const [state, setState, , replaceState] = useHabitState();

  // Surface hard localStorage quota failures (after eviction retry).
  const [storageFull, setStorageFull] = useState(false);
  const [offlineOpenHint, setOfflineOpenHint] = useState(false);
  useEffect(() => {
    let offlineHintTimer = 0;
    const onFull = () => setStorageFull(true);
    const onOfflineOpen = () => {
      setOfflineOpenHint(true);
      window.clearTimeout(offlineHintTimer);
      offlineHintTimer = window.setTimeout(() => setOfflineOpenHint(false), 3500);
    };
    window.addEventListener('jw-storage-full', onFull);
    window.addEventListener('jw-offline-open', onOfflineOpen);
    return () => {
      window.removeEventListener('jw-storage-full', onFull);
      window.removeEventListener('jw-offline-open', onOfflineOpen);
      window.clearTimeout(offlineHintTimer);
    };
  }, []);

  // Best-effort share-invite helper. Uses the system share sheet
  // (`navigator.share`) when available — the user picks their
  // recipient (Messages, WhatsApp, Email, copy, etc.). Falls back
  // to the async clipboard API in browsers that lack share. The
  // function is fire-and-forget; errors are swallowed because
  // "user canceled the share sheet" is a normal outcome, not a
  // failure.
  async function shareInvite(text) {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ text, title: 'Memorial invitation' });
        return;
      }
    } catch {
      // User dismissed the share sheet (AbortError) or share
      // failed for another reason. Fall through to clipboard.
    }
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      /* swallow */
    }
  }

  // User settings (midweek day, weekend day). Re-read on
  // 'storage' events so a change in one tab propagates to
  // another. Settings are sticky (not per-day-reset), so we
  // don't need a visibilitychange handler.
  const [settings, setSettings] = useState(() => loadSettings());
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'jw-user-settings') setSettings(loadSettings());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Re-sync state when localStorage changes in another tab or
  // when the tab becomes visible after midnight (rare but possible).
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'jw-daily-habits-state') {
        // Full state replacement, not a partial merge. The hook's
        // default setter treats patches as merges which would keep
        // stale values when storage changes externally.
        replaceState(loadInitialState());
      }
    };
    const onVisible = () => {
      if (!document.hidden) {
        replaceState(loadInitialState());
      }
    };
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [replaceState]);

  // Track which row key just got toggled so we can apply a
  // brief "pop" animation (scale 1 → 1.15 → 1, 200ms) to the
  // checkbox. Cleared on a timer so re-toggles re-fire. Pure
  // CSS animation defined in index.css under .ios-checkbox-pop.
  const [popKey, setPopKey] = useState(null);
  useEffect(() => {
    if (!popKey) return;
    const t = setTimeout(() => setPopKey(null), 220);
    return () => clearTimeout(t);
  }, [popKey]);

  const toggle = (key) => {
    // Mark for the pop animation BEFORE the setState so the
    // new render has both the new done value + the popKey set.
    setPopKey(key);
    // Read the prior state once at the top so the
    // Bible-reading tracker side-effect (below the setState
    // callback) can see it. `cur.done` is the value BEFORE
    // the toggle — false means we just turned it on.
    const priorCur = getDone(state.done, key);
    setState((prev) => {
      // Toggle using the new done-shape helpers. They handle
      // backward-compat: the old `done[k] = boolean` shape is
      // treated as `{ done: boolean, note: '' }` on read, and
      // writes always go out as the new object shape.
      const cur = getDone(prev.done, key);
      const nextDone = setDone(prev.done, key, { done: !cur.done });
      // History: maintain a rolling 7-day list of dates where
      // ANY habit was checked. When the user toggles a checkbox
      // on, we add today's date (if not already in the list).
      // When they toggle off the last checkbox of the day,
      // we REMOVE today's date. This keeps history accurate
      // without forcing an off-day to be recorded.
      let history = prev.history || [];
      const anyChecked = Object.values(nextDone).some((entry) => {
        if (entry && typeof entry === 'object') return !!entry.done;
        return !!entry;
      });
      const todayStr = prev.date;
      const todayInHistory = history.includes(todayStr);
      if (anyChecked && !todayInHistory) {
        history = pruneHistory([...history, todayStr], todayStr);
      } else if (!anyChecked && todayInHistory) {
        history = history.filter((d) => d !== todayStr);
      }
      const next = { date: prev.date, done: nextDone, history };
      // First-ever interaction: hide the hint forever (delegated
      // to the hook layer).
      markInteracted();
      // Update best-streak whenever history changes. Monotonic —
      // we only write if the computed value is higher than what
      // is already persisted.
      const computed = bestStreakFromHistory(history);
      const persisted = readBestStreak();
      if (computed > persisted) writeBestStreak(computed);
      return next;
    });
    // Bible-reading tracker: when the user toggles the Bible
    // checkbox ON, record today as a "read" day. When they
    // toggle it OFF, undo the record. Idempotent — toggling
    // on twice in a day still counts as 1.
    if (key === 'bible') {
      try {
        if (!priorCur.done) {
          markBibleReadToday(new Date());
        } else {
          unmarkBibleReadToday(new Date());
        }
        setBibleReadTick((t) => t + 1);
      } catch {
        /* swallow */
      }
    }
    // Sunday Watchtower tracker: same pattern as Bible
    // reading but records the ISO week (not the date) so
    // Saturday-afternoon check-offs and Sunday-evening
    // check-offs both map to the same study week. The
    // history graph stays at 0 because weekly attendance
    // is independent of daily habit streaks.
    if (key === 'sundayWatchtower') {
      try {
        if (!priorCur.done) {
          markSundayWatchtowerWeek(new Date());
        } else {
          unmarkSundayWatchtowerWeek(new Date());
        }
        setSundayWatchtowerTick((t) => t + 1);
      } catch {
        /* swallow */
      }
    }
  };

  // Personal-note setter. Saves the typed note for one row, in
  // the current day's state. Persists via the same `done` map
  // (shape: { key: { done: bool, note: string } }). Debounced
  // 300ms so quick typing doesn't thrash localStorage.
  const noteTimers = useRef({});
  const setRowNote = (key, note) => {
    setState((prev) => {
      const nextDone = setDone(prev.done, key, { note });
      const next = { ...prev, done: nextDone };
      // Debounce the localStorage write by row key. Each row
      // gets its own timer so editing two rows in quick
      // succession doesn't cross-fire.
      const timers = noteTimers.current;
      if (timers[key]) clearTimeout(timers[key]);
      timers[key] = setTimeout(() => {
        // The hook's setter already persists `next` immediately.
        // This setTimeout here is a leftover from the pre-hook
        // implementation; the only side effect we still need is
        // to mark the user as having interacted, which is also
        // already handled in the toggle() call site. Nothing to
        // do here.
      }, 300);
      return next;
    });
  };

  // Bible-reading progress count. Re-reads on every render via
  // a tick counter (bumped when the Bible checkbox toggles) so
  // the chip stays in sync with the persistent counter in
  // localStorage. The count is a calendar-day set capped at 730
  // entries — see jw-bible-reading-days util for details.
  const [bibleReadTick, setBibleReadTick] = useState(0);
  // Mirror of `bibleReadTick` for the Sunday Watchtower
  // tracker: bumped every time the user toggles the Sunday
  // Watchtower row so the count re-renders. Pairs with
  // `markSundayWatchtowerWeek` / `unmarkSundayWatchtowerWeek`.
  const [sundayWatchtowerTick, setSundayWatchtowerTick] = useState(0);
  // bibleReadDays is reserved for the upcoming per-habit-days chip.
  // Currently the bible row surfaces the calendar position
  // (bibleProgress.current/total) instead — a different metric that
  // doesn't require a persistent read-counter. The tracker hook
  // stays imported + the tick stays wired so the future chip can
  // be added without re-plumbing.
  // eslint-disable-next-line no-unused-vars
  const bibleReadDays = bibleReadTick >= 0 ? bibleReadDaysCount() : 0;
  // Sunday Watchtower attendance — total ISO weeks studied.
  // Shown only when the row is visible, so it's unused
  // on Mon-Fri.
  const sundayWatchtowerWeeks = sundayWatchtowerTick >= 0 ? sundayWatchtowerWeeksCount() : 0;

  // State for which row's note disclosure is open. null = all
  // closed. Single-select so only one note textarea is visible
  // at a time. The textarea auto-focuses + auto-sizes on open.
  const [openNoteKey, setOpenNoteKey] = useState(null);

  // Resolve the daily Bible reading target for today. The
  // util is sync (no fetch) so this returns instantly.
  const dailyReading = getDailyReading(new Date());
  const bibleHref = dailyReading && dailyReading.url ? dailyReading.url : JW_ORG_SECTIONS.bibles;

  // "This week" — the current meeting-week URL, computed
  // once per render. Used for the This-week row's href and
  // sub-text. No content from jw.org is displayed.
  const thisWeek = getThisWeekMeetingUrl(new Date());

  // "Memorial" — a date-aware row that ONLY shows in the
  // ~30-day window before the annual Memorial of Christ's
  // Death. For known years (2024-2029) the sub-text shows
  // the exact date; for unknown years (2030+) it shows
  // "See jw.org for the date" and links to the year-agnostic
  // Memorial page. The row is hidden entirely outside
  // March/April. The function is null-safe (returns null
  // when the row should not appear).
  const memorial = getMemorialRow(new Date(), undefined, t);

  // "Sunday Watchtower Study" — a 2nd-row that ONLY appears
  // during the study window (Saturday morning through Sunday
  // evening). Outside this window returns null and Home.jsx
  // omits the row (mirrors the Memorial pattern). ToS clean:
  // no verse text, no scripture reference, no article body —
  // only the WOL meetings index URL for that ISO week.
  const sundayWatchtower = getSundayWatchtowerRow(new Date(), t);

  // Progress metadata for rows that show a thin progress bar.
  // Both are calendar-based — no fetch, no jw.org content.
  const bibleProgress = bibleReadingProgress(new Date());
  const textProgress = dailyTextProgress(new Date());

  // "Today" — a day-of-week-aware row that tells the user
  // what's the most relevant JW thing right now. Title flips
  // to "Tonight" on Tuesday (meeting day) and sub-text
  // changes per day (Midweek Meeting Prep, Field Service,
  // Public Meeting). Always rendered as the first habit
  // row, above the weekly rows. null-safe (returns null
  // if today is invalid, which won't happen in practice).
  const todayRow = getTodayRow(new Date(), settings, t);

  // "Year Text" — link to the current year's "Examining the
  // Scriptures Daily" brochure on jw.org. Pure date math:
  // resolves to the year-specific URL if the year has a
  // published brochure, otherwise the generic brochures
  // landing. ToS compliant (no verse text, no scripture
  // reference — only the year + a link).
  const yearText = getCurrentYearTextUrl(new Date());

  // Streak + progress metadata. All derived from local state.
  // - current: consecutive days ending today (or yesterday — grace).
  // - best: monotonically-increasing all-time best in localStorage.
  // - todayProgress: how many habit rows the user has checked today
  //   out of how many are currently visible (Memorial only counts
  //   when it's March/April).
  const streak = currentStreak(state.history || [], todayKey());
  let best = readBestStreak();
  const visibleKeys = [
    'today',
    'text',
    'bible',
    'meeting',
    'family',
    'thisWeek',
    ...(memorial ? ['memorial'] : []),
    ...(sundayWatchtower ? ['sundayWatchtower'] : []),
  ];
  const tp = todayProgress(state.done, visibleKeys);

  // The 5 habit rows, in the order Cam listed them. Each
  // row has: a key (used for the done map), an icon
  // component, a color (used for the ios-icon background), a
  // title, an optional sub-text shown beneath the title, and
  // a href to the jw.org surface where the actual habit
  // happens.
  const ROWS = [
    // "Today" — a day-of-week-aware row at the top of the
    // habit list. Tells the user what's the relevant JW
    // thing right now. Title flips to "Tonight" on Tuesday
    // (meeting day). Sub-text changes per day. The href is
    // always a public jw.org URL. The row is always shown
    // (getTodayRow never returns null for a valid date).
    ...(todayRow
      ? [
          {
            key: 'today',
            title: todayRow.title,
            sub: todayRow.sub,
            Icon: Sparkles,
            color: 'indigo',
            href: todayRow.href,
          },
        ]
      : []),
    // "Year Text" — annual scripture. Always links to the
    // current year's "Examining the Scriptures Daily"
    // brochure on jw.org (verified 200 OK for 2024/25/26;
    // unknown years fall back to the generic brochures
    // landing). ToS compliant: shows only the year + a link.
    // No verse text, no scripture reference, no theme text.
    {
      key: 'yearText',
      title: t('habit.yearText', 'Year Text'),
      sub: yearText.known
        ? t('habit.yearTextSub', {
            defaultValue: `${yearText.year} — Open this year's scripture`,
            year: yearText.year,
          })
        : t('habit.yearTextSubFallback', {
            defaultValue: 'View current Year Text on jw.org',
            year: yearText.year,
          }),
      Icon: BookMarked,
      color: 'yellow',
      href: yearText.url,
    },
    {
      key: 'text',
      title: t('habit.text', 'Daily text'),
      // Calendar-based day-of-month counter — honest metadata,
      // not a claim about jw.org publishing cadence.
      sub: textProgress.label,
      Icon: BookOpen,
      color: 'blue',
      href: getDailyTextLink(),
      progress: textProgress,
    },
    {
      key: 'bible',
      title: t('habit.bible', 'Daily Bible reading'),
      sub: dailyReading
        ? `${t('habit.bibleSubToday', { defaultValue: `Today: ${dailyReading.label || 'open the reading'}`, today: dailyReading.label || '' })} · ${bibleProgress.current}/${bibleProgress.total}`
        : t('habit.bibleSub', 'Open the New World Translation study Bible'),
      Icon: BookMarked,
      color: 'purple',
      href: bibleHref,
      progress: bibleProgress,
    },
    {
      // Meeting prep — 3 MWB sections shown as sub-row labels.
      // jw.org doesn't expose section-anchored URLs that work
      // (verified 2026-06-30: all 4 candidate URLs 404), so
      // the sub-rows are informational navigation hints, not
      // separate links. The main row's href still opens the
      // weekly schedule where all 3 sections are listed.
      key: 'meeting',
      title: t('habit.meeting', 'Meeting prep'),
      sub: t('habit.meetingSub', "This week's midweek + weekend workbook"),
      subRows: [
        { key: 'treasures', label: t('habit.treasures', "Treasures from God's Word") },
        { key: 'ministry', label: t('habit.ministry', 'Apply Yourself to the Field Ministry') },
        { key: 'living', label: t('habit.living', 'Living as Christians') },
      ],
      Icon: Users,
      color: 'green',
      href: JW_ORG_SECTIONS.meetingWorkbooks,
    },
    {
      // Family worship — 3 timing suggestions as sub-row
      // labels. Not separate links because the destination
      // page is the same generic landing; the timing
      // suggestions are planning aids for the user.
      key: 'family',
      title: t('habit.family', 'Family worship'),
      sub: t('habit.familySub', 'Talk prompts, videos, family Bible ideas'),
      subRows: [
        { key: '15', label: t('habit.family15', '15 minutes') },
        { key: '30', label: t('habit.family30', '30 minutes') },
        { key: '60', label: t('habit.family60', '60 minutes') },
      ],
      Icon: UsersRound,
      color: 'pink',
      href: JW_ORG_SECTIONS.marriageAndFamily,
    },
    {
      // "This week" — replaces the old Prayer row. The href
      // is computed from today's date (Mon-Sun ISO week, in
      // local time) and points at the public jw.org MWB
      // schedule page for that week. The sub-text shows the
      // date range, not the meeting content. No content from
      // jw.org is displayed in the app.
      key: 'thisWeek',
      title: t('habit.thisWeek', 'This week'),
      sub: thisWeek.weekOf,
      Icon: CalendarRange,
      color: 'teal',
      href: thisWeek.url,
    },
    // "Conventions" — link to jw.org's convention finder. JW
    // conventions happen regionally in summer; the exact date
    // depends on the user's location. ToS-clean Approach A
    // (no date logic): always surface the jw.org finder.
    // The row is always shown — it doesn't compete with
    // Memorial (which is only visible March/April).
    {
      key: 'conventions',
      title: t('habit.conventions', 'Conventions'),
      sub: t('habit.conventionsSub', 'Find a regional convention on jw.org'),
      Icon: Users,
      color: 'orange',
      href: JW_ORG_SECTIONS.findConvention,
    },
    // Memorial — a 6th row that ONLY appears within the
    // 30-day window before the annual Memorial. Hidden
    // entirely outside March/April. The icon (Church) and
    // color (indigo) are chosen to read as a special,
    // solemn event — distinct from the weekly habits.
    ...(memorial
      ? [
          {
            key: 'memorial',
            title: t('habit.memorial', 'Memorial'),
            sub: memorial.sub,
            // "X days away" countdown chip. "Today" on day 0,
            // "Tomorrow" on day 1, "In N days" otherwise. Hidden
            // when the exact date is unknown (e.g. 2030+) so we
            // don't lie to the user about how many days are left.
            metaChip:
              memorial.daysToMemorial === 0
                ? t('habit.memorialToday', 'Today')
                : memorial.daysToMemorial === 1
                  ? t('habit.memorialTomorrow', 'Tomorrow')
                  : memorial.daysToMemorial != null
                    ? t('habit.memorialInDays', {
                        count: memorial.daysToMemorial,
                        defaultValue: `In ${memorial.daysToMemorial} days`,
                      })
                    : null,
            // Pre-filled share text for the system share sheet.
            // Tapping the row's "Share" sub-action (added below the
            // row in the JSX) opens navigator.share with this text.
            shareText: memorial.shareText,
            Icon: Church,
            color: 'indigo',
            href: memorial.href,
          },
        ]
      : []),
    // "Sunday Watchtower Study" — appears Saturday 8 AM
    // through Sunday end-of-day. Hidden Mon-Fri. The href
    // opens the WOL meetings index for the ISO week
    // containing the upcoming Sunday; from there the user
    // can open the actual article in JW Library. No
    // checklist here — completion is a single tap on the
    // row's checkbox (same pattern as Daily text + Bible
    // reading). ToS clean: no verse text, no scripture.
    ...(sundayWatchtower
      ? [
          {
            key: 'sundayWatchtower',
            title: t('habit.sundayWatchtower', 'Sunday Watchtower Study'),
            // Title shows the Sunday date; sub shows the running
            // count of weeks studied (or stays the helper string if
            // sundayWatchtowerWeeks is 0). The chip flips to a
            // generic "study window" line on Saturday morning to
            // nudge studying ahead.
            sub: t('habit.sundayWatchtowerSub', { weekOf: sundayWatchtower.weekOf }),
            metaChip:
              sundayWatchtowerWeeks > 0
                ? t('habit.sundayWatchtowerWeeks', {
                    count: sundayWatchtowerWeeks,
                    defaultValue: sundayWatchtowerWeeks + ' weeks attended',
                  })
                : null,
            Icon: BookOpen,
            color: 'purple',
            href: sundayWatchtower.href,
            // Inline sub-action: when a docid is seeded for this
            // ISO week, surface "Open in JW Library" — taps
            // open the registered jwlibrary:// URL scheme which
            // the OS hands to the JW Library app (iOS/Android/
            // desktop). On platforms without JW Library installed
            // the OS shows a fallback or no-op; the parent href
            // (WOL meetings index) stays as the fallback target.
            // Hidden when no docid is seeded yet.
            subActions: sundayWatchtower.jwlibraryUrl
              ? [
                  {
                    key: 'openInJwLibrary',
                    kind: 'link',
                    label: t('habit.openInJwLibrary', 'Open in JW Library'),
                    ariaLabel: t('habit.openInJwLibraryAria', {
                      defaultValue: "Open this week's Watchtower article in JW Library",
                    }),
                    url: sundayWatchtower.jwlibraryUrl,
                    icon: ExternalLink,
                  },
                ]
              : [],
          },
        ]
      : []),
  ];

  const greetingText = (() => {
    const hour = new Date().getHours();
    if (hour < 5) return t('greeting.night', 'Good night');
    if (hour < 12) return t('greeting.morning', 'Good morning');
    if (hour < 17) return t('greeting.afternoon', 'Good afternoon');
    if (hour < 21) return t('greeting.evening', 'Good evening');
    return t('greeting.night', 'Good night');
  })();

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // The week strip — a compact Mon..Sun row at the top of
  // the home that gives the user a "where am I in the week"
  // visual signal. Today is bold + tinted; other days are
  // muted. Pure date math, no content from jw.org. The
  // strip is local-time Mon..Sun (jw.org uses Mon..Sun
  // week boundaries too — they coincide).
  //
  // Layout: 7 equally-spaced columns. Each column shows the
  // 3-letter weekday + the day-of-month number. The "today"
  // column has a small accent background + bold weight so
  // it pops without being noisy.
  const weekStrip = (() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    // weekday 0=Sun..6=Sat; we want Mon..Sun so the offset
    // from Mon is (weekday + 6) % 7.
    const dow = start.getDay();
    const offsetToMonday = (dow + 6) % 7;
    start.setDate(start.getDate() - offsetToMonday);
    const dayLetters = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      // fullDate is the ISO YYYY-MM-DD string for the dot
      // strip to match against the per-day history array.
      const fullDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        label: dayLetters[i],
        date: d.getDate(),
        fullDate,
        isToday:
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate(),
      });
    }
    return days;
  })();

  return (
    <div className="min-h-screen bg-base-200 pb-16">
      {/* Sticky iOS top bar — title only. No hamburger, no
          settings gear, no other chrome. The app is one
          page. */}
      <header
        className="sticky top-0 z-30 backdrop-blur-lg bg-base-200/80 border-b border-base-300/30"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="container mx-auto px-4 max-w-2xl flex items-center justify-center h-12">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/80">
            {t('appName', 'JW Habits')}
          </span>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-2xl">
        {storageFull && (
          <div
            role="alert"
            className="mt-3 mb-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-base-content"
          >
            {t(
              'home.storageFull',
              'This device is out of storage space. Habit checkmarks may not save until you free some space.'
            )}
          </div>
        )}
        {offlineOpenHint && (
          <div
            role="status"
            className="mt-3 mb-2 rounded-lg border border-base-300 bg-base-200 px-3 py-2 text-sm text-base-content"
          >
            {t(
              'home.offlineOpen',
              'You are offline. Connect to open jw.org links — JW Library deep links still work.'
            )}
          </div>
        )}
        <h1 className="ios-large-title">
          {greetingText}.<span className="sub">{formattedDate}</span>
        </h1>

        {/* Week strip — Mon..Sun with today highlighted. A
            visual signal of "where am I in the week" placed
            between the date and the first-launch hint / habit
            list. The 7 columns share the width of the 5-row
            habit card below, so the strip feels like part of
            the same surface. */}
        <div
          className="grid grid-cols-7 gap-1 mb-4 text-center text-xs select-none"
          aria-label="This week"
        >
          {weekStrip.map((d, i) => (
            <div
              key={i}
              className={
                'py-1.5 rounded-md ' +
                (d.isToday
                  ? 'bg-primary text-primary-content font-bold'
                  : // /80 keeps the inactive days visually subdued
                    // while clearing the WCAG AA 4.5:1 contrast
                    // threshold against bg-base-200. /60 was 2.81:1
                    // and 3.93:1 — axe-core flagged both as serious.
                    'text-base-content/80')
              }
            >
              <div className="text-[10px] uppercase tracking-wider">{d.label}</div>
              <div className="text-base font-semibold leading-tight">{d.date}</div>
            </div>
          ))}
        </div>

        {/* Weekly dots — a row of 7 small dots showing
            which days this week the user has checked off at
            least one habit. Filled = checked that day, hollow
            = missed. Pure local state
            (jw-daily-habits-state.history). No content from
            jw.org. The dots are aligned under the week-strip
            columns so the user can see "I checked Tuesday
            (col 1) and Thursday (col 3)" at a glance. */}
        <div className="grid grid-cols-7 gap-1 mb-4 select-none" aria-label="This week checked">
          {weekStrip.map((d, i) => {
            const wasChecked = state.history && state.history.includes(d.fullDate);
            return (
              <div
                key={i}
                className="flex items-center justify-center py-1"
                title={wasChecked ? `${d.fullDate} — checked` : `${d.fullDate} — no check`}
              >
                <span
                  className={
                    'inline-block w-2 h-2 rounded-full ' +
                    (wasChecked ? 'bg-primary' : 'border border-base-content/30 bg-transparent')
                  }
                />
              </div>
            );
          })}
        </div>

        {/* Streak + today-progress line. A single quiet row
            under the dots strip that shows: current streak
            (consecutive days with at least one habit
            checked), best streak (all-time, persisted),
            and today's progress (X of N). Hidden until
            the user has interacted at least once (so
            first-time visitors aren't immediately
            confronted with "0 day streak — start today!").

            All values are pure localStorage / derived. No
            jw.org content. Matches the iOS Reminders /
            Apple Fitness style: small grey meta line under
            a visualization. */}
        {hasUserInteracted() && (streak > 0 || tp.done > 0 || best > 0) && (
          <div
            className="flex items-center justify-center gap-3 mb-4 text-xs text-base-content/70 select-none flex-wrap"
            aria-label="Streak and today's progress"
          >
            {streak > 0 && (
              <span
                className="inline-flex items-center gap-1"
                aria-label={`Current streak ${streak} ${streak === 1 ? 'day' : 'days'}`}
              >
                <span aria-hidden="true">🔥</span>
                <span className="font-semibold text-base-content/90">{streak}</span>
                <span>{t('home.streakDays', 'day streak')}</span>
              </span>
            )}
            {best > 0 && best !== streak && (
              <>
                <span className="text-base-content/30" aria-hidden="true">
                  ·
                </span>
                <span aria-label={`Best streak ${best} ${best === 1 ? 'day' : 'days'}`}>
                  <span className="font-semibold text-base-content/90">{best}</span>{' '}
                  {t('home.streakBest', 'best')}
                </span>
              </>
            )}
            <span className="text-base-content/30" aria-hidden="true">
              ·
            </span>
            <span aria-label={`Today ${tp.done} of ${tp.total}`}>
              <span className="font-semibold text-base-content/90">{tp.done}</span>
              <span>/{tp.total}</span> {t('home.streakToday', 'today')}
            </span>
          </div>
        )}
        {/* First-launch hint. Shows exactly once, ever, until the
            (the jw-habits-first-done localStorage key is set in
            toggle() and survives per-day resets). The hint is
            intentionally below the date and above the rows so
            it reads naturally as a "what is this screen" note.
            text-base-content/80 (instead of /70) so it stays
            readable in dark mode where /70 sits too close to
            the card surface. */}
        {!hasUserInteracted() && (
          <p className="text-sm text-base-content/80 mt-1 mb-4 px-1" role="note">
            {t('home.firstRunHint', 'Tap a row to open jw.org. Tap the checkbox when done.')}
          </p>
        )}

        {/* The five habit rows. Each row is its own card; the
            left side opens jw.org, the right side is a
            checkbox. No toast, no animation, no "complete" card. */}
        <div className="ios-grouped">
          {ROWS.map((row) => {
            const { key, title, sub, color, href, progress, subRows, metaChip, shareText } = row;
            const RowIcon = row.Icon;
            const rowState = getDone(state.done, key);
            const isDone = !!rowState.done;
            const rowNote = rowState.note;
            const noteOpen = openNoteKey === key;
            const noteId = `note-${key}`;
            return (
              <div key={key}>
                <div
                  className="ios-row"
                  // Dim the entire row + strike-through the title
                  // when the habit is marked done. Same iOS Reminders
                  // pattern — no animation, no toast, just a quiet
                  // visual signal. The row is still tappable to
                  // open jw.org.
                  style={isDone ? { opacity: 0.55 } : undefined}
                >
                  {/* Left: link to jw.org — block when offline so the
                      browser doesn't dump the user on a failed tab.
                      jwlibrary:// deep links still work offline (OS
                      hands off to the JW Library app). */}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    aria-label={`${title} — opens jw.org in a new tab`}
                    onClick={(e) => {
                      const isJwLibrary = typeof href === 'string' && href.startsWith('jwlibrary:');
                      if (
                        !isJwLibrary &&
                        typeof navigator !== 'undefined' &&
                        navigator.onLine === false
                      ) {
                        e.preventDefault();
                        window.dispatchEvent(new CustomEvent('jw-offline-open'));
                      }
                    }}
                  >
                    <div className={`ios-icon ${color}`}>
                      <RowIcon className="w-4 h-4" />
                    </div>
                    <div className="body min-w-0 flex-1">
                      <div className={`title truncate ${isDone ? 'line-through' : ''}`}>
                        {title}
                      </div>
                      {sub && <div className="sub truncate">{sub}</div>}
                      {metaChip && (
                        <div
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary self-start"
                          aria-label={metaChip}
                        >
                          {metaChip}
                        </div>
                      )}
                      {/* Share-invite button. Only rendered on
                          rows that carry a `shareText` (today:
                          the Memorial row). Tapping calls
                          navigator.share() with the pre-filled
                          text. Falls back to clipboard.copy() if
                          the system share sheet isn't available
                          (older browsers, no HTTPS context). */}
                      {/* Sub-actions. Each row can expose 0..N
                          chip-style inline buttons under its
                          sub-text. Current consumers:
                            - shareText: opens the system share
                              sheet (Memorial row).
                            - jwlibraryUrl: inline link to open
                              the publication in the JW Library
                              app via jwlibrary:// URL scheme
                              (Sunday Watchtower row).
                          All sub-actions render with the same
                          chip styling; only the click handler
                          and target differ. Tapping any
                          sub-action stops propagation so the
                          parent <a> doesn't also navigate. */}
                      {Array.isArray(row.subActions) && row.subActions.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {row.subActions.map((act) => (
                            <button
                              key={act.key}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (act.onClick) return act.onClick(e);
                                if (act.kind === 'share') return shareInvite(act.text);
                                if (act.kind === 'link' && act.url) {
                                  const isJwLibrary = act.url.startsWith('jwlibrary:');
                                  if (
                                    !isJwLibrary &&
                                    typeof navigator !== 'undefined' &&
                                    navigator.onLine === false
                                  ) {
                                    window.dispatchEvent(new CustomEvent('jw-offline-open'));
                                    return;
                                  }
                                  window.open(act.url, '_blank', 'noopener,noreferrer');
                                  return;
                                }
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-sm px-1 -ml-1"
                              aria-label={act.ariaLabel || act.label}
                            >
                              {act.icon && <act.icon className="w-3 h-3" aria-hidden="true" />}
                              <span>{act.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Legacy shareText prop — kept so the
                          Memorial row still works without
                          translation. New rows should use the
                          subActions array above instead. */}
                      {shareText && !Array.isArray(row.subActions) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            shareInvite(shareText);
                          }}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-sm px-1 -ml-1"
                          aria-label={t('habit.shareInvite', 'Share invitation')}
                        >
                          <Share2 className="w-3 h-3" aria-hidden="true" />
                          <span>{t('habit.shareInvite', 'Share invite')}</span>
                        </button>
                      )}
                      {/* Progress bar — only for rows that have a
                          progress object (Daily text, Bible reading).
                          Thin, faded track + primary fill. 100% width
                          of the title area, so it visually anchors
                          below the sub-text. Pure metadata, no jw.org
                          content implied. */}
                      {progress && (
                        <div
                          className="mt-1.5 h-1 w-full rounded-full bg-base-content/15 overflow-hidden"
                          role="progressbar"
                          aria-valuenow={progress.current}
                          aria-valuemin={0}
                          aria-valuemax={progress.total}
                          aria-label={progress.label}
                        >
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.round(progress.pct * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <ArrowUpRight className="ios-chev text-base-content/60 shrink-0" />
                  </a>
                  {/* Right: checkbox. Tapping it marks the habit done
                      (or un-done). No animation, no toast, no
                      celebration — just a quiet tick. */}
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className="ml-3 shrink-0"
                    aria-label={isDone ? `Mark ${title} as not done` : `Mark ${title} as done`}
                    aria-pressed={isDone}
                  >
                    <span
                      className={`ios-checkbox ${isDone ? 'done' : 'empty'} ${popKey === key ? 'ios-checkbox-pop' : ''}`}
                    >
                      {isDone && (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                  </button>
                </div>
                {/* Sub-rows: 3-section breakdown for Meeting prep
                    (Treasures / Ministry / Living) and 3 timing
                    options for Family worship. These are
                    informational labels — they do NOT have separate
                    links (jw.org doesn't expose section-anchored
                    URLs that work, and timing doesn't change the
                    destination). They sit visually nested under
                    their parent row. */}
                {subRows && subRows.length > 0 && (
                  <div
                    className="ml-12 mr-12 mb-2 -mt-1 text-xs text-base-content/60"
                    aria-label={`${title} options`}
                  >
                    {subRows.map((s, i) => (
                      <div
                        key={s.key}
                        className={`py-1 flex items-center gap-2 ${i < subRows.length - 1 ? 'border-b border-base-content/5' : ''}`}
                      >
                        <span
                          className="w-1 h-1 rounded-full bg-base-content/30 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="truncate">{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Personal-note disclosure. Each row has a
                    tiny chevron button on the right that opens
                    a one-line textarea under the row. Notes are
                    private (on-device only), per-day (gone at
                    midnight), capped at NOTE_MAX_LENGTH
                    chars, and auto-save 300ms after the user
                    stops typing. Empty + closed by default.
                    Hidden entirely on first-launch (before
                    hasUserInteracted) so the home stays minimal for
                    fresh users. */}
                {hasUserInteracted() && (
                  <div className="ml-12 mr-12 -mt-1 mb-2">
                    <button
                      type="button"
                      onClick={() => setOpenNoteKey(noteOpen ? null : key)}
                      className="flex items-center gap-1 text-[11px] text-base-content/50 hover:text-base-content/70 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-sm px-1 -ml-1"
                      aria-expanded={noteOpen}
                      aria-controls={noteId}
                      aria-label={
                        noteOpen
                          ? `Hide note for ${title}`
                          : rowNote
                            ? `Edit note for ${title}`
                            : `Add a note for ${title}`
                      }
                    >
                      <StickyNote className="w-3 h-3" aria-hidden="true" />
                      <span>{rowNote ? 'Note' : 'Add note'}</span>
                      <ChevronDown
                        className={'w-3 h-3 transition-transform ' + (noteOpen ? 'rotate-180' : '')}
                        aria-hidden="true"
                      />
                    </button>
                    {noteOpen && (
                      <textarea
                        id={noteId}
                        defaultValue={rowNote}
                        autoFocus
                        maxLength={NOTE_MAX_LENGTH}
                        rows={2}
                        onChange={(e) => setRowNote(key, e.target.value)}
                        placeholder={t(
                          'habit.notePlaceholder',
                          'A quick reminder for yourself — never leaves your device.'
                        )}
                        className="mt-1 w-full text-xs text-base-content bg-base-100 border border-base-300/40 rounded-md p-2 resize-none focus:outline-hidden focus:ring-2 focus:ring-primary"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <footer className="ios-footer">
          Unofficial third-party tool. Not affiliated with jw.org.
        </footer>

        {/* Settings — inline accordion at the bottom of the
            page. No top-bar chrome, no drawer, no new route.
            Lives where the footer lives so the home stays
            one-page-clean. The accordion reads its own state
            from localStorage and re-renders when settings
            change. */}
        <SettingsAccordion />

        <div className="h-4" />
      </main>
    </div>
  );
}

export default Home;
