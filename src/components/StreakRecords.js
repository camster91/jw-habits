import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, TrendingUp, Flame } from 'lucide-react';
import useGamificationStore from '../stores/gamificationStore.js';
import useProgressStore from '../stores/progressStore.js';
import { format } from 'date-fns';
/**
 * StreakRecords — shows the user their personal bests across all habits.
 * No social/sharing — just personal gamification.
 */
export default function StreakRecords() {
    // Read current streaks
    const dailyTexts = useProgressStore((s) => s.dailyTexts);
    const prayers = useProgressStore((s) => s.prayers);
    const bibleReadings = useProgressStore((s) => s.bibleReadings);
    const familyWorship = useProgressStore((s) => s.familyWorship);
    const getFamilyWorshipStreak = useProgressStore((s) => s.getFamilyWorshipStreak);
    // Read historical bests from gamification store
    const longestStreak = useGamificationStore((s) => s.longestStreak) || 0;
    const longestPrayerStreak = useGamificationStore((s) => s.longestPrayerStreak) || 0;
    const longestFamilyWorshipStreak = useGamificationStore((s) => s.longestFamilyWorshipStreak) || 0;
    const records = useMemo(() => {
        const today = new Date();
        // Daily text: current streak
        let dtStreak = 0;
        for (let i = 0; i < 365; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = format(d, 'yyyy-MM-dd');
            if (dailyTexts[key]?.readScripture || dailyTexts[key]?.read)
                dtStreak++;
            else
                break;
        }
        // Prayer streak
        let prStreak = 0;
        for (let i = 0; i < 365; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = format(d, 'yyyy-MM-dd');
            const p = prayers[key];
            if (p?.morning && p?.afternoon && p?.evening)
                prStreak++;
            else
                break;
        }
        // Bible reading streak
        let brStreak = 0;
        for (let i = 0; i < 365; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dayOfYear = String(Math.ceil((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000));
            if (bibleReadings[dayOfYear]?.read || bibleReadings[dayOfYear]?.progress === 100)
                brStreak++;
            else
                break;
        }
        // Historical bests — from store tracking
        const dtAllTimeBest = Math.max(dtStreak, longestStreak);
        const prAllTimeBest = Math.max(prStreak, longestPrayerStreak);
        const fwAllTimeBest = Math.max(getFamilyWorshipStreak(), longestFamilyWorshipStreak);
        return [
            {
                label: 'Daily Text',
                current: dtStreak,
                best: dtAllTimeBest,
                unit: 'day',
                emoji: '📖',
                isCurrentBest: dtStreak >= dtAllTimeBest,
            },
            {
                label: 'Prayer',
                current: prStreak,
                best: prAllTimeBest,
                unit: 'day',
                emoji: '🙏',
                isCurrentBest: prStreak >= prAllTimeBest,
            },
            {
                label: 'Bible Reading',
                current: brStreak,
                best: Math.max(brStreak, 7),
                unit: 'day',
                emoji: '📚',
                isCurrentBest: brStreak >= 7,
            },
            {
                label: 'Family Worship',
                current: getFamilyWorshipStreak(),
                best: fwAllTimeBest,
                unit: 'week',
                emoji: '👨‍👩‍👧',
                isCurrentBest: getFamilyWorshipStreak() >= fwAllTimeBest,
            },
        ];
    }, [dailyTexts, prayers, bibleReadings, longestStreak, longestPrayerStreak, longestFamilyWorshipStreak, getFamilyWorshipStreak]);
    const allCurrentBests = records.every((r) => r.isCurrentBest);
    return (_jsxs("section", { className: "streak-records", children: [allCurrentBests && records.some((r) => r.current > 0) && (_jsxs("div", { className: "streak-banner", children: [_jsx(Trophy, { className: "w-4 h-4 text-warning" }), _jsx("span", { children: "You're at your best right now!" })] })), _jsx("div", { className: "streak-records-grid", children: records.map((r) => (_jsxs("div", { className: `streak-record ${r.isCurrentBest ? 'best' : ''}`, children: [_jsx("span", { className: "streak-record-emoji", children: r.emoji }), _jsxs("div", { className: "streak-record-body", children: [_jsx("span", { className: "streak-record-label", children: r.label }), _jsxs("div", { className: "streak-record-values", children: [_jsxs("div", { className: "streak-record-current flex items-baseline gap-1", children: [_jsx("span", { className: "streak-number text-lg font-bold", children: r.current || 0 }), _jsxs("span", { className: "streak-unit text-xs text-base-content/60", children: [r.unit, r.current !== 1 ? 's' : ''] }), _jsx("span", { className: "streak-tag text-[10px] text-base-content/40 ml-2", children: "current" })] }), _jsxs("div", { className: "streak-record-best flex items-baseline gap-1 mt-0.5", children: [_jsx(Flame, { className: "w-3 h-3 text-warning" }), _jsx("span", { className: "streak-number text-sm font-semibold", children: r.best || 0 }), _jsx("span", { className: "streak-unit text-[10px] text-base-content/40", children: "best" })] })] })] }), r.isCurrentBest && r.current > 0 && (_jsx("div", { className: "streak-record-badge", children: _jsx(TrendingUp, { className: "w-3 h-3" }) }))] }, r.label))) })] }));
}
//# sourceMappingURL=StreakRecords.js.map