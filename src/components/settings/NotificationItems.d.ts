import type { LucideIcon } from 'lucide-react';
export interface NotificationItemProps {
    icon: LucideIcon;
    label: string;
    description?: string;
    enabled: boolean;
    time?: string;
    onToggle: () => void;
    onTimeChange: (time: string) => void;
    color?: string;
}
export declare function NotificationItem({ icon: Icon, label, description, enabled, time, onToggle, onTimeChange, color }: NotificationItemProps): import("react/jsx-runtime").JSX.Element;
export interface WeeklyNotificationItemProps {
    icon: LucideIcon;
    label: string;
    description: string;
    enabled: boolean;
    time?: string;
    dayOfWeek?: number;
    meetingDays?: number[];
    onToggle: () => void;
    onTimeChange: (time: string) => void;
    onDayChange?: (day: number) => void;
    onMeetingDaysChange?: (days: number[]) => void;
    color?: string;
    isMeetingPrep?: boolean;
}
export declare function WeeklyNotificationItem({ icon: Icon, label, description, enabled, time, dayOfWeek, meetingDays, onToggle, onTimeChange, onDayChange, onMeetingDaysChange, color, isMeetingPrep }: WeeklyNotificationItemProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=NotificationItems.d.ts.map