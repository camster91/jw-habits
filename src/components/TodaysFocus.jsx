import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, ArrowRight, BookOpen, Heart, Users } from 'lucide-react';
import useProgressStore from '../stores/progressStore.js';
import { format, getDay } from 'date-fns';

/**
 * Today'sFocus — a single, opinionated card that highlights the ONE thing
 * the user should do next. Apple-style: muted JW blue gradient, no pill button,
 * text-link CTA with chevron.
 *
 * Priority order:
 *   1. Daily text not read today (most important spiritual habit)
 *   2. Family worship not done this week
 *   3. Prayers not done today
 *   4. Default encouragement (when everything is done)
 */
export default function TodaysFocus() {
  const { t } = useTranslation();
  const dailyTexts = useProgressStore((s) => s.dailyTexts);
  const prayers = useProgressStore((s) => s.prayers);
  const familyWorship = useProgressStore((s) => s.familyWorship);

  const focus = useMemo(() => {
    const today = new Date();
    const todayKey = format(today, 'yyyy-MM-dd');
    const dayOfWeek = getDay(today); // 0=Sun, 1=Mon, ..., 6=Sat
    const hour = today.getHours();

    // 1. Daily text (highest priority — the most foundational habit)
    if (!dailyTexts[todayKey]?.readScripture && hour < 22) {
      return {
        id: 'daily-text',
        title: t('focus.dailyTextTitle', "Read today's daily text"),
        body: t('focus.dailyTextBody', hour < 12
          ? 'A great way to start your day — takes 3 minutes.'
          : 'Take 3 minutes to read today\'s scripture.'),
        action: { label: t('focus.openDailyText', 'Read now'), href: 'https://www.jw.org/en/library/brochures/Examining-the-Scriptures-Daily-2026/' },
      };
    }

    // 2. Family worship — check if this week is done
    const weekKey = format(today, "yyyy-'W'II");
    if (dayOfWeek >= 0 && !familyWorship[weekKey]?.completed) {
      return {
        id: 'family-worship',
        title: t('focus.familyWorshipTitle', "Plan this week's family worship"),
        body: t('focus.familyWorshipBody', "Pick a topic and 15 minutes. We'll track it for you."),
        action: { label: t('focus.planIt', 'Plan it'), href: '/?focus=family' },
      };
    }

    // 3. Prayers — check if all 3 done today
    const todayPrayers = prayers[todayKey] || { morning: false, afternoon: false, evening: false };
    const doneCount = [todayPrayers.morning, todayPrayers.afternoon, todayPrayers.evening].filter(Boolean).length;
    if (doneCount < 3) {
      const missing = [];
      if (hour >= 6 && !todayPrayers.morning) missing.push(t('focus.morning', 'morning'));
      if (hour >= 12 && !todayPrayers.afternoon) missing.push(t('focus.afternoon', 'afternoon'));
      if (hour >= 18 && !todayPrayers.evening) missing.push(t('focus.evening', 'evening'));
      if (missing.length > 0) {
        return {
          id: 'prayer',
          title: t('focus.prayerTitle', `Say your ${missing[0]} prayer`),
          body: t('focus.prayerBody', `${doneCount}/3 prayers today. One minute of conversation with Jehovah.`),
        };
      }
    }

    // 4. Default — everything is done
    return {
      id: 'all-done',
      title: t('focus.allDoneTitle', "You're all caught up"),
      body: t('focus.allDoneBody', 'Daily text done, prayers said, family worship planned. Come back tomorrow.'),
    };
  }, [t, dailyTexts, prayers, familyWorship]);

  return (
    <div className="ios-focus-card animate-fade-in-up">
      <div className="label">Today</div>
      <div className="title">{focus.title}</div>
      <div className="body">{focus.body}</div>
      {focus.action && (
        <a
          href={focus.action.href}
          target={focus.action.href.startsWith('http') ? '_blank' : undefined}
          rel={focus.action.href.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="cta"
        >
          {focus.action.label}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </a>
      )}
    </div>
  );
}
