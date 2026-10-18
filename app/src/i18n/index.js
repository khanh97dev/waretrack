import { createI18n } from 'vue-i18n'
import en from './en'
import vi from './vi'

export const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
]
const STORAGE_KEY = 'waretrack-lang'
// Vietnamese unless the player picked another language
const DEFAULT_LOCALE = 'vi'

function initialLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (LOCALES.some(l => l.code === saved)) return saved
  } catch { /* storage blocked: use the default */ }
  return DEFAULT_LOCALE
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'en',
  messages: { en, vi },
})
document.documentElement.lang = i18n.global.locale.value

// plain-function helpers for the engine, which builds HUD markup outside Vue
export const t = (key, params) => i18n.global.t(key, params || {})
// pluralised: en messages use "one | many", vi messages have a single form
export const tn = (key, n, params) => i18n.global.t(key, { n, ...params }, n)

const listeners = new Set()
export const onLocaleChange = fn => { listeners.add(fn) }

export function setLocale(code) {
  if (!LOCALES.some(l => l.code === code)) return
  i18n.global.locale.value = code
  document.documentElement.lang = code
  try { localStorage.setItem(STORAGE_KEY, code) } catch { /* not persisted */ }
  listeners.forEach(fn => fn(code))
}
