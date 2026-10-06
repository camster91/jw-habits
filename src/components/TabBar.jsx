import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { CalendarCheck, ChartNoAxesColumn, Settings } from 'lucide-react';

const itemClass =
  'flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 px-3 py-1 text-xs';

/** Bottom navigation: Today, Progress, and a button that opens Settings. */
export default function TabBar({ onOpenSettings }) {
  const { t } = useTranslation();
  const tab = ({ isActive }) =>
    `${itemClass} ${isActive ? 'font-semibold text-[var(--fd-accent)]' : 'text-base-content/70'}`;
  return (
    <nav
      aria-label={t('fd.tabs.label')}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-base-content/10 bg-base-100 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-md">
        <NavLink to="/" end className={tab}>
          <CalendarCheck aria-hidden="true" className="h-6 w-6" />
          {t('fd.tabs.today')}
        </NavLink>
        <NavLink to="/progress" className={tab}>
          <ChartNoAxesColumn aria-hidden="true" className="h-6 w-6" />
          {t('fd.tabs.progress')}
        </NavLink>
        <button
          type="button"
          className={`${itemClass} text-base-content/70`}
          onClick={onOpenSettings}
        >
          <Settings aria-hidden="true" className="h-6 w-6" />
          {t('fd.tabs.settings')}
        </button>
      </div>
    </nav>
  );
}
