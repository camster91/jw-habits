import { useState, useEffect } from 'react';
// Mapping of blur color keys to Tailwind classes
// Full class strings must be present in source for JIT compiler
const BLUR_VARIANTS = {
  blue: 'bg-blue-300/10',
  indigo: 'bg-indigo-300/10',
  orange: 'bg-orange-300/10',
  pink: 'bg-pink-300/10',
  emerald: 'bg-emerald-300/10',
};

/** Theme-aware gradient defaults per color family */
const GRADIENT_DEFAULTS = {
  blue: {
    light: 'from-primary via-primary to-blue-700',
    dark: 'from-primary via-primary to-blue-900',
  },
  emerald: {
    light: 'from-primary via-primary to-emerald-700',
    dark: 'from-primary via-primary to-emerald-900',
  },
};

/**
 * Reusable gradient page header with decorative blur circles.
 *
 * @param {string}   title         - Page title
 * @param {string}   [subtitle]     - Optional subtitle text
 * @param {object}   [icon]        - Lucide icon component
 * @param {string}   [gradient]    - Tailwind gradient classes (e.g. "from-primary via-primary to-blue-700")
 * @param {node}     [actions]     - JSX for top area (e.g. greeting row with menu button)
 * @param {node}     [children]    - Extra content below title/subtitle (e.g. stats row)
 * @param {string}   [blurColor]   - Key into BLUR_VARIANTS (blue|indigo|orange|pink|emerald)
 * @param {boolean}  [noBlurs]     - Skip decorative blur circles entirely
 * @param {boolean}  [shadow]      - Add shadow-lg to header
 * @param {boolean}  [iconBare]    - Show icon without the boxed wrapper (for large standalone icons)
 * @param {string}   [titleSize]   - Tailwind text size class (default "text-2xl")
 * @param {string}   [subtitleClass] - Override subtitle classes
 * @param {string}   [contentClass]   - Override content padding classes
 */
export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  gradient,
  actions,
  children,
  blurColor = 'blue',
  noBlurs = false,
  shadow = false,
  iconBare = false,
  titleSize = 'text-2xl',
  subtitleClass,
  contentClass,
}) {
  // Auto-detect dark mode to use a darker gradient endpoint.
  // Subscribe to the data-theme attribute so toggling theme at runtime
  // re-renders the header (otherwise the gradient is frozen on first render).
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  const resolvedGradient = gradient ?? (isDark
    ? 'from-primary via-primary to-blue-900'
    : 'from-primary via-primary to-blue-700');

  const blurClass = BLUR_VARIANTS[blurColor] || BLUR_VARIANTS.blue;

  const defaultSubtitleClass = Icon
    ? 'text-white/70 text-sm'
    : 'text-sm opacity-80 mt-1';

  return (
    <header
      className={`relative bg-gradient-to-br ${resolvedGradient} text-primary-content${shadow ? ' shadow-lg' : ''}`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {!noBlurs && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className={`absolute bottom-0 left-0 w-48 h-48 ${blurClass} rounded-full blur-3xl`} />
        </div>
      )}

      <div className={`relative px-4 pt-6 pb-8${contentClass ? ` ${contentClass}` : ''}`}>
        <div className="max-w-2xl mx-auto">
          {actions}

          {Icon ? (
            <div className="flex items-center gap-3">
              {iconBare ? (
                <Icon className="w-8 h-8" />
              ) : (
                <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-sm">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h1 className={`${titleSize} font-bold tracking-tight`}>{title}</h1>
                {subtitle && (
                  <p className={subtitleClass || defaultSubtitleClass}>{subtitle}</p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h1 className={`${titleSize} font-bold tracking-tight`}>{title}</h1>
              {subtitle && (
                <p className={subtitleClass || defaultSubtitleClass}>{subtitle}</p>
              )}
            </div>
          )}

          {children}
        </div>
      </div>
    </header>
  );
}