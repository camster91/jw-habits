import { useTranslation } from 'react-i18next';

/** Original illustration: growth pauses on quiet days; badges add blooms. */
export default function Garden({ stage = 0, level = 0, badges = 0, small = false }) {
  const { t } = useTranslation();
  const height = 18 + stage * 12;
  return (
    <svg
      viewBox="0 0 240 160"
      role="img"
      aria-label={t(`fd.fun.gardenStages.${stage}`)}
      data-stage={stage}
      data-plant={Math.min(level, 7)}
      className={small ? 'h-12 w-16' : 'mx-auto w-full max-w-xs'}
    >
      <ellipse cx="120" cy="143" rx="105" ry="10" fill="#94704f" />
      {stage === 0 ? (
        <ellipse cx="120" cy="134" rx="6" ry="4" fill="#5c422e" />
      ) : (
        <>
          <path
            d={`M120 140 V${140 - height}`}
            stroke="#5c422e"
            strokeWidth={stage > 3 ? 9 : 4}
            strokeLinecap="round"
          />
          {Array.from({ length: stage + 1 }, (_, i) => (
            <ellipse
              key={i}
              cx={120 + (i % 2 ? 18 : -18)}
              cy={130 - i * 10}
              rx={stage > 3 ? 27 : 18}
              ry="10"
              fill={level >= 6 ? '#24564d' : '#36754a'}
              transform={`rotate(${i % 2 ? -25 : 25} ${120 + (i % 2 ? 18 : -18)} ${130 - i * 10})`}
            />
          ))}
        </>
      )}
      {Array.from({ length: badges }, (_, i) => (
        <g key={i} transform={`translate(${25 + (i % 9) * 23} ${137 - Math.floor(i / 9) * 17})`}>
          <path d="M0 6 V-2" stroke="#36754a" strokeWidth="2" />
          <circle r="5" fill="#bc5579" />
          <circle r="2" fill="#f4d379" />
        </g>
      ))}
    </svg>
  );
}
