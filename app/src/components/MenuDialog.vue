<!-- eslint-disable vue/no-v-html -->
<template>
  <div v-if="S && S.open" class="modal">
    <div ref="sheetEl" class="sheet" role="dialog" aria-modal="true" :aria-label="$t('app.menu.aria')">
      <div v-html="S.header" @click="headerClick($event)"></div>
      <div v-if="S.nav" class="mnav" role="tablist">
        <button v-for="n in S.nav.list" :key="n[0]" role="tab" :aria-selected="String(S.nav.cur===n[0])" @click="E.menuTab(n[0])">{{ n[1] }}<span v-if="n[2]" class="dot"></span></button>
        <select class="lang mlang" :aria-label="$t('app.menu.language')" :value="locale" @change="setLocale($event.target.value)">
          <option v-for="l in LOCALES" :key="l.code" :value="l.code">{{ l.label }}</option>
        </select>
      </div>
      <div v-if="S.content" class="mbody" v-html="S.content" @click="bodyClick($event)"></div>
      <div v-if="S.me" class="mbody">
        <div class="m-grid" style="margin-top:0">
          <div v-html="S.career"></div>
          <div class="m-box">
            <h2>{{ $t('app.menu.settings') }}</h2>
            <div class="toggle"><span>{{ $t('app.menu.sfx') }}</span><button class="switch" :aria-pressed="String(!!S.settings.sound)" :aria-label="$t('app.menu.sfx')" @click="E.setSetting('sound', !S.settings.sound)"></button></div>
            <div class="toggle"><span>{{ $t('app.menu.music') }}</span><button class="switch" :aria-pressed="String(!!S.settings.music)" :aria-label="$t('app.menu.music')" @click="E.setSetting('music', !S.settings.music)"></button></div>
            <div class="toggle"><label for="vol">{{ $t('app.menu.volume') }}</label><input id="vol" type="range" min="0" max="1" step="0.05" :value="S.settings.vol" @input="E.setVol($event.target.value)"></div>
            <div class="toggle"><label for="lang">{{ $t('app.menu.language') }}</label>
              <select id="lang" class="lang" :value="locale" @change="setLocale($event.target.value)">
                <option v-for="l in LOCALES" :key="l.code" :value="l.code">{{ l.label }}</option>
              </select>
            </div>
            <div class="toggle"><span>{{ $t('app.menu.training') }}</span><button class="act" :disabled="S.settings.inShift" @click="act('tutorial')">{{ $t('app.menu.replay') }}</button></div>
            <h2 style="margin-top:14px">{{ $t('app.menu.progress') }}</h2>
            <p class="note">{{ $t('app.menu.progressNote') }}</p>
            <template v-if="S.settings.confirm">
              <div class="confirm">{{ $t('app.menu.resetWarn') }}
                <button class="btn danger" style="height:34px" @click="act('resetyes')">{{ $t('app.menu.resetYes') }}</button>
                <button class="btn link" style="height:34px" @click="act('resetno')">{{ $t('app.menu.cancel') }}</button>
              </div>
            </template>
            <button v-else class="btn ghost" @click="act('reset')">{{ $t('app.menu.reset') }}</button>
          </div>
        </div>
      </div>
      <div v-if="S.foot" class="m-foot" v-html="S.foot" @click="bodyClick($event)"></div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, ref, nextTick } from 'vue'
import { useGame } from '../stores/game'
import { E } from '../game/bridge'
import { useI18n } from 'vue-i18n'
import { LOCALES, setLocale } from '../i18n'

const { d } = useGame()
const { locale } = useI18n()
const S = computed(() => d.sheet && d.sheet.open ? d.sheet : null)
const sheetEl = ref(null)


function act(a){ E.menuAction(a) }
function headerClick(e){
  const t = e.target
  if (!t.closest) return
  const b = t.closest('[data-a]')
  if (b) { e.stopPropagation(); act(b.dataset.a); return }
  const mt = t.closest('[data-mtab]')
  if (mt) { E.menuTab(mt.dataset.mtab); e.stopPropagation() }
}
function bodyClick(e){
  const t = e.target
  if (!t.closest) return
  const b = t.closest('[data-a]')
  if (b) { act(b.dataset.a); e.stopPropagation(); return }
  const site = t.closest('[data-site]')
  if (site && !site.disabled) { E.menuSite(+site.dataset.site); e.stopPropagation(); return }
  const buy = t.closest('[data-buy]')
  if (buy && !buy.disabled) { E.buyUp(buy.dataset.buy); e.stopPropagation(); return }
  const cos = t.closest('[data-cos]')
  if (cos && !cos.disabled) { E.buyCos(cos.dataset.cos); e.stopPropagation(); return }
  const eq = t.closest('[data-equip]')
  if (eq) { E.equipCos(eq.dataset.equip); e.stopPropagation() }
}
// like the original openModal: every new view starts scrolled to the top
watch(() => S.value && S.value.view, v => {
  nextTick(() => { if (sheetEl.value) sheetEl.value.scrollTop = 0 })
  if (v === 'report') nextTick(() => E.sheetXpTo())
})
</script>

<style scoped>
/* .sheet is a height-capped flex column: without this the tab row shrinks to 1px on long pages (bug inherited from index.html) */
.mnav{flex:none}
.mlang{margin:auto 0 auto auto;flex:none}
.lang{font:inherit;font-size:12.5px;color:var(--ink);background:var(--glass-solid);border:1px solid var(--line);border-radius:8px;padding:4px 8px;cursor:pointer}
</style>
