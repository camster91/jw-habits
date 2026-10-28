import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { useStore } from '../data/useStore.js';
import { eventLabel, nextComing, shortDate } from '../domain/events.js';

/**
 * Today's one "Coming up" line: the next big date starting within 14 days,
 * e.g. "Circuit assembly · Sat 14 Nov". It links to the Dates card on Plans
 * (route state `{ focus: 'dates' }` scrolls it into view). Nothing when no
 * date is that close.
 */
export default function ComingUp() {
  const { t, i18n } = useTranslation();
  const { store, today } = useStore();
  const event = nextComing(store, today);
  if (!event) return null;
  const label = eventLabel(event, t);
  const line =
    event.start === today
      ? t('fd.events.today', { label })
      : t('fd.events.comingUp', { label, date: shortDate(event.start, i18n.language) });
  return (
    <Link
      to="/plans"
      state={{ focus: 'dates' }}
      data-testid="coming-up"
      className="flex min-h-11 items-center gap-3 rounded-2xl bg-base-100 px-4 py-3 shadow-sm"
    >
      <CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--fd-accent-text)]" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-base-content/70">{t('fd.events.comingUpLabel')}</span>
        <span className="block break-words font-medium">{line}</span>
      </span>
      <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-base-content/50" />
    </Link>
  );
}
