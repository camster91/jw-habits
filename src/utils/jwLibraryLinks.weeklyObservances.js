/**
 * Weekly observances — Memorial, Sunday Watchtower, and Today rows.
 *
 * - getMemorialDate: published Memorial date for a year
 * - getMemorialRow: home-page row data for Memorial (March-April window)
 * - getSundayWatchtowerDocid: WOL docid lookup by ISO week
 * - sundayDocidForWeek: same as above (back-compat alias)
 * - getSundayWatchtowerRow: home-page row data for Sunday Watchtower
 * - getTodayRow: date-aware "Today" row (midweek meeting / field service / etc.)
 *
 * Split out of jwLibraryLinks.js for readability (issue #141).
 * API is re-exported from the main module — consumers should
 * import from 'jwLibraryLinks' not this file.
 */

import { isoWeekOfDate } from './sundayWatchtowerTracker.js';
import { jwlibraryPublicationUrl, getPublicationFinderUrl } from './jwLibraryLinks.publications.js';
import { getThisWeekMeetingUrl } from './jwLibraryLinks.meetingWorkbook.js';

/**
 * Sunday Watchtower publication docid lookup.
 *
 * WOL docids for the Sunday Watchtower Study article
 * (e.g. 2026402 for week 30, 2026 — "Make Wise Decisions
 * Regarding Additional Education") follow a year-bounded
 * numbering scheme. JW publishes the next month's docid
 * roughly 4-6 weeks ahead of the meeting date.
 *
 * Seed this when you see the next month's article appear
 * in WOL (https://wol.jw.org/en/wol/meetings/r1/lp-e/<year>/<week>).
 * Until a docid is seeded, the row's primary href stays on
 * the WOL meetings index (the user can drill down manually)
 * and the "Open in JW Library" sub-action stays hidden.
 *
 * Keyed by ISO year+week string, e.g. '2026-W30'. Two
 * consecutive years where the same week number collides
 * (rare — happens near year boundaries) are disambiguated
 * by year automatically.
 */
const WATCHTOWER_DOCIDS = Object.freeze({
  // 2026-07-26 through 2026-08-01 — "Make Wise Decisions
  // Regarding Additional Education", w26 May pp. 14-19.
  '2026-W30': 2026402,
  // Extend as new weeks publish. Examples:
  //   '2026-W31': 2027200,  // (not yet published — placeholder)
  //   '2026-W32': 2027201,  // (placeholder)
});

/**
 * Resolve the Sunday Watchtower Study docid for an ISO
 * week. Returns null when no docid is seeded for that
 * week — callers fall back to the WOL meetings index.
 *
 * Pure function over WATCHTOWER_DOCIDS — pass an explicit
 * `override` map for testability (avoids mutating the
 * frozen constant).
 *
 * @param {string} studyWeek  ISO week id like '2026-W30'
 * @param {Record<string, number>} [override]  Optional map override
 * @returns {number | null}
 */
export function getSundayWatchtowerDocid(studyWeek, override = null) {
  if (typeof studyWeek !== 'string' || !/^\d{4}-W\d{2}$/.test(studyWeek)) {
    return null;
  }
  const map = override || WATCHTOWER_DOCIDS;
  const docid = map[studyWeek];
  return typeof docid === 'number' && docid > 0 ? docid : null;
}

/**
 * Sunday Watchtower publication lookup — returns the docid
 * from the static map, or null. Caller passes the
 * already-computed studyWeek id (e.g. '2026-W30') from
 * `getSundayWatchtowerRow().studyWeek`.
 */
export function sundayDocidForWeek(studyWeek) {
  return getSundayWatchtowerDocid(studyWeek);
}

/**
 * Sunday Watchtower Study — when is the row visible?
 *
 * The Sunday public meeting is a *weekly* event (not daily),
 * so surfacing the row 24/7 would create noise. The row
 * appears within a "study window":
 *   - Saturday morning (8 AM local) through Sunday evening (11 PM)
 *   - The "weekend meeting prep" Saturday row doubles as a
 *     breadcrumb link to next Sunday's article, so users can
 *     study ahead.
 *
 * Outside this window the function returns `null` and Home.jsx
 * omits the row entirely (mirrors the Memorial pattern).
 *
 * ToS clean: no verse text, no scripture reference, no
 * article body. Only a date-derived Watchtower study index
 * link + week label.
 *
 * @param {Date} [date] - defaults to today
 * @returns {{ title, sub, href, weekOf, studyWeek } | null}
 */
export function getSundayWatchtowerRow(
  date = new Date(),
  t = (k, dflt) => dflt ?? k,
  docid = null
) {
  if (isNaN(date.getTime())) return null;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay(); // 0=Sun..6=Sat
  const hour = date.getHours();
  // Visible window: Saturday (6) from 08:00 local through
  // Sunday (0) end-of-day (23:59). Hidden on Mon-Fri.
  const inWindow = (dow === 6 && hour >= 8) || dow === 0;
  if (!inWindow) return null;

  // Compute the Sunday's ISO week number (Mon-Sun ISO).
  // Saturday is part of the SAME ISO week as the upcoming
  // Sunday: Saturday + 1 = Sunday, both in week `dow===6 || 0`.
  // We just resolve the Sunday that owns this weekend.
  const sunday = new Date(d.getTime());
  if (dow === 6) sunday.setDate(sunday.getDate() + 1);

  // Format the weekOf label (e.g., "Sunday, October 26").
  const localeMap = { en: 'en-US', es: 'es-ES', fr: 'fr-FR' };
  const activeLang = (typeof window !== 'undefined' && window.__jw_lang) || 'en';
  const fmtLocale = localeMap[activeLang] || 'en-US';
  const weekOfLabel = sunday.toLocaleString(fmtLocale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // The WOL meetings index shows the Sunday Watchtower Study
  // docid for the ISO week containing `sunday`. URL shape:
  //   https://wol.jw.org/en/wol/meetings/r1/lp-e/<year>/<iso-week>
  // (Verified against the midweek-meeting-prep skill — same
  //  endpoint, weekday pattern differs but ISO-week math is
  //  identical.)
  // Use the canonical ISO-week implementation from sundayWatchtowerTracker
  // (issue #143 — single source of truth). Both algorithms agreed on
  // every edge case (Jan 1, Dec 31, year boundary, week 53).
  const iso = isoWeekOfDate(sunday);
  const isoStr = iso.id;
  const href = `https://wol.jw.org/en/wol/meetings/r1/lp-e/${iso.year}/${iso.week}`;
  // sub stays as a plain string so it renders in the row
  // unchanged (Home.jsx renders row.sub directly). i18n
  // translation is added via the new locale keys below.
  const sub = `Sunday Watchtower Study — ${weekOfLabel}`;

  // Resolve the Watchtower publication docid: caller can
  // override (e.g. for tests or unit-of-week-ahead seeding),
  // otherwise look up the static WATCHTOWER_DOCIDS map.
  // Returns null when the week isn't seeded — the row's
  // sub-action button stays hidden in that case and the
  // parent href remains the WOL meetings index fallback.
  const resolvedDocid = docid != null ? docid : getSundayWatchtowerDocid(isoStr);

  return {
    title: t('habit.sundayWatchtower', 'Sunday Watchtower Study'),
    sub,
    href,
    weekOf: weekOfLabel,
    studyWeek: isoStr,
    // Resolved WOL docid for this ISO week. Null when the
    // week isn't seeded — Home.jsx hides the sub-action and
    // keeps the parent href as the only link.
    docid: resolvedDocid,
    // Pre-computed URLs so Home.jsx can wire them into a
    // sub-action button without re-running URL math.
    jwlibraryUrl: resolvedDocid == null ? null : jwlibraryPublicationUrl(resolvedDocid, 'E'),
    finderUrl: resolvedDocid == null ? null : getPublicationFinderUrl(resolvedDocid, 'E'),
  };
}

/**
 * Get the Memorial of Christ's Death date for a given year.
 *
 * Jehovah's Witnesses observe the Memorial on the evening of
 * Nisan 14 in the Hebrew calendar. The exact date varies each
 * year because the Hebrew calendar is lunisolar (new moon +
 * leap months). The dates below are the published dates from
 * jw.org's /en/jehovahs-witnesses/memorial/ page. The page
 * only lists the next few years; for years beyond the table,
 * the function falls back to `null` and the caller should
 * link to the year-agnostic Memorial landing page (which
 * always shows the current year's date prominently).
 *
 * The hardcoded table is intentionally small (the app's
 * lifetime is ~3 years, and the data only matters in
 * March/April of each year). For 2030+ the helper returns
 * null and the row displays "Memorial — see jw.org" with
 * the year-agnostic URL.
 *
 * @param {number} year - The calendar year (e.g. 2026)
 * @returns {{ date: Date, weekOf: string } | null}
 *   - `date`: The Memorial date (Nisan 14) as a JS Date
 *   - `weekOf`: Human-readable string ("Thursday, April 2, 2026")
 *   - `null` if the year is not in the table
 */
export function getMemorialDate(year) {
  // Published Memorial dates from
  // https://www.jw.org/en/jehovahs-witnesses/memorial/
  // (verified 2026-06-17). The table is updated by the
  // organization each year.
  const TABLE = {
    2024: { month: 2, day: 24 }, // March 24, 2024
    2025: { month: 3, day: 12 }, // April 12, 2025
    2026: { month: 3, day: 2 }, // April 2, 2026
    2027: { month: 2, day: 22 }, // March 22, 2027
    2028: { month: 3, day: 9 }, // April 9, 2028
    2029: { month: 2, day: 29 }, // March 29, 2029
  };
  const entry = TABLE[year];
  if (!entry) return null;
  const date = new Date(year, entry.month, entry.day);
  // Map our i18n keys to BCP-47 locale codes for the date
  // formatter. Same mapping as getThisWeekMeetingUrl.
  const localeMap = { en: 'en-US', es: 'es-ES', fr: 'fr-FR' };
  const activeLang = (typeof window !== 'undefined' && window.__jw_lang) || 'en';
  const fmtLocale = localeMap[activeLang] || 'en-US';
  return {
    date,
    weekOf: date.toLocaleString(fmtLocale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  };
}

/**
 * Build the Memorial row for the home. Returns null if the
 * date is more than 30 days away (the row should be hidden).
 * Otherwise returns the row data: title, sub-text, href, icon,
 * color.
 *
 * The row is "ToS compliant" because the only display is the
 * *date* of the Memorial (a calendar fact, not content from
 * jw.org publications) and a link to the jw.org page. No
 * verse text, no program outline, no song numbers.
 *
 * For unknown years (2030+), the row still shows but the
 * sub-text reads "See jw.org for the date" — the Memorial
 * landing page always shows the current year's date.
 *
 * @param {Date} today - The current date (defaults to now)
 * @param {number} year - The year to look up (defaults to today.getFullYear)
 * @returns {{ title: string, sub: string, href: string, visible: boolean } | null}
 *   - `visible: false` if the Memorial is more than 30 days away
 *   - `null` if `today` is invalid
 */
export function getMemorialRow(today = new Date(), year = today.getFullYear(), t = (k) => k) {
  if (isNaN(today.getTime())) return null;
  const memorial = getMemorialDate(year, t);

  // Compute days from today to the Memorial. For unknown
  // years, the Memorial date is unknown; we still link to
  // the year-agnostic landing page but skip the row when
  // we're not in March/April (the rough window the
  // Memorial falls in).
  let daysToMemorial;
  if (memorial) {
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    daysToMemorial = Math.round(
      (memorial.date.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)
    );
  } else {
    // Unknown year: assume the Memorial is in March or April
    // and show the row only in those months. Without the
    // exact date, the user can find it on jw.org.
    if (today.getMonth() !== 2 && today.getMonth() !== 3) return null;
    daysToMemorial = 0; // pretend it's today (the row still shows)
  }

  // Visibility window: 30 days before to 14 days after.
  // The Memorial is usually just a single evening meeting,
  // so the "before" window is the most useful time to show
  // the row. After the Memorial, hide the row immediately.
  const visible = daysToMemorial >= 0 && daysToMemorial <= 30;

  if (!visible) return null;

  const sub = memorial ? memorial.weekOf : t('habit.memorialSeeDate');

  return {
    title: t('habit.memorial'),
    sub,
    href: 'https://www.jw.org/en/jehovahs-witnesses/memorial/',
    // Number of days from `today` to the Memorial date.
    // 0 = today, 1 = tomorrow, 30 = 30 days away. Null when
    // the year is unknown (the user can find the date on
    // jw.org). Used by Home to render a "X days away" chip
    // and a "Share invite" button.
    daysToMemorial: memorial ? daysToMemorial : null,
    // Localized share text. Pre-filled with the date + jw.org
    // Memorial URL so the user can tap "Share invite" and
    // hand the message to a contact via the system share
    // sheet. Date is plain English so it works in any locale;
    // the link takes the recipient to jw.org for a properly
    // localized landing.
    shareText: memorial
      ? `Join us for the Memorial of Christ's Death on ${memorial.weekOf}. Learn more: https://www.jw.org/en/jehovahs-witnesses/memorial/`
      : `Join us for the Memorial of Christ's Death. Find the date near you: https://www.jw.org/en/jehovahs-witnesses/memorial/`,
    visible,
  };
}

/**
 * Get the "Today" row for the home — a contextual row that
 * adapts to the day of the week. The row tells the user what's
 * the most relevant JW thing right now:
 *
 * Default schedule (matches jw.org globally):
 *   Sun (0): "Today — Public Meeting"      (weekend meeting)
 *   Mon (1): "Today — Midweek Meeting Prep"  (3 days to meeting)
 *   Tue (2): "Tonight — Midweek Meeting"    (meeting day!)
 *   Wed (3): "Today — Midweek Meeting Prep"
 *   Thu (4): "Today — Midweek Meeting Prep"
 *   Fri (5): "Today — Midweek Meeting Prep"
 *   Sat (6): "Today — Field Service"        (Saturday ministry)
 *
 * The caller can override the meeting days via the
 * `settings.midweekDay` and `settings.weekendDay` fields
 * (from the user settings store) so the row reflects
 * individual congregation schedules. Sat is always
 * "Field Service" — that's cultural, not configurable.
 *
 * The href for the meeting-related days points at this
 * week's MWB schedule (already computed by
 * getThisWeekMeetingUrl). Saturday's href points at the
 * meetings landing page on jw.org, which has the meeting
 * finder (the user can locate their local congregation
 * and field service group).
 *
 * All hrefs are public jw.org pages that return 200 (verified
 * 2026-06-17). No content from jw.org is displayed — only
 * the title and sub-text describe what kind of day it is.
 *
 * @param {Date} today - The current date (defaults to now)
 * @param {{ midweekDay?: number, weekendDay?: number }} [settings]
 *   User settings. midweekDay = 0..6 (default 2 = Tuesday).
 *   weekendDay = 0..6 (default 0 = Sunday). Falls back to
 *   defaults if missing or out of range.
 * @returns {{ title: string, sub: string, href: string, key: string } | null}
 *   - `null` if `today` is invalid
 *   - The caller renders this as the first habit row, above
 *     the 5 weekly rows. The checkbox tracks per-day
 *     completion (key 'today').
 */
export function getTodayRow(today = new Date(), settings = {}, t = (k) => k) {
  if (isNaN(today.getTime())) return null;
  const thisWeek = getThisWeekMeetingUrl(today, t);
  const meetingHref = thisWeek.url;
  // Coerce settings into the documented range; fall back
  // to defaults on any malformed input.
  const clampDay = (n, fallback) => (Number.isInteger(n) && n >= 0 && n <= 6 ? n : fallback);
  const midweekDay = clampDay(settings.midweekDay, 2); // default Tuesday
  const weekendDay = clampDay(settings.weekendDay, 0); // default Sunday

  const dow = today.getDay(); // 0=Sun..6=Sat

  // Saturday (6) — fixed Field Service copy regardless of
  // settings. Saturday is culturally the field-service day
  // for JWs, not configurable.
  if (dow === 6) {
    return {
      key: 'today',
      title: t('habit.today'),
      sub: t('habit.subFieldService'),
      // jw.org landing page that lists meeting/field
      // service finders. Verified 200 (2026-06-17).
      href: 'https://www.jw.org/en/jehovahs-witnesses/meetings/',
    };
  }

  // Weekend meeting day (default Sunday) — "Today — Public Meeting"
  if (dow === weekendDay) {
    return {
      key: 'today',
      title: t('habit.today'),
      sub: t('habit.subPublicMeeting'),
      href: meetingHref,
    };
  }

  // Midweek meeting day (default Tuesday) — "Tonight — Midweek Meeting"
  if (dow === midweekDay) {
    return {
      key: 'today',
      title: t('habit.tonight'),
      sub: t('habit.subMidweekMeeting'),
      href: meetingHref,
    };
  }

  // Otherwise (Mon, Wed, Thu, Fri) — "Today — Midweek Meeting Prep"
  // These are the days of the week surrounding the midweek
  // meeting; the user is either preparing for this week's
  // meeting (Mon) or reviewing for next week's (Wed-Fri).
  // All point at this week's MWB schedule.
  return {
    key: 'today',
    title: t('habit.today'),
    sub: t('habit.subMidweekMeetingPrep'),
    href: meetingHref,
  };
}
