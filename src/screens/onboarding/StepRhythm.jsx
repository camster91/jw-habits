import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ANCHOR_PHRASE_TIMES } from '../../domain/store.js';
import { isNative } from '../../utils/native.js';
import { Choice, TimeField, Toggle } from './controls.jsx';

const SET_TIME = 'set';
const DEFAULT_ANCHOR = { time: '07:00', phrase: null };

function formatClock(time, locale) {
  const [hour, minute] = time.split(':').map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Step 5 / Settings → Rhythm: when the daily text happens, the evening
 * wrap-up, and the encouragement tone. With `askPermission` (onboarding on a
 * phone only) it ends by explaining reminders and offering the permission
 * prompt; declining changes nothing here.
 */
export default function StepRhythm({ store, change, askPermission = false }) {
  const { t, i18n } = useTranslation();
  const [asked, setAsked] = useState(false);
  const [permissionNote, setPermissionNote] = useState('');
  const anchor = store.anchors.dailyText ?? DEFAULT_ANCHOR;
  const clockTime = formatClock(anchor.time, i18n.language);
  const cueLabel = anchor.phrase
    ? t('fd.anchor.' + anchor.phrase)
    : t('fd.onboarding.rhythm.setTime');
  const suggestedTime = ANCHOR_PHRASE_TIMES[anchor.phrase];
  const suggestedClock = suggestedTime && formatClock(suggestedTime, i18n.language);

  const setAnchor = (a) => change((s) => ({ ...s, anchors: { ...s.anchors, dailyText: a } }));
  const pickPhrase = (v) => {
    const phrase = v === SET_TIME ? null : v;
    setAnchor({ ...anchor, phrase });
  };

  const requestPermission = () => {
    setAsked(true);
    LocalNotifications.requestPermissions()
      .then((result) => {
        setPermissionNote(
          result?.display === 'granted'
            ? 'Notifications are allowed. Your chosen reminders can run after setup.'
            : 'Notifications are not enabled. You can still use every routine and revisit permission in Settings.'
        );
      })
      .catch(() => {
        setPermissionNote(
          'Permission could not be checked. You can continue and try again in Settings.'
        );
        setAsked(false);
      });
  };

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-2xl bg-base-100 p-4">
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
        <div
          aria-label="Daily-text reminder preview"
          role="region"
          aria-live="polite"
          className="rounded-xl bg-base-200 p-3"
        >
          <p className="font-medium">
            {cueLabel} · {clockTime}
          </p>
          <p className="text-sm text-base-content/70">
            When reminders are enabled, they use this clock time.
          </p>
          {suggestedTime && suggestedTime !== anchor.time && (
            <button
              type="button"
              className="btn btn-outline min-h-11 mt-2"
              onClick={() => setAnchor({ ...anchor, time: suggestedTime })}
            >
              Try {suggestedClock}
            </button>
          )}
        </div>
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">
            How cues and reminders work
          </summary>
          <p className="text-sm text-base-content/70">
            A cue is a moment in your own routine. Faithful Days cannot detect breakfast, other
            meals, prayer or bedtime. Choosing a cue keeps your clock time; edit it above to match
            your day.
          </p>
        </details>
      </section>
      <section className="space-y-3 rounded-2xl bg-base-100 p-4">
        <h2 className="font-semibold">A quiet evening pause</h2>
        <p className="text-sm text-base-content/70">
          Choose when to review your day. The evening notification is optional.
        </p>
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
      </section>
      <section className="space-y-3 rounded-2xl bg-base-100 p-4">
        <Choice
          legend={t('fd.onboarding.rhythm.tone')}
          value={store.tone}
          options={['quiet', 'warm', 'scripture'].map((tone) => ({
            value: tone,
            label: t('fd.onboarding.rhythm.tones.' + tone),
          }))}
          onChange={(tone) => change((s) => ({ ...s, tone }))}
        />
        <p aria-live="polite" className="text-sm text-base-content/70">
          {store.tone === 'quiet'
            ? 'Quiet: your check-in is confirmed without an encouragement line.'
            : store.tone === 'warm'
              ? 'Warm: a short, encouraging line follows a check-in.'
              : 'Reference: a Bible verse reference follows a check-in; no verse text is copied into the app.'}
        </p>
      </section>
      {askPermission && !isNative && (
        <p className="text-sm text-base-content/70">
          Reminders work in the installed app. This browser preview does not ask for permission.
        </p>
      )}
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
          {permissionNote && (
            <p role="status" className="text-sm">
              {permissionNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
