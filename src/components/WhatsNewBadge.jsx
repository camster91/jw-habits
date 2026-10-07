import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';

/** "N new on jw.org": says only how many, never what. */
export default function WhatsNewBadge({ count, onOpen }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="badge badge-lg min-h-11 gap-2 border-none bg-[var(--fd-accent)] px-4 text-white"
    >
      <Sparkles aria-hidden="true" className="h-4 w-4" />
      {t('fd.today.whatsNew', { count })}
    </button>
  );
}
