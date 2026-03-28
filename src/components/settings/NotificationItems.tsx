import React from 'react';
import type { LucideIcon } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun', fullLabel: 'Sunday' },
  { value: 1, label: 'Mon', fullLabel: 'Monday' },
  { value: 2, label: 'Tue', fullLabel: 'Tuesday' },
  { value: 3, label: 'Wed', fullLabel: 'Wednesday' },
  { value: 4, label: 'Thu', fullLabel: 'Thursday' },
  { value: 5, label: 'Fri', fullLabel: 'Friday' },
  { value: 6, label: 'Sat', fullLabel: 'Saturday' },
];

export interface NotificationItemProps {
  icon: LucideIcon;
  label: string;
  description: string;
  enabled: boolean;
  time?: string;
  onToggle: () => void;
  onTimeChange: (time: string) => void;
  color?: string;
}

export function NotificationItem({ icon: Icon, label, description, enabled, time, onToggle, onTimeChange, color = 'text-primary' }: NotificationItemProps) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-base-200/50 last:border-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`p-2.5 rounded-xl bg-base-100 shadow-sm ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{label}</p>
          <p className="text-xs text-base-content/50">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {time !== undefined && enabled && (
          <input
            type="time"
            className="input input-sm input-bordered w-28 text-center font-medium"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
          />
        )}
        <input
          type="checkbox"
          className="toggle toggle-primary"
          checked={enabled}
          onChange={onToggle}
        />
      </div>
    </div>
  );
}

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

export function WeeklyNotificationItem({
  icon: Icon,
  label,
  description,
  enabled,
  time,
  dayOfWeek,
  meetingDays,
  onToggle,
  onTimeChange,
  onDayChange,
  onMeetingDaysChange,
  color = 'text-primary',
  isMeetingPrep = false
}: WeeklyNotificationItemProps) {
  return (
    <div className="py-3.5 border-b border-base-200/50 last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2.5 rounded-xl bg-base-100 shadow-sm ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-xs text-base-content/50">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {time !== undefined && enabled && (
            <input
              type="time"
              className="input input-sm input-bordered w-28 text-center font-medium"
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
            />
          )}
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={enabled}
            onChange={onToggle}
          />
        </div>
      </div>

      {enabled && (
        <div className="mt-3 ml-14 p-3 bg-base-100 rounded-xl">
          {isMeetingPrep ? (
            <div>
              <p className="text-xs font-medium text-base-content/60 mb-2">Remind day before:</p>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => {
                      const currentDays = meetingDays || [];
                      const newDays = currentDays.includes(day.value)
                        ? currentDays.filter(d => d !== day.value)
                        : [...currentDays, day.value].sort((a, b) => a - b);
                      if (onMeetingDaysChange) onMeetingDaysChange(newDays);
                    }}
                    className={`btn btn-sm min-w-[44px] ${
                      (meetingDays || []).includes(day.value)
                        ? 'btn-primary'
                        : 'btn-ghost bg-base-200'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium text-base-content/60 mb-2">Remind every:</p>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => onDayChange && onDayChange(day.value)}
                    className={`btn btn-sm min-w-[44px] ${
                      dayOfWeek === day.value
                        ? 'btn-primary'
                        : 'btn-ghost bg-base-200'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
