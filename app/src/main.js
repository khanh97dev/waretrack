import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar } from 'quasar'

import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import './css/quasar.reset.css'
import './css/app.css'

import App from './App.vue'
import { i18n } from './i18n'

const app = createApp(App)
app.use(createPinia())
app.use(Quasar)
app.use(i18n)
// Quasar's install sets <html lang> from its own language pack; keep the game's locale
document.documentElement.lang = i18n.global.locale.value

app.mount('#qapp')
