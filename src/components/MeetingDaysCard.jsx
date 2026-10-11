import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';

/** Shown while no meeting days are set: a gentle way into Settings. */
export default function MeetingDaysCard({ onOpen }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-11 w-full items-center gap-3 rounded-2xl bg-base-100 px-3 py-2 text-left shadow-sm"
    >
      <CalendarDays aria-hidden="true" className="h-6 w-6 shrink-0 text-[var(--fd-accent-text)]" />
      <span className="font-medium">{t('fd.today.setMeetingDays')}</span>
    </button>
  );
}
