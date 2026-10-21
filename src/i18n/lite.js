/**
 * The subset of i18next this English-only release uses (#259): nested key
 * lookup, {{name}} interpolation (unescaped, like `escapeValue: false`),
 * count plurals with `_one`/`_other`, and `returnObjects`. Vite aliases
 * `i18next` here; removing that alias restores the full library for #46.
 */
const plurals = new Intl.PluralRules('en');
let resources = {};

const lookup = (key) =>
  key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), resources);

function interpolate(value, options) {
  if (typeof value === 'string')
    return value.replace(/\{\{\s*([^{}\s]+)\s*\}\}/g, (match, name) =>
      name in options && options[name] != null ? String(options[name]) : match
    );
  if (Array.isArray(value)) return value.map((item) => interpolate(item, options));
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, interpolate(v, options)]));
  return value;
}

function t(key, options = {}) {
  let value;
  if (typeof options.count === 'number') value = lookup(`${key}_${plurals.select(options.count)}`);
  if (value === undefined) value = lookup(key);
  if (value === undefined) return options.defaultValue ?? key;
  if (typeof value !== 'string' && !options.returnObjects)
    return `key '${key} (${i18n.language})' returned an object instead of string.`;
  return interpolate(value, options);
}

const i18n = {
  language: 'en',
  resolvedLanguage: 'en',
  languages: ['en'],
  isInitialized: false,
  t,
  use() {
    return i18n;
  },
  init(options = {}) {
    const lng = options.lng || 'en';
    resources = options.resources?.[lng]?.translation ?? {};
    i18n.language = lng;
    i18n.resolvedLanguage = lng;
    i18n.languages = [lng];
    i18n.isInitialized = true;
    return Promise.resolve(t);
  },
  exists: (key) => lookup(key) !== undefined,
  changeLanguage: () => Promise.resolve(t),
};

export default i18n;
export { t };
