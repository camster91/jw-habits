import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ExternalLink, Plus } from 'lucide-react';
import { useStore } from '../../data/useStore.js';
import { MAX_EVENTS } from '../../domain/store.js';
import { eventDates, datesAhead, eventLabel, pastEvents } from '../../domain/events.js';
import { openLink } from '../../native/openLink.js';
import EventSheet from './EventSheet.jsx';

/** One date: the row opens its sheet; a date with a link also gets a link button. */
function EventItem({ event, onEdit }) {
  const { t, i18n } = useTranslation();
  const { today } = useStore();
  const label = eventLabel(event, t);
  return (
    <li className="overflow-hidden rounded-2xl bg-base-100 shadow-sm">
      <button
        type="button"
        className="flex min-h-11 w-full items-center gap-3 p-4 text-left"
        onClick={onEdit}
      >
        <span className="min-w-0 flex-1">
          <span className="block break-words font-semibold">{label}</span>
          <span className="block text-sm text-base-content/70">
            {eventDates(event, i18n.language, today)}
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-base-content/50" />
      </button>
      {event.link && (
        <div className="border-t border-base-content/10 px-4 py-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm min-h-11 w-full justify-start gap-2 normal-case"
            aria-label={t('fd.events.openLink', { label })}
            onClick={() => openLink(event.link)}
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{new URL(event.link).hostname}</span>
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * The Plans tab's "Dates" card: upcoming big dates, then the past ones (kept
 * until the user deletes them), with "Add date". `focused` (opened from
 * Today's "Coming up" line) scrolls the card into view and moves focus to it.
 */
export default function DatesCard({ focused = false }) {
  const { t } = useTranslation();
  const { store, today } = useStore();
  const headingId = useId();
  const pastId = useId();
  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const addRef = useRef(null);
  // null: closed; 'new': adding; otherwise the id of the date being edited.
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (!focused) return;
    sectionRef.current?.scrollIntoView?.({ block: 'start' });
    headingRef.current?.focus({ preventScroll: true });
  }, [focused]);

  const next = datesAhead(store, today);
  const past = pastEvents(store, today);
  const full = store.events.length >= MAX_EVENTS;

  return (
    <section
      ref={sectionRef}
      id="dates"
      aria-labelledby={headingId}
      className="scroll-mt-4 space-y-3"
      data-testid="dates-card"
    >
      <h2
        ref={headingRef}
        id={headingId}
        tabIndex={-1}
        className="text-xl font-semibold focus:outline-none"
      >
        {t('fd.events.title')}
      </h2>
      <p className="text-base-content/80">{t('fd.events.intro')}</p>
      {next.length > 0 ? (
        <ul aria-labelledby={headingId} className="space-y-3">
          {next.map((e) => (
            <EventItem key={e.id} event={e} onEdit={() => setEditing(e.id)} />
          ))}
        </ul>
      ) : (
        <p className="text-base-content/70">{t('fd.events.empty')}</p>
      )}
      <button
        ref={addRef}
        type="button"
        className="btn btn-outline min-h-11 w-full"
        disabled={full}
        onClick={() => setEditing('new')}
      >
        <Plus aria-hidden="true" className="h-5 w-5" />
        {t('fd.events.add')}
      </button>
      {full && <p className="text-sm text-base-content/70">{t('fd.events.full')}</p>}
      {past.length > 0 && (
        <>
          <h3 id={pastId} className="pt-2 text-lg font-semibold">
            {t('fd.events.past')}
          </h3>
          <ul aria-labelledby={pastId} className="space-y-3">
            {past.map((e) => (
              <EventItem key={e.id} event={e} onEdit={() => setEditing(e.id)} />
            ))}
          </ul>
        </>
      )}
      {editing && (
        <EventSheet
          key={editing}
          eventId={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          fallbackFocus={() => addRef.current}
        />
      )}
    </section>
  );
}
