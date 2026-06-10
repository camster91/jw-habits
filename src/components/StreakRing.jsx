import { Flame } from 'lucide-react';

/**
 * SVG circular progress ring showing current streak with animated fill.
 *
 * @param {number}   current     — Current streak count
 * @param {number}   longest     — Longest streak (for context)
 * @param {number}   [size=80]   — SVG width/height in px
 * @param {number}   [stroke=6]  — Ring stroke width
 * @param {string}   [color]     — Tailwind stroke color class (default: text-primary)
 * @param {string}   [bgColor]   — Tailwind track color class (default: text-base-300)
 */
export default function StreakRing({
  current = 0,
  longest = 0,
  size = 80,
  stroke = 6,
  color = 'text-primary',
  bgColor = 'text-base-300',
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const maxTarget = Math.max(longest, 7); // goal is at least 7, or beat your record
  const progress = Math.min(current / maxTarget, 1);
  const offset = circumference - progress * circumference;

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={maxTarget}
        aria-label={`${current} day streak`}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className={bgColor}
          opacity={0.3}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${color} transition-all duration-700 ease-out`}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex items-baseline gap-0.5">
          <span className="text-2xl font-black text-base-content">{current}</span>
          <span className="text-xs font-medium text-base-content/70">days</span>
        </div>
        <Flame className={`w-3.5 h-3.5 mt-0.5 ${current > 0 ? 'text-orange-500' : 'text-base-content/20'}`} />
      </div>
    </div>
  );
}
