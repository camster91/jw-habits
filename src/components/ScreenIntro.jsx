/** Shared original artwork and page framing; all instructions remain real text. */
export default function ScreenIntro({ title, subtitle, art, tone = 'teal', children }) {
  return (
    <header className="fd-screen-intro rounded-3xl p-4" data-tone={tone}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-3xl font-bold focus:outline-none">{title}</h1>
          {subtitle && <p className="text-sm text-base-content/80">{subtitle}</p>}
        </div>
        {art && (
          <img
            src={`/illustrations/${art}.webp`}
            alt=""
            width="96"
            height="96"
            className="h-24 w-24 shrink-0 object-contain"
          />
        )}
      </div>
      {children}
    </header>
  );
}
