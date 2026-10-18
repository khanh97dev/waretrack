import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'

export default defineConfig({
  base: './',
  plugins: [
    vue({ template: { transformAssetUrls } }),
    // absolute path — modern dart-sass no longer resolves relative @import
    // against the project root (quasar's index.sass injects this path verbatim)
    quasar({ sassVariables: fileURLToPath(new URL('./src/quasar-variables.sass', import.meta.url)) }),
  ],
})
