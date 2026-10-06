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
            className={`flex h-9 items-center justify-center rounded text-[10px] font-medium ${
              read
                ? 'bg-[var(--fd-accent)] text-white'
                : 'border border-base-content/20 text-base-content/60'
            }`}
          >
            <span aria-hidden="true">{b.name.replace(/\s/g, '').slice(0, 3)}</span>
          </li>
        );
      })}
    </ul>
  );
}
