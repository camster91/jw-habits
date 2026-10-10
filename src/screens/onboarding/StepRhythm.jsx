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
  const [permissionNote, setPermissionNote] = useState('');
  const anchor = store.anchors.dailyText ?? DEFAULT_ANCHOR;

  const setAnchor = (a) => change((s) => ({ ...s, anchors: { ...s.anchors, dailyText: a } }));
  const pickPhrase = (v) => {
    const phrase = v === SET_TIME ? null : v;
    setAnchor({ time: phrase ? ANCHOR_PHRASE_TIMES[phrase] : anchor.time, phrase });
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
        <p className="text-sm text-base-content/70">
          A familiar moment sets a suggested clock time. Adjust the time below to fit your day.
        </p>
        <TimeField
          label={t('fd.onboarding.rhythm.anchorTime')}
          value={anchor.time}
          onChange={(time) => setAnchor({ ...anchor, time })}
        />
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
          Phone reminders are available in the installed mobile app. This browser preview does not
          request notification permission.
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
