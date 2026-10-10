import { Lightbulb } from 'lucide-react';

/** Native disclosure stays keyboard accessible and never changes user data. */
export default function QuickGuide({ title = 'A quick guide', steps }) {
  return (
    <details className="fd-guide rounded-2xl px-4 py-1">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
        <Lightbulb aria-hidden="true" className="h-5 w-5 shrink-0" />
        <span>{title}</span>
        <span aria-hidden="true" className="ml-auto text-lg">
          +
        </span>
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
