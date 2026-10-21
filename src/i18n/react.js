import i18n from './lite.js';

/** react-i18next's hook for the single, fixed English language (#259). */
export function useTranslation() {
  return { t: i18n.t, i18n, ready: true };
}

export const initReactI18next = { type: '3rdParty', init() {} };
