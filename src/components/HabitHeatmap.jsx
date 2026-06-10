import { useMemo } from 'react';
import { format } from 'date-fns';
import useProgressStore from '../stores/progressStore';

/**
 * HabitHeatmap — GitHub-style yearly heatmap of habit completion.
 * Each cell is a day. Intensity = number of habits completed that day.
 */
export default function HabitHeatmap({ weeks = 26, className = '' }) {
  const dailyTexts = useProgressStore((s) => s.dailyTexts);
  const prayers = useProgressStore((s) => s.prayers);
  const bibleReadings = useProgressStore((s) => s.bibleReadings);

  const data = useMemo(() => {
    const dt = dailyTexts || {};
    const pr = prayers || {};
    const br = bibleReadings || {};
    const result = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Walk back N weeks
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay() - (weeks - 1) * 7);

    // Stop at the last day of the previous month (skip current month)
    const lastOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const cursor = new Date(start);
    while (cursor <= lastOfPrevMonth) {
      const key = format(cursor, 'yyyy-MM-dd');
      const dayOfYear = String(Math.ceil((cursor - new Date(cursor.getFullYear(), 0, 0)) / 86400000));
      let count = 0;

      // Daily text
      if (dt[key]?.readScripture || dt[key]?.read) count += 1;
      // Prayers (any done)
      const p = pr[key];
      if (p?.morning || p?.afternoon || p?.evening) count += 1;
      // All 3 prayers
      if (p?.morning && p?.afternoon && p?.evening) count += 1;
      // Bible reading
      if (br[dayOfYear]?.read || br[dayOfYear]?.progress === 100) count += 1;
      // Family worship (check by week)
      // Week-based — skip, harder to attribute to single day

      result[key] = count;
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [dailyTexts, prayers, bibleReadings, weeks]);

  // Group into weeks (columns)
  const grid = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Walk back full weeks from today to find the Sunday start of the range
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay() - (weeks - 1) * 7);

    // Stop at the last day of the previous month (skip current month)
    const lastOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const cols = [];
    for (let w = 0; w < weeks; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(start);
        day.setDate(day.getDate() + w * 7 + d);
        // Skip any day beyond the previous month's last day
        if (day > lastOfPrevMonth) break;
        const key = format(day, 'yyyy-MM-dd');
        col.push({ date: key, count: data[key] || 0 });
      }
      cols.push(col);
    }
    return cols;
  }, [data, weeks]);

  const intensity = (count) => {
    if (count === 0) return '';
    if (count === 1) return 'l1';
    if (count === 2) return 'l2';
    if (count === 3) return 'l3';
    return 'l4';
  };

  // Month labels
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    grid.forEach((col, i) => {
      if (!col || col.length === 0) return; // guard against empty columns
      const d = new Date(col[0].date);
      if (d.getMonth() !== lastMonth) {
        lastMonth = d.getMonth();
        labels.push({ week: i, label: d.toLocaleDateString('en-US', { month: 'short' }) });
      }
    });
    return labels;
  }, [grid]);

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div className="inline-block min-w-full">
        {/* Month labels */}
        <div className="flex gap-[2px] ml-6 mb-1">
          {monthLabels.map(({ week, label }) => (
            <div key={`${week}-${label}`} className="text-[10px] text-base-content/70 font-medium" style={{ minWidth: '13px' }}>
              {label}
            </div>
          ))}
        </div>

        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-[2px] text-[10px] text-base-content/70 justify-around mr-1 w-5">
            <span>M</span>
            <span>W</span>
            <span>F</span>
          </div>

          <div className="flex gap-[2px]">
            {grid.map((col, i) => (
              <div key={i} className="flex flex-col gap-[2px]">
                {col.map((cell) => (
                  <div
                    key={cell.date}
                    title={`${cell.date} — ${cell.count} habit${cell.count === 1 ? '' : 's'}`}
                    className={`day ${intensity(cell.count)}`}
                    aria-label={`${cell.date} ${cell.count}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1 mt-2 text-[10px] text-base-content/70">
          <span>Less</span>
          <div className="day" style={{ background: 'rgba(84, 84, 88, 0.6)' }}></div>
          <div className="day l1"></div>
          <div className="day l2"></div>
          <div className="day l3"></div>
          <div className="day l4"></div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
