import { useTranslation } from 'react-i18next';
import { Sparkles, ArrowUpRight } from 'lucide-react';

/** A user-opened shortcut, not an assertion that unseen items exist. */
export default function WhatsNewBadge({ onOpen }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fd-whats-new flex min-h-11 w-full items-center gap-3 rounded-2xl p-3 text-left"
    >
      <span
        aria-hidden="true"
        className="fd-whats-new-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
      >
        <Sparkles className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{t('fd.today.whatsNewLink')}</span>
        <span className="block text-sm text-base-content/70">{t('fd.today.whatsNewHint')}</span>
      </span>
      <ArrowUpRight aria-hidden="true" className="h-5 w-5 shrink-0" />
    </button>
  );
}
