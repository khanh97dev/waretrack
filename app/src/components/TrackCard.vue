<template>
  <section v-if="T.html" class="track glass" :class="{spot:s.spot==='#track'}" @click="click" v-html="injected"></section>
</template>

<script setup>
import { computed } from 'vue'
import { useGame } from '../stores/game'
import { E } from '../game/bridge'
import { useI18n } from 'vue-i18n'

const { d } = useGame()
const s = d.live
const { t } = useI18n()
const T = computed(() => d.track || { html:'' })
const trkmode = computed(() => '<span class="trkmode">' +
  '<button data-trk="in" class="' + (T.value.mode !== 'out' ? 'on' : '') + '">' + t('app.track.in') + '</button>' +
  '<button data-trk="out" class="' + (T.value.mode === 'out' ? 'on' : '') + '">' + t('app.track.out') + '</button></span>')
// insert the mode toggle as the last child of the first .th header (matches insertAdjacentHTML('beforeend'))
const injected = computed(() => {
  const h = T.value.html || ''
  if (!h) return h
  const a = h.replace('</span></div><ol class="steps">', '</span>' + trkmode.value + '</div><ol class="steps">')
  if (a !== h) return a
  return h.replace('</span></div>' + '<div class="fl-grid">', '</span>' + trkmode.value + '</div><div class="fl-grid">')
})
function click(e){
  if (!e.target || !e.target.closest) return
  const b = e.target.closest('[data-trk]')
  const f = e.target.closest('[data-focus]')
  if (!b && !f) return
  E.trackClick(e)
  if (b) e.stopPropagation()
}
</script>
