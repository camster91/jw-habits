import { describe, it, expect } from 'vitest';
// The real library, imported by path because the bare name is aliased to lite.js.
import realI18next from '../../node_modules/i18next/dist/esm/i18next.js';
import lite from './lite.js';
import en from '../locales/en.json';

const real = realI18next.createInstance();
await real.init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

function keys(node, prefix = '') {
  return Object.entries(node).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? keys(v, `${prefix}${k}.`)
      : [`${prefix}${k}`.replace(/_(one|other|zero)$/, '')]
  );
}
const all = [...new Set(keys(en))];
const names = (key) => {
  const raw = JSON.stringify(real.t(key, { returnObjects: true }));
  return [...raw.matchAll(/\{\{\s*([^{}\s]+)\s*\}\}/g)].map((m) => m[1]);
};

describe('i18n lite matches i18next for every English string (#259)', () => {
  it.each(all)('%s', (key) => {
    const options = Object.fromEntries(names(key).map((n) => [n, `<${n}>`]));
    for (const count of [undefined, 0, 1, 2, 5]) {
      const opts = count === undefined ? options : { ...options, count };
      expect(lite.t(key, opts)).toEqual(real.t(key, opts));
    }
    expect(lite.t(key, { ...options, returnObjects: true })).toEqual(
      real.t(key, { ...options, returnObjects: true })
    );
  });

  it('resolves indexed list entries the app uses, like i18next', () => {
    for (const key of ['fd.fun.levels', 'fd.fun.gardenStages', 'fd.encourage.warm'])
      for (let i = 0; i < 12; i++) expect(lite.t(`${key}.${i}`)).toEqual(real.t(`${key}.${i}`));
  });

  it('returns the key for a missing string, like i18next', () => {
    expect(lite.t('fd.not.a.key')).toBe(real.t('fd.not.a.key'));
  });
});
