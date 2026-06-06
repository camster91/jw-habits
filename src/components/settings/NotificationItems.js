import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const DAYS_OF_WEEK = [
    { value: 0, label: 'Sun', fullLabel: 'Sunday' },
    { value: 1, label: 'Mon', fullLabel: 'Monday' },
    { value: 2, label: 'Tue', fullLabel: 'Tuesday' },
    { value: 3, label: 'Wed', fullLabel: 'Wednesday' },
    { value: 4, label: 'Thu', fullLabel: 'Thursday' },
    { value: 5, label: 'Fri', fullLabel: 'Friday' },
    { value: 6, label: 'Sat', fullLabel: 'Saturday' },
];
export function NotificationItem({ icon: Icon, label, description = '', enabled, time, onToggle, onTimeChange, color = 'text-primary' }) {
    return (_jsxs("div", { className: "flex items-center justify-between py-3.5 border-b border-base-200/50 last:border-0", children: [_jsxs("div", { className: "flex items-center gap-3 flex-1 min-w-0", children: [_jsx("div", { className: `p-2.5 rounded-xl bg-base-100 shadow-sm ${color}`, children: _jsx(Icon, { className: "w-5 h-5" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-semibold text-sm", children: label }), _jsx("p", { className: "text-xs text-base-content/50", children: description })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [time !== undefined && enabled && (_jsx("input", { type: "time", className: "input input-sm input-bordered w-28 text-center font-medium", value: time, onChange: (e) => onTimeChange(e.target.value) })), _jsx("input", { type: "checkbox", className: "toggle toggle-primary", checked: enabled, onChange: onToggle })] })] }));
}
export function WeeklyNotificationItem({ icon: Icon, label, description, enabled, time, dayOfWeek, meetingDays, onToggle, onTimeChange, onDayChange, onMeetingDaysChange, color = 'text-primary', isMeetingPrep = false }) {
    return (_jsxs("div", { className: "py-3.5 border-b border-base-200/50 last:border-0", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3 flex-1 min-w-0", children: [_jsx("div", { className: `p-2.5 rounded-xl bg-base-100 shadow-sm ${color}`, children: _jsx(Icon, { className: "w-5 h-5" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-semibold text-sm", children: label }), _jsx("p", { className: "text-xs text-base-content/50", children: description })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [time !== undefined && enabled && (_jsx("input", { type: "time", className: "input input-sm input-bordered w-28 text-center font-medium", value: time, onChange: (e) => onTimeChange(e.target.value) })), _jsx("input", { type: "checkbox", className: "toggle toggle-primary", checked: enabled, onChange: onToggle })] })] }), enabled && (_jsx("div", { className: "mt-3 ml-14 p-3 bg-base-100 rounded-xl", children: isMeetingPrep ? (_jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-base-content/60 mb-2", children: "Remind day before:" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: DAYS_OF_WEEK.map((day) => (_jsx("button", { onClick: () => {
                                    const currentDays = meetingDays || [];
                                    const newDays = currentDays.includes(day.value)
                                        ? currentDays.filter(d => d !== day.value)
                                        : [...currentDays, day.value].sort((a, b) => a - b);
                                    if (onMeetingDaysChange)
                                        onMeetingDaysChange(newDays);
                                }, className: `btn btn-sm min-w-[44px] ${(meetingDays || []).includes(day.value)
                                    ? 'btn-primary'
                                    : 'btn-ghost bg-base-200'}`, children: day.label }, day.value))) })] })) : (_jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-base-content/60 mb-2", children: "Remind every:" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: DAYS_OF_WEEK.map((day) => (_jsx("button", { onClick: () => onDayChange && onDayChange(day.value), className: `btn btn-sm min-w-[44px] ${dayOfWeek === day.value
                                    ? 'btn-primary'
                                    : 'btn-ghost bg-base-200'}`, children: day.label }, day.value))) })] })) }))] }));
}
//# sourceMappingURL=NotificationItems.js.map