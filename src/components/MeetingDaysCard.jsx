import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';

/** Shown while no meeting days are set: a gentle way into Settings. */
export default function MeetingDaysCard({ onOpen }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-11 w-full items-center gap-3 rounded-2xl bg-base-100 p-4 text-left shadow-sm"
    >
      <CalendarDays aria-hidden="true" className="h-6 w-6 shrink-0 text-[var(--fd-accent)]" />
      <span>
        <span className="block font-medium">{t('fd.today.setMeetingDays')}</span>
        <span className="block text-sm text-base-content/70">
          {t('fd.today.setMeetingDaysBody')}
        </span>
      </span>
    </button>
  );
}
