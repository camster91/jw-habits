import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { BookOpen, CheckCircle2, Flame, PenLine, Save, BookHeart, Globe, ExternalLink, Newspaper } from 'lucide-react';
import useProgressStore from '../stores/progressStore.js';
import useNewsStore from '../stores/newsStore.js';
import useMemoriesStore from '../stores/memoriesStore.js';
import useGamificationStore from '../stores/gamificationStore.js';
import { getDailyTextLink } from '../utils/jwLibraryLinks.js';
import { haptics } from '../utils/native.js';
import NewsfeedItems from './NewsfeedItems.jsx';
function DailyTasksSection() {
    const { t } = useTranslation();
    const today = format(new Date(), 'yyyy-MM-dd');
    const [showNotes, setShowNotes] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [noteSaved, setNoteSaved] = useState(false);
    const { getDailyTextProgress, updateDailyTextProgress, } = useProgressStore();
    const dailyTextProgress = getDailyTextProgress(today);
    const dailyTextLink = getDailyTextLink(new Date());
    const { getHasCheckedToday, checkToday, getStreak } = useNewsStore();
    const hasCheckedToday = getHasCheckedToday();
    const dailyCheckStreak = getStreak();
    const { saveReflection, getReflection } = useMemoriesStore();
    const { recordDailyTextCompletion, recordReflection, recordNewsRead } = useGamificationStore();
    const existingReflection = getReflection(today);
    useEffect(() => {
        if (existingReflection && !noteText) {
            setNoteSaved(true);
        }
    }, [existingReflection, noteText]);
    const JW_WHATS_NEW = 'https://www.jw.org/en/whats-new/';
    const handleDailyCheck = () => {
        haptics.light();
        if (!hasCheckedToday) {
            checkToday();
            recordNewsRead();
        }
        window.open(JW_WHATS_NEW, '_blank', 'noopener,noreferrer');
    };
    const handleOpenJW = () => {
        haptics.light();
        window.open(dailyTextLink, '_blank', 'noopener,noreferrer');
    };
    const handleDailyTextCheck = () => {
        haptics.light();
        const newValue = !dailyTextProgress.readScripture;
        updateDailyTextProgress(today, 'readScripture', newValue);
        if (newValue) {
            setTimeout(() => {
                haptics.success();
                recordDailyTextCompletion();
            }, 100);
        }
    };
    const handleSaveNote = () => {
        if (noteText.trim()) {
            haptics.success();
            saveReflection(today, noteText.trim());
            setNoteSaved(true);
            if (!existingReflection) {
                recordReflection();
            }
        }
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "card bg-base-100 shadow-md", children: _jsxs("div", { className: "card-body p-4", children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx(BookOpen, { className: "w-5 h-5 text-primary" }), _jsx("h3", { className: "font-semibold text-lg", children: t('today.dailyText') })] }), _jsxs("button", { onClick: handleDailyTextCheck, className: `w-full p-4 rounded-xl flex items-center justify-between transition-all active:scale-[0.98] ${dailyTextProgress.readScripture
                                ? 'bg-success/10 text-success'
                                : 'bg-base-200 hover:bg-base-300'}`, children: [_jsx("span", { className: `font-medium ${dailyTextProgress.readScripture ? 'text-success' : ''}`, children: t('today.readText') }), dailyTextProgress.readScripture ? _jsx(CheckCircle2, { className: "w-6 h-6 text-success" }) : _jsx("div", { className: "w-6 h-6 rounded-full border-2 border-base-content/30" })] }), _jsxs("button", { onClick: handleOpenJW, className: "btn btn-outline btn-sm mt-2 w-full gap-2", children: [_jsx(Globe, { className: "w-4 h-4" }), " ", t('today.openOnJw')] })] }) }), _jsx("div", { className: "card bg-base-100 shadow-md", children: _jsxs("div", { className: "card-body p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Flame, { className: "w-5 h-5 text-warning" }), _jsx("h3", { className: "font-semibold text-lg", children: t('today.checkIn') })] }), dailyCheckStreak > 0 && (_jsxs("div", { className: "flex items-center gap-1 text-sm font-bold text-warning", children: [_jsx(Flame, { className: "w-4 h-4" }), " ", dailyCheckStreak, " ", dailyCheckStreak === 1 ? t('stats.day') : t('stats.days'), " streak"] }))] }), _jsx("p", { className: "text-sm text-base-content/60 mb-3", children: hasCheckedToday
                                ? t('today.checkedInToday')
                                : t('today.checkInDesc') }), _jsxs("button", { onClick: handleDailyCheck, className: `btn w-full gap-2 ${hasCheckedToday ? 'btn-outline btn-sm' : 'btn-primary'}`, children: [_jsx(ExternalLink, { className: "w-4 h-4" }), hasCheckedToday ? t('today.whatsNew') : t('today.checkInNow')] }), _jsx(NewsfeedItems, {})] }) }), _jsx("div", { className: "card bg-base-100 shadow-md", children: _jsxs("div", { className: "card-body p-4", children: [_jsxs("button", { onClick: () => setShowNotes(!showNotes), className: "flex items-center gap-3 w-full", children: [_jsx(BookHeart, { className: "w-5 h-5 text-accent" }), _jsx("h3", { className: "font-semibold text-lg flex-1 text-left", children: t('today.reflection') }), _jsx("span", { className: "text-xs text-base-content/50", children: showNotes ? t('today.hide') : noteSaved ? t('today.saved') : t('today.reflectionOptional') })] }), showNotes && (_jsxs("div", { className: "mt-3 space-y-2", children: [_jsx("textarea", { value: noteText, onChange: (e) => {
                                        setNoteText(e.target.value);
                                        setNoteSaved(false);
                                    }, className: "textarea textarea-bordered w-full", placeholder: t('today.reflectionPlaceholder'), rows: 3 }), _jsxs("button", { onClick: handleSaveNote, className: `btn btn-sm w-full ${noteSaved ? 'btn-success' : 'btn-primary'}`, children: [_jsx(Save, { className: "w-4 h-4" }), " ", noteSaved ? t('today.saved') : t('today.save')] })] }))] }) })] }));
}
export default DailyTasksSection;
//# sourceMappingURL=DailyTasksSection.js.map