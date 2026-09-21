/**
 * Week + day context for the habit rows.
 *
 * Two small, neutral helpers that the home page needs. Neither knows
 * anything about any organisation, and neither builds a URL — every
 * row's destination comes from the user's own link slots.
 *
 * This replaces the previous jwLibraryLinks.* module family, which
 * generated organisation deep links and publication URLs. That surface
 * was removed as part of making this a general habit tracker.
 */

/**
 * The Monday-Sunday range containing `date`, in LOCAL time, plus the two
 * boundary dates.
 *
 * @param {Date} [date]
 * @returns {{ weekOf: string, weekStart: Date, weekEnd: Date }}
 */
export function getThisWeekMeetingUrl(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay(); // 0..6
  const offsetToMonday = (dow + 6) % 7; // 0 for Mon, 6 for Sun
  d.setDate(d.getDate() - offsetToMonday);
  const weekStart = new Date(d.getTime());
  const weekEnd = new Date(d.getTime());
  weekEnd.setDate(weekEnd.getDate() + 6);

  // Map our i18n language keys (en/es/fr) to BCP-47 locale codes.
  const localeMap = { en: 'en-US', es: 'es-ES', fr: 'fr-FR' };
  const activeLang =
    (typeof window !== 'undefined' && (window.__app_lang || window.__jw_lang)) || 'en';
  const fmtLocale = localeMap[activeLang] || 'en-US';
  const fmtMonth = (dt) => dt.toLocaleString(fmtLocale, { month: 'long' });

  const startYear = weekStart.getFullYear();
  const endYear = weekEnd.getFullYear();
  const crossMonth = weekStart.getMonth() !== weekEnd.getMonth();

  let weekOf;
  if (startYear !== endYear) {
    weekOf = `${fmtMonth(weekStart)} ${weekStart.getDate()}, ${startYear} – ${fmtMonth(weekEnd)} ${weekEnd.getDate()}, ${endYear}`;
  } else if (crossMonth) {
    weekOf = `${fmtMonth(weekStart)} ${weekStart.getDate()} – ${fmtMonth(weekEnd)} ${weekEnd.getDate()}, ${startYear}`;
  } else {
    weekOf = `${fmtMonth(weekStart)} ${weekStart.getDate()}–${weekEnd.getDate()}, ${startYear}`;
  }

  return { weekOf, weekStart, weekEnd };
}

/**
 * A neutral label for the day of the week, chosen from the user's own
 * meeting-day settings. Carries no destination.
 *
 * @param {Date} [today]
 * @param {{ midweekDay?: number, weekendDay?: number }} [settings]
 * @param {(key: string) => string} [t]
 * @returns {{ key: string, title: string, sub: string } | null}
 */
export function getTodayRow(today = new Date(), settings = {}, t = (k) => k) {
  if (isNaN(today.getTime())) return null;
  const clampDay = (n, fallback) => (Number.isInteger(n) && n >= 0 && n <= 6 ? n : fallback);
  const midweekDay = clampDay(settings.midweekDay, 2); // default Tuesday
  const weekendDay = clampDay(settings.weekendDay, 0); // default Sunday

  const dow = today.getDay(); // 0=Sun..6=Sat

  if (dow === weekendDay) {
    return {
      key: 'today',
      title: t('habit.today'),
      sub: t('habit.subPublicMeeting'),
    };
  }

  if (dow === midweekDay) {
    return {
      key: 'today',
      title: t('habit.tonight'),
      sub: t('habit.subMidweekMeeting'),
    };
  }

  if (dow === 6) {
    return {
      key: 'today',
      title: t('habit.today'),
      sub: t('habit.subFieldService'),
    };
  }

  return {
    key: 'today',
    title: t('habit.today'),
    sub: t('habit.subMidweekMeetingPrep'),
  };
}
