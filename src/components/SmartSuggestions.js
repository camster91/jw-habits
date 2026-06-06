import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useProgressStore from '../stores/progressStore.js';
import useGamificationStore from '../stores/gamificationStore.js';
import { format, differenceInDays, subDays, getDay, startOfWeek } from 'date-fns';
// @ts-expect-error - CSS modules aren't typed; the bundler handles this.
import './SmartSuggestions.css';
/**
 * SmartSuggestions — context-aware nudges based on user's recent activity.
 * Heuristic, on-device, no AI call. Privacy-first.
 */
export default function SmartSuggestions() {
    const { t } = useTranslation();
    const [dismissed, setDismissed] = useState(new Set());
    const dailyTexts = useProgressStore((s) => s.dailyTexts);
    const prayers = useProgressStore((s) => s.prayers);
    const bibleReadings = useProgressStore((s) => s.bibleReadings);
    const familyWorship = useProgressStore((s) => s.familyWorship);
    // Load dismissed from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem('jw-smart-suggestions-dismissed');
            if (raw)
                setDismissed(new Set(JSON.parse(raw)));
        }
        catch { /* ignore */ }
    }, []);
    const suggestions = useMemo(() => {
        const result = [];
        const today = new Date();
        const todayKey = format(today, 'yyyy-MM-dd');
        const yesterdayKey = format(subDays(today, 1), 'yyyy-MM-dd');
        // 1. Daily text reminder (morning)
        if (!dailyTexts[todayKey]?.readScripture) {
            const hour = today.getHours();
            if (hour < 22) {
                result.push({
                    id: 'daily-text-today',
                    emoji: '📖',
                    title: 'Read today\'s daily text',
                    body: hour < 12 ? 'A great way to start your day' : 'Take 3 minutes to read today\'s scripture',
                    priority: 10,
                });
            }
        }
        // 2. Missed yesterday's daily text
        if (dailyTexts[yesterdayKey] && !dailyTexts[yesterdayKey]?.readScripture) {
            result.push({
                id: 'daily-text-yesterday',
                emoji: '⏰',
                title: 'Catch up on yesterday\'s daily text',
                body: 'You started it but didn\'t finish. Quick read now.',
                priority: 15,
            });
        }
        // 3. Prayers — see which are done
        const todayPrayers = prayers[todayKey] || { morning: false, afternoon: false, evening: false };
        const hour = today.getHours();
        if (hour >= 6 && hour < 12 && !todayPrayers.morning) {
            result.push({
                id: 'prayer-morning',
                emoji: '🙏',
                title: 'Morning prayer',
                body: 'Start your day with Jehovah. 1 minute.',
                priority: 8,
            });
        }
        else if (hour >= 12 && hour < 18 && !todayPrayers.afternoon) {
            result.push({
                id: 'prayer-afternoon',
                emoji: '🙏',
                title: 'Afternoon prayer',
                body: 'A quick prayer in the middle of the day.',
                priority: 9,
            });
        }
        else if (hour >= 18 && !todayPrayers.evening) {
            result.push({
                id: 'prayer-evening',
                emoji: '🙏',
                title: 'Evening prayer',
                body: 'End your day with thanks and reflection.',
                priority: 8,
            });
        }
        // 4. Bible reading streak warning — close to broken
        let streak = 0;
        for (let i = 0; i < 30; i++) {
            const d = format(subDays(today, i), 'yyyy-MM-dd');
            const dayOfYear = String(Math.ceil((subDays(today, i).getTime() - new Date(subDays(today, i).getFullYear(), 0, 0).getTime()) / 86400000));
            if (bibleReadings[dayOfYear]?.read || bibleReadings[dayOfYear]?.progress === 100) {
                streak++;
            }
            else
                break;
        }
        if (streak > 0 && streak < 30 && !bibleReadings[String(Math.ceil((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000))]?.read) {
            result.push({
                id: 'bible-streak',
                emoji: '🔥',
                title: `${streak}-day Bible reading streak — keep it alive!`,
                body: 'You\'re on a roll. 5 minutes today extends the streak.',
                priority: 5,
                action: { label: 'Open schedule', href: '/study' },
            });
        }
        // 5. Family worship — check if this week is done
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekKey = format(weekStart, "yyyy-'W'II");
        if (!familyWorship[weekKey]?.completed && getDay(today) >= 0) {
            result.push({
                id: 'family-worship-week',
                emoji: '👨‍👩‍👧',
                title: 'Family worship this week',
                body: 'Pick a topic and 15 minutes. We\'ll track it.',
                priority: 20,
                action: { label: 'Plan it', href: '/?focus=family' },
            });
        }
        // 6. Weekend — 5+ day gap in any habit
        const habits = ['dailyText', 'prayer', 'bible'];
        for (const habit of habits) {
            let lastDay = 0;
            for (let i = 0; i < 14; i++) {
                const dKey = format(subDays(today, i), 'yyyy-MM-dd');
                const dOY = String(Math.ceil((subDays(today, i).getTime() - new Date(subDays(today, i).getFullYear(), 0, 0).getTime()) / 86400000));
                let done = false;
                if (habit === 'dailyText')
                    done = !!(dailyTexts[dKey]?.readScripture);
                if (habit === 'prayer') {
                    const p = prayers[dKey];
                    done = !!(p?.morning || p?.afternoon || p?.evening);
                }
                if (habit === 'bible')
                    done = !!(bibleReadings[dOY]?.read);
                if (done) {
                    lastDay = i;
                    break;
                }
            }
            if (lastDay >= 5) {
                const names = {
                    dailyText: 'Daily Text',
                    prayer: 'Prayer',
                    bible: 'Bible reading',
                };
                result.push({
                    id: `gap-${habit}`,
                    emoji: '⏳',
                    title: `${lastDay}-day gap in ${names[habit]}`,
                    body: 'It\'s been a while. Even 2 minutes helps.',
                    priority: 12,
                });
            }
        }
        // 7. New month — monthly goal reset suggestion
        if (today.getDate() === 1) {
            result.push({
                id: 'monthly-goal',
                emoji: '🎯',
                title: 'New month — set a fresh service goal',
                body: 'Pick a realistic number and we\'ll track it for you.',
                priority: 7,
                action: { label: 'Set goal', href: '/service' },
            });
        }
        return result.sort((a, b) => a.priority - b.priority);
    }, [dailyTexts, prayers, bibleReadings, familyWorship]);
    const visible = suggestions.filter((s) => !dismissed.has(s.id)).slice(0, 3);
    const handleDismiss = (id) => {
        setDismissed((prev) => {
            const next = new Set(prev);
            next.add(id);
            try {
                localStorage.setItem('jw-smart-suggestions-dismissed', JSON.stringify([...next]));
            }
            catch { /* ignore */ }
            return next;
        });
    };
    if (visible.length === 0)
        return null;
    return (_jsxs("section", { className: "bg-base-100 border border-base-300/50 rounded-xl p-4 mb-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(Sparkles, { className: "w-4 h-4 text-accent" }), _jsx("h2", { className: "text-sm font-semibold", children: "For you" }), _jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium", children: "on-device" })] }), _jsx("div", { className: "space-y-2", children: visible.map((s) => (_jsxs("div", { className: "flex gap-3 p-2.5 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors group", children: [_jsx("span", { className: "text-lg flex-shrink-0", children: s.emoji }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium leading-snug", children: s.title }), _jsx("p", { className: "text-xs text-base-content/60 leading-snug mt-0.5", children: s.body }), s.action && (_jsxs("a", { href: s.action.href, className: "inline-flex items-center gap-1 mt-1 text-xs font-medium text-primary hover:underline", children: [s.action.label, " ", _jsx(ArrowRight, { className: "w-3 h-3" })] }))] }), _jsx("button", { className: "flex-shrink-0 text-base-content/30 hover:text-base-content/60 p-1 opacity-0 group-hover:opacity-100 transition-opacity", onClick: () => handleDismiss(s.id), "aria-label": "Dismiss", children: _jsx(X, { className: "w-3 h-3" }) })] }, s.id))) })] }));
}
//# sourceMappingURL=SmartSuggestions.js.map