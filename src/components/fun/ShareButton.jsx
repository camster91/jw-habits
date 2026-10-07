import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StoreContext } from '../../data/useStore.js';
import { cardCopy } from '../../share/cardCopy.js';
import { createCard } from '../../share/cards.js';
import { shareCard } from '../../native/shareCard.js';
import { PLAN_COLOURS } from '../../theme/planColours.js';

/** Optional outside the app provider (isolated preview cards have no sharing). */
export default function ShareButton({ kind, data, colour = 0, stage = 0 }) {
  const context = useContext(StoreContext);
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  if (!context?.store.showShare) return null;
  const share = async () => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const copy = cardCopy(kind, typeof data === 'function' ? data(context) : data, t);
      const blob = await createCard({
        kind,
        copy,
        colour: PLAN_COLOURS[colour],
        gardenStage: stage,
      });
      await shareCard(blob, `faithful-days-${kind}-${context.today}-${crypto.randomUUID()}.png`);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <button type="button" className="btn btn-ghost min-h-11" disabled={busy} onClick={share}>
        {t(busy ? 'fd.share.preparing' : 'fd.share.button')}
      </button>
      {error && <p role="status">{t('fd.share.error')}</p>}
    </div>
  );
}
