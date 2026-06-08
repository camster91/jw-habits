import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, ArrowRight, BookOpen, Heart, Users, Calendar } from 'lucide-react';
import useProgressStore from '../stores/progressStore.js';
import { format, getDay } from 'date-fns';

/**
 * Today'sFocus — a single, opinionated card that highlights the ONE thing
 * the user should do next. Replaces the noisy "For you" card stack.
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
        icon: BookOpen,
        color: 'text-accent',
        bg: 'bg-accent/10',
        title: t('focus.dailyTextTitle', 'Read today\'s daily text'),
        body: t('focus.dailyTextBody', hour < 12
          ? 'A great way to start your day — takes 3 minutes.'
          : 'Take 3 minutes to read today\'s scripture.'),
        action: { label: t('focus.openDailyText', 'Read now'), href: 'https://www.jw.org/en/library/brochures/Examining-the-Scriptures-Daily-2026/' },
        primary: true,
      };
    }

    // 2. Family worship — check if this week is done (week starts Monday=1)
    const weekKey = format(today, "yyyy-'W'II");
    if (dayOfWeek >= 0 && !familyWorship[weekKey]?.completed) {
      return {
        id: 'family-worship',
        icon: Users,
        color: 'text-secondary',
        bg: 'bg-secondary/10',
        title: t('focus.familyWorshipTitle', 'Plan this week\'s family worship'),
        body: t('focus.familyWorshipBody', 'Pick a topic and 15 minutes. We\'ll track it for you.'),
        action: { label: t('focus.planIt', 'Plan it'), href: '/?focus=family' },
        primary: false,
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
          icon: Heart,
          color: 'text-error',
          bg: 'bg-error/10',
          title: t('focus.prayerTitle', `Say your ${missing[0]} prayer`),
          body: t('focus.prayerBody', `${doneCount}/3 prayers today. One minute of conversation with Jehovah.`),
          primary: false,
        };
      }
    }

    // 4. Default — everything is done
    return {
      id: 'all-done',
      icon: Sparkles,
      color: 'text-success',
      bg: 'bg-success/10',
      title: t('focus.allDoneTitle', 'You\'re all caught up'),
      body: t('focus.allDoneBody', 'Daily text done, prayers said, family worship planned. Come back tomorrow.'),
      primary: false,
    };
  }, [t, dailyTexts, prayers, familyWorship]);

  const Icon = focus.icon;

  return (
    <section
      className={`rounded-2xl border ${focus.primary ? 'border-accent/30 bg-gradient-to-br from-accent/5 to-transparent' : 'border-base-300/50 bg-base-100'} shadow-sm overflow-hidden animate-fade-in-up`}
    >
      <div className="p-4 flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${focus.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${focus.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-sm text-base-content">{focus.title}</h3>
            {focus.primary && (
              <span className="text-[9px] uppercase tracking-wider font-bold text-accent">Suggested</span>
            )}
          </div>
          <p className="text-xs text-base-content/60 leading-snug">{focus.body}</p>
          {focus.action && (
            <a
              href={focus.action.href}
              target={focus.action.href.startsWith('http') ? '_blank' : undefined}
              rel={focus.action.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold ${focus.color} hover:underline`}
            >
              {focus.action.label}
              <ArrowRight className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
