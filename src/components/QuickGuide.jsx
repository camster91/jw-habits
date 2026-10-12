import { Lightbulb, Plus } from 'lucide-react';

/** Native disclosure stays keyboard accessible and never changes user data. */
export default function QuickGuide({ title = 'A quick guide', steps }) {
  return (
    <details className="fd-guide rounded-2xl px-4 py-1">
      <summary className="flex min-h-11 cursor-pointer items-center gap-[8px] font-semibold">
        <Lightbulb aria-hidden="true" className="h-[20px] w-[20px] shrink-0" />
        <span className="min-w-0 flex-1 break-words">{title}</span>
        <Plus aria-hidden="true" className="fd-guide-toggle ml-auto h-[20px] w-[20px] shrink-0" />
      </summary>
      <ol className="list-decimal space-y-3 pb-3 pl-5 text-sm">
        {steps.map(({ title, body }) => (
          <li key={title}>
            <strong>{title}</strong>
            <p className="mt-1 text-base-content/80">{body}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}
