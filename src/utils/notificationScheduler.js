/**
 * Daily reminder scheduler.
 *
 * What it does:
 *   - Reads the user's reminderTime + quietHours from localStorage.
 *   - Computes the next moment to fire the reminder (today at
 *     reminderTime, or tomorrow if it's already past).
 *   - Schedules a setTimeout that fires the OS-level notification
 *     via the service worker (if permission granted) and then
 *     reschedules for the next day.
 *   - If the would-be fire time falls in quietHours, skips to the
 *     first moment after quietHours ends.
 *
 * Honest implementation notes:
 *   - This is a "page-open only" scheduler. When the page is closed
 *     (PWA not running, browser killed, phone off), the setTimeout
 *     is lost. True background push needs a server with VAPID keys
 *     — JW Habits has no backend.
 *   - Service worker `showNotification` still works while the page
 *     is hidden (e.g. user is in another tab on iOS Safari with the
 *     PWA installed). That's the realistic UX bound for a no-server
 *     PWA.
 *   - On iOS Safari, notifications only work after the user installs
 *     the PWA to the Home Screen. Detection via JS is imperfect;
 *     we surface a hint when the user grants permission but the
 *     first notification doesn't fire.
 *
 * ToS compliance:
 *   - No jw.org content in the notification body. Just generic
 *     "Time to check your daily habits" copy.
 *   - All data lives in localStorage; nothing is sent over the
 *     network (no server, no analytics).
 */

/** Permission state shape returned by getPermissionState(). */
export const NOTIFICATION_PERMISSION = {
  GRANTED: 'granted',
  DENIED: 'denied',
  DEFAULT: 'default',
  UNSUPPORTED: 'unsupported',
};

/** Storage key shared with the SettingsAccordion UI. */
export const REMINDER_STORAGE_KEY = 'jw-user-settings';

/**
 * Map browser Notification.permission to our internal enum.
 * Returns 'unsupported' when the API is absent (Safari private
 * mode, very old browsers, iframe without permission).
 */
export function getPermissionState() {
  if (typeof window === 'undefined') return NOTIFICATION_PERMISSION.UNSUPPORTED;
  if (!('Notification' in window)) return NOTIFICATION_PERMISSION.UNSUPPORTED;
  switch (Notification.permission) {
    case 'granted':   return NOTIFICATION_PERMISSION.GRANTED;
    case 'denied':    return NOTIFICATION_PERMISSION.DENIED;
    case 'default':   return NOTIFICATION_PERMISSION.DEFAULT;
    default:          return NOTIFICATION_PERMISSION.DEFAULT;
  }
}

/** Convenience: ask the OS for permission. Returns a promise. */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return NOTIFICATION_PERMISSION.UNSUPPORTED;
  try {
    const result = await Notification.requestPermission();
    switch (result) {
      case 'granted':   return NOTIFICATION_PERMISSION.GRANTED;
      case 'denied':    return NOTIFICATION_PERMISSION.DENIED;
      default:          return NOTIFICATION_PERMISSION.DEFAULT;
    }
  } catch {
    return NOTIFICATION_PERMISSION.UNSUPPORTED;
  }
}

/**
 * Parse "HH:MM" into { hours, minutes }. Returns null for
 * invalid input (used to defensively coerce user settings
 * before they hit Date math).
 */
export function parseHHMM(s) {
  if (typeof s !== 'string') return null;
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

/**
 * Compute the next reminder fire time.
 *
 * Inputs:
 *   - now: the current Date (defaults to now)
 *   - reminderTime: "HH:MM" string (e.g. "21:00")
 *   - quietHours: { start, end } in "HH:MM" or null
 *
 * Returns a Date for the next fire moment, or null if
 * reminderTime is missing.
 *
 * Logic:
 *   1. Today's fire = today at reminderTime.
 *   2. If today is past → tomorrow at reminderTime.
 *   3. If the next fire falls inside quietHours, shift to the
 *      first moment AFTER quietHours end.
 *
 * Quiet hours range can wrap midnight: { start: '22:00', end: '07:00' }
 * means "10pm tonight through 7am tomorrow". The end is on the
 * following day from the perspective of the start.
 */
export function nextFireTime(now = new Date(), reminderTime, quietHours) {
  const parsed = parseHHMM(reminderTime);
  if (!parsed) return null;
  const { hours, minutes } = parsed;

  // Build candidate: today at HH:MM (local).
  const candidate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0,
    0,
  );
  if (candidate.getTime() <= now.getTime()) {
    // Already past today → push to tomorrow.
    candidate.setDate(candidate.getDate() + 1);
  }

  // Apply quietHours. Returns the candidate unchanged if it's
  // not within the quiet window.
  return skipQuiet(candidate, quietHours);
}

/**
 * If `t` falls inside quietHours, return the first moment after
 * quietHours end. Otherwise return t unchanged.
 *
 * Quiet-hours semantics:
 *   - { start: '07:00', end: '22:00' } → quiet 07:00-22:00 same day.
 *   - { start: '22:00', end: '07:00' } → quiet 22:00-07:00 wrapping
 *     midnight (22:00 today → 07:00 tomorrow).
 */
export function skipQuiet(t, quietHours) {
  if (!quietHours) return t;
  const start = parseHHMM(quietHours.start);
  const end = parseHHMM(quietHours.end);
  if (!start || !end) return t;

  // Construct the quiet window's endpoints. Two cases:
  //   start.hours < end.hours: same-day window — both endpoints
  //     fall on `t`'s calendar date.
  //   start.hours > end.hours: wraps midnight — start is on `t`'s
  //     date, end is on the next calendar date.
  // Boundary semantics: the start moment is INCLUSIVE (fire at
  // exactly start.hours:start.minutes is allowed), the end moment
  // is EXCLUSIVE (no quiet at the exact end minute).
  const sameStart = new Date(t.getFullYear(), t.getMonth(), t.getDate(), start.hours, start.minutes);
  const sameEnd   = new Date(t.getFullYear(), t.getMonth(), t.getDate(), end.hours,   end.minutes);
  const wrapEnd   = new Date(t.getFullYear(), t.getMonth(), t.getDate(), end.hours,   end.minutes);
  if (start.hours > end.hours) wrapEnd.setDate(wrapEnd.getDate() + 1);

  const inWindow = (() => {
    if (start.hours < end.hours) {
      // Same-day: (sameStart, sameEnd) — start open, end open.
      return t > sameStart && t < sameEnd;
    } else if (start.hours > end.hours) {
      // Wrap: (sameStart, ∞) ∪ (-∞, wrapEnd) — start open, end open.
      return t > sameStart || t < wrapEnd;
    } else {
      // start === end → no quiet hours.
      return false;
    }
  })();

  if (!inWindow) return t;

  // Fire moment is in quiet hours. Advance to the END moment.
  // If the end moment is already past (rare; happens when quiet
  // wraps most of the day), recursively push +24h.
  const next = start.hours > end.hours ? wrapEnd : sameEnd;
  if (next.getTime() <= t.getTime()) {
    return skipQuiet(new Date(next.getTime() + 24 * 60 * 60 * 1000), quietHours);
  }
  return next;
}

/**
 * Show the OS notification via the service worker if permission
 * allows. Falls back to a bare `new Notification()` when no SW
 * is registered (dev mode, tests). Returns the notification
 * object or null.
 *
 * Generic copy — no jw.org content, just a habit-check prompt.
 */
export async function showReminderNotification({ title, body, tag: explicitTag }) {
  const finalTitle = title || 'JW Habits';
  const finalBody = body || 'Time to check your daily habits.';
  // Default tag for the daily reminder. Weekly notifications
  // (Sunday Watchtower study) pass their own tag so OS-level
  // notification stacks treat them as separate threads.
  const tag = explicitTag || 'jw-habits-reminder';
  const data = { url: '/' };

  // Prefer SW path — works on iOS Safari with installed PWA.
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        return reg.showNotification(finalTitle, {
          body: finalBody,
          tag,
          data,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          requireInteraction: false,
        });
      }
    } catch {
      // fall through to direct Notification
    }
  }
  // Dev / no-SW fallback.
  if ('Notification' in window && Notification.permission === 'granted') {
    return new Notification(finalTitle, {
      body: finalBody,
      tag,
      data,
      icon: '/pwa-192x192.png',
    });
  }
  return null;
}

/**
 * State for the active scheduler. Module-level so cancel() can
 * reach in and clear without a closure reference.
 */
let timerId = null;

/**
 * Schedule (or reschedule) the daily reminder based on the
 * user's current settings. Cancels any existing timer.
 *
 * - Does nothing if reminders are disabled (reminderTime is null).
 * - Schedules a setTimeout for the next fire time.
 * - When fired, calls showReminderNotification and reschedules
 *   for the next day.
 */
export function startReminder() {
  cancelReminder();
  const settings = loadReminderSettings();
  if (!settings || !settings.reminderTime) return;

  const fireAt = nextFireTime(new Date(), settings.reminderTime, settings.quietHours);
  if (!fireAt) return;
  const delay = Math.max(0, fireAt.getTime() - Date.now());

  timerId = setTimeout(() => {
    showReminderNotification({
      title: 'JW Habits',
      body: 'Time to check your daily habits.',
    });
    // Reschedule for the next day. Use a fresh Date so the
    // "today vs tomorrow" computation in nextFireTime is
    // relative to the actual current moment, not the firing
    // moment.
    startReminder();
  }, delay);
}

/** Cancel any pending reminder setTimeout. Idempotent. */
export function cancelReminder() {
  if (timerId != null) {
    clearTimeout(timerId);
    timerId = null;
  }
}

/* ─── Sunday Watchtower notifications ──────────────────────────────
 *
 * These fire on a weekly cadence (not daily) because Sunday
 * Watchtower study is a *weekly* habit. The scheduler keys
 * each timer separately so they coexist with the daily
 * habit reminder and don't trip over each other's state.
 *
 *   scheduleSaturdayWindowOpen():
 *     Saturday 8 AM local — fires once a week.
 *     Copy: "Sunday Watchtower Study is ready. Tap to study."
 *     No jw.org content; just a habit-check prompt.
 *
 *   scheduleSundayEveningCheck():
 *     Sunday 6 PM local — fires once a week.
 *     Copy: "Did you study this week's Sunday article?"
 *
 * Both are "page-open only" (same constraint as the daily
 * reminder): when the page is closed the setTimeout is lost.
 * True weekly background push needs a server with VAPID keys.
 */

let saturdayTimer = null;
let sundayTimer = null;

/** Schedule the Saturday-8 AM study-window-open notification. */
export function scheduleSaturdayWindowOpen() {
  cancelSaturdayWindowOpen();
  const target = nextWeeklyFire(new Date(), 6, 8, 0); // 6 = Saturday
  if (!target) return;
  const delay = Math.max(0, target.getTime() - Date.now());
  saturdayTimer = setTimeout(() => {
    showReminderNotification({
      title: 'Sunday Watchtower Study',
      body: "This week's article is ready. Tap to study.",
      tag: 'jw-saturday-window',
    });
    // Reschedule for next Saturday.
    scheduleSaturdayWindowOpen();
  }, delay);
}

/** Cancel the Saturday-window timer. Idempotent. */
export function cancelSaturdayWindowOpen() {
  if (saturdayTimer != null) {
    clearTimeout(saturdayTimer);
    saturdayTimer = null;
  }
}

/** Schedule the Sunday-6 PM "did you study this week?" nudge. */
export function scheduleSundayEveningCheck() {
  cancelSundayEveningCheck();
  const target = nextWeeklyFire(new Date(), 0, 18, 0); // 0 = Sunday
  if (!target) return;
  const delay = Math.max(0, target.getTime() - Date.now());
  sundayTimer = setTimeout(() => {
    showReminderNotification({
      title: 'Sunday Watchtower Study',
      body: 'Did you study this week\'s article? Tap to mark done.',
      tag: 'jw-sunday-check',
    });
    scheduleSundayEveningCheck();
  }, delay);
}

/** Cancel the Sunday-evening timer. Idempotent. */
export function cancelSundayEveningCheck() {
  if (sundayTimer != null) {
    clearTimeout(sundayTimer);
    sundayTimer = null;
  }
}

/**
 * Compute the next moment for a weekly fire (specific
 * weekday + HH:MM local). Returns a Date, or null if input
 * is invalid.
 *
 * Pure function — does not call new Date() internally. Tests
 * pass `now` explicitly so behavior is reproducible.
 *
 * @param {Date} now
 * @param {number} weekday - 0=Sun..6=Sat
 * @param {number} hours
 * @param {number} minutes
 */
export function nextWeeklyFire(now, weekday, hours, minutes) {
  if (!(now instanceof Date) || isNaN(now.getTime())) return null;
  if (weekday < 0 || weekday > 6) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  const curDow = now.getDay();
  let delta = (weekday - curDow + 7) % 7;
  target.setDate(target.getDate() + delta);
  // If the candidate is exactly `now` (delta=0, same time),
  // schedule for next week's same day. Avoids immediate-fire.
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 7);
  }
  return target;
}

/**
 * Read settings from localStorage. Resilient to corrupted JSON.
 * Re-imported here (instead of via settingsStore) to avoid a
 * circular dependency with SettingsAccordion.jsx, which is the
 * component that toggles settings.
 */
function loadReminderSettings() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = JSON.parse(localStorage.getItem(REMINDER_STORAGE_KEY) || '{}');
    if (!raw || typeof raw !== 'object') return null;
    return {
      reminderTime: typeof raw.reminderTime === 'string' ? raw.reminderTime : null,
      quietHours: raw.quietHours && typeof raw.quietHours === 'object'
        ? {
            start: typeof raw.quietHours.start === 'string' ? raw.quietHours.start : null,
            end:   typeof raw.quietHours.end   === 'string' ? raw.quietHours.end   : null,
          }
        : null,
    };
  } catch {
    return null;
  }
}