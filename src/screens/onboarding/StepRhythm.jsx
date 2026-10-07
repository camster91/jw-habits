import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ANCHOR_PHRASE_TIMES } from '../../domain/store.js';
import { isNative } from '../../utils/native.js';
import { Choice, TimeField, Toggle } from './controls.jsx';

const SET_TIME = 'set';
const DEFAULT_ANCHOR = { time: '07:00', phrase: null };

/**
 * Step 5 / Settings → Rhythm: when the daily text happens, the evening
 * wrap-up, and the encouragement tone. With `askPermission` (onboarding on a
 * phone only) it ends by explaining reminders and offering the permission
 * prompt; declining changes nothing here.
 */
export default function StepRhythm({ store, change, askPermission = false }) {
  const { t } = useTranslation();
  const [asked, setAsked] = useState(false);
  const anchor = store.anchors.dailyText ?? DEFAULT_ANCHOR;

  const setAnchor = (a) => change((s) => ({ ...s, anchors: { ...s.anchors, dailyText: a } }));
  const pickPhrase = (v) => {
    const phrase = v === SET_TIME ? null : v;
    setAnchor({ time: phrase ? ANCHOR_PHRASE_TIMES[phrase] : anchor.time, phrase });
  };

  const requestPermission = () => {
    setAsked(true);
    LocalNotifications.requestPermissions().catch((error) =>
      console.warn('Notification permission request was not completed:', error)
    );
  };

  return (
    <div className="space-y-4">
      <Choice
        legend={t('fd.onboarding.rhythm.anchorQuestion')}
        value={anchor.phrase ?? SET_TIME}
        options={[
          ...Object.keys(ANCHOR_PHRASE_TIMES).map((p) => ({
            value: p,
            label: t('fd.anchor.' + p),
          })),
          { value: SET_TIME, label: t('fd.onboarding.rhythm.setTime') },
        ]}
        onChange={pickPhrase}
      />
      <TimeField
        label={t('fd.onboarding.rhythm.anchorTime')}
        value={anchor.time}
        onChange={(time) => setAnchor({ ...anchor, time })}
      />
      <TimeField
        label={t('fd.onboarding.rhythm.wrapUpTime')}
        value={store.wrapUpTime}
        onChange={(time) => change((s) => ({ ...s, wrapUpTime: time }))}
      />
      <Toggle
        label={t('fd.onboarding.rhythm.wrapUpNotification')}
        checked={store.wrapUpNotification}
        onChange={(on) => change((s) => ({ ...s, wrapUpNotification: on }))}
      />
      <Choice
        legend={t('fd.onboarding.rhythm.tone')}
        value={store.tone}
        options={['quiet', 'warm', 'scripture'].map((tone) => ({
          value: tone,
          label: t('fd.onboarding.rhythm.tones.' + tone),
        }))}
        onChange={(tone) => change((s) => ({ ...s, tone }))}
      />
      {askPermission && isNative && (
        <div className="space-y-2 rounded-2xl bg-base-100 p-3">
          <p>{t('fd.onboarding.rhythm.notifyExplainer')}</p>
          <button
            type="button"
            className="btn min-h-11"
            disabled={asked}
            onClick={requestPermission}
          >
            {t('fd.onboarding.rhythm.allowNotifications')}
          </button>
        </div>
      )}
    </div>
  );
}
