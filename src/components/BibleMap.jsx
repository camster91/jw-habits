import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BOOKS } from '../domain/bible.js';

/**
 * All 66 books in canonical order; a book is filled with the accent once it
 * is complete. `completed` is a list of book numbers (1-66).
 */
export default function BibleMap({ completed }) {
  const { t } = useTranslation();
  const done = new Set(completed);
  return (
    <ul role="list" aria-label={t('fd.progress.mapTitle')} className="grid grid-cols-6 gap-1.5">
      {BOOKS.map((b) => {
        const read = done.has(b.n);
        return (
          <li
            key={b.n}
            data-book={b.n}
            aria-label={t(read ? 'fd.progress.mapRead' : 'fd.progress.mapNotYet', { name: b.name })}
            className={`relative flex h-9 items-center justify-center rounded border text-[11px] font-medium ${
              read
                ? 'border-solid border-[var(--fd-accent)] bg-[var(--fd-accent)] text-white'
                : 'border-dashed border-base-content/40 text-base-content/60'
            }`}
          >
            {read && (
              <Check aria-hidden="true" className="absolute right-0.5 top-0.5 h-2.5 w-2.5" />
            )}
            <span aria-hidden="true">{b.name.replace(/s/g, '').slice(0, 3)}</span>
          </li>
        );
      })}
    </ul>
  );
}
