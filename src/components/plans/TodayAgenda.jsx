import { useTranslation } from 'react-i18next';
import { Check, ExternalLink } from 'lucide-react';
import { openLink } from '../../native/openLink.js';
import { planStyle } from '../../theme/planColours.js';
import PlanIcon from './PlanIcon.jsx';

/**
 * The week's family worship agenda on the Today row: titles with link buttons.
 * `rows` are `{item, info: {title, link, plan, done}}` (Today's `agendaRows`).
 */
export default function TodayAgenda({ rows }) {
  const { t } = useTranslation();
  return (
    <ul aria-label={t('fd.today.agenda.label')} className="space-y-1">
      {rows.map(({ item, info }) => (
        <li key={item.id} className="flex items-center gap-2">
          {info.plan && (
            <span
              aria-hidden="true"
              style={{ ...planStyle(info.plan.colour), backgroundColor: 'var(--plan)' }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
            >
              <PlanIcon icon={info.plan.icon} className="h-4 w-4" />
            </span>
          )}
          <span className="min-w-0 flex-1 break-words text-sm">
            {info.done ? (
              <span className="flex items-center gap-1 text-base-content/70">
                <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>{t('fd.family.stepDone', { title: info.title })}</span>
              </span>
            ) : (
              info.title
            )}
          </span>
          {info.link && (
            <button
              type="button"
              className="btn btn-circle btn-ghost min-h-11 min-w-11 text-[var(--fd-accent-text)]"
              aria-label={t('fd.family.openLink', { title: info.title })}
              onClick={() => openLink(info.link)}
            >
              <ExternalLink aria-hidden="true" className="h-5 w-5" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
