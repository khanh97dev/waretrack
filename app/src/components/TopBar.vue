<template>
  <header class="bar glass">
    <button class="brand" :aria-label="$t('app.top.menu')" @click="E.brand()">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 3 7v10l9 5 9-5V7z" fill="#2f5be0"/><path d="M12 12 3 7l9-5 9 5z" fill="#6f8ff0"/><path d="M12 12v10l9-5V7z" fill="#1e43b8"/></svg>
      WareTrack
      <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    <label class="search" for="q">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="q" ref="qEl" v-model="q" type="search" :placeholder="$t('app.top.search')" autocomplete="off" @keydown.enter.stop="onEnter" @keydown.esc.stop="qEl && qEl.blur()">
      <kbd>/</kbd>
    </label>
    <div class="spacer"></div>

    <button id="siteChip" class="site" ref="siteBtn" aria-haspopup="true" @click.stop="toggleSiteDD">
      <span class="code" :style="{background:site.accent}">{{ site.code }}</span>
      <div><b>{{ site.name }}</b><small>{{ kpis&&kpis.siteSub || '—' }}</small></div>
      <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>
    </button>

    <div class="clock" :class="{paused:s.paused}"><span class="dot"></span><span class="lbl">{{ s.clockLbl }}</span><b>{{ s.clock }}</b><span class="left">{{ kpis ? kpis.clockLeft : '' }}</span><i class="prog" :style="{width:(kpis?kpis.clockPct:0)+'%'}"></i></div>

    <div v-if="kpis&&kpis.combo" id="comboChip" class="combo" :class="{pulse:pulseCombo}"><span>{{ kpis.combo.x }}</span><small>{{ $t('app.top.combo') }}</small><span class="pips" v-html="comboPips"></span></div>
    <div id="scoreChip" class="score" :class="{free:kpis&&kpis.score.free,bump:bumpScore,'spot':s.spot==='#scoreChip'}"><label>{{ $t('app.top.score') }}</label><b>{{ kpis ? kpis.score.text : '—' }}</b></div>

    <div class="speed" role="group" :aria-label="$t('app.top.speed')" :class="{spot:s.spot==='.speed'}">
      <button :aria-pressed="s.speed===0" :aria-label="$t('app.top.pause')" @click="E.speedClick(0)"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg></button>
      <button :aria-pressed="s.speed===1" @click="E.speedClick(1)">1×</button>
      <button :aria-pressed="s.speed===3" @click="E.speedClick(3)">3×</button>
    </div>

    <button id="townBtn" class="ibtn" :aria-pressed="String(!!s.town)" :title="$t('app.top.townTip')" @click.stop="E.toggleTown()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg><span>{{ $t('app.top.town') }}</span>
    </button>
    <button id="buildBtn" class="ibtn" :aria-pressed="String(!!s.building)" :title="$t('app.top.buildTip')" @click.stop="E.toggleBuild()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 6 4 4M3 21l9-9M12.5 4.5 16 1l7 7-3.5 3.5z"/><path d="m11 13 3-3"/></svg><span>{{ $t('app.top.build') }}</span>
    </button>

    <button id="bellBtn" class="ibtn bell" ref="bellBtn" :aria-label="$t('app.top.notices')" aria-haspopup="true" @click.stop="toggleBellDD">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>
      <span v-if="s.bellUnread" class="bdg">{{ s.bellUnread > 9 ? '9+' : s.bellUnread }}</span>
    </button>
    <!-- always-visible language switch (text node, not a <span>: .ibtn span is hidden on narrow screens) -->
    <button id="langBtn" class="ibtn" :title="$t('app.menu.language')" :aria-label="$t('app.menu.language')" @click.stop="nextLocale">{{ locale.toUpperCase() }}</button>
    <button id="soundBtn" class="ibtn" :aria-label="$t(s.soundOn ? 'top.mute' : 'top.unmute')" :title="$t('app.top.sound')" @click.stop="E.toggleMute()">
      <svg v-if="s.soundOn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 5 5M22 9l-5 5"/></svg>
    </button>

    <button v-if="kpis" id="lvlChip" class="lvl" :title="kpis.lvl.title" :aria-label="$t('app.top.profile')" @click.stop="E.levelChip()">
      <span class="n">{{ kpis.lvl.n }}</span><span class="who"><b>{{ kpis.lvl.rank }}</b><small>{{ kpis.lvl.sub }}</small><span class="xp"><i :style="{width:kpis.lvl.pct+'%'}"></i></span></span>
    </button>

    <button id="callTruck" class="call" :title="$t('app.top.callTip')" @click.stop="E.callTruck()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg><span>{{ $t('app.top.call') }}</span>
    </button>

  </header>
  <Teleport to="body">
    <!-- dropdowns live outside header.bar: its backdrop-filter would become their containing block -->
    <div v-if="s.siteDD" id="siteDD" class="dd glass" :style="styleFor(siteAnchor)" @click.capture="siteDdClick($event)" v-html="s.siteDdHtml"></div>
    <div v-if="s.bellDD" id="bellDD" class="dd glass" :style="styleFor(bellAnchor)" @click.capture="bellDdClick($event)" v-html="s.bellHtml"></div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useGame } from '../stores/game'
import { E } from '../game/bridge'
import { useI18n } from 'vue-i18n'
import { LOCALES, setLocale } from '../i18n'

const { d } = useGame()
const s = d.live
const kpis = computed(() => d.kpis)
const { locale } = useI18n()
function nextLocale(){
  const i = LOCALES.findIndex(l => l.code === locale.value)
  setLocale(LOCALES[(i + 1) % LOCALES.length].code)
}
// the chip names the site the camera is looking at, like the original renderKpis
const site = computed(() => (d.kpis && d.kpis.site) || s.siteMeta || { code: 'WH-02', name: '—', accent: '#2f5be0' })

const q = ref('')
const qEl = ref(null)
const siteBtn = ref(null)
const bellBtn = ref(null)
const siteAnchor = ref(null)
const bellAnchor = ref(null)
const mobile = () => innerWidth <= 760
// rendered .dd width: 320px + 6px padding + 1px border on each side
const DD_WIDTH = 334

watch(() => s.focusSearch, v => { if (v) { qEl.value && qEl.value.focus() } })
watch(() => s.siteDD, v => { if (v && siteBtn.value) siteAnchor.value = siteBtn.value.getBoundingClientRect() })
watch(() => s.bellDD, v => { if (v && bellBtn.value) bellAnchor.value = bellBtn.value.getBoundingClientRect() })

function onEnter(){ if (!q.value.trim()) return; if (E.doSearch(q.value)) q.value = ''; else qEl.value && qEl.value.select() }

function toggleSiteDD(){ s.siteDD ? E.closeSiteDD() : (siteAnchor.value = siteBtn.value.getBoundingClientRect(), E.openSiteDD()) }
function toggleBellDD(){ s.bellDD ? E.closeBellDD() : (bellAnchor.value = bellBtn.value.getBoundingClientRect(), E.openBellDD()) }

function styleFor(rect){
  if (!rect) return {}
  const top = (rect.bottom + 8) + 'px'
  if (mobile()) return { left: '16px', right: '16px', width: 'auto', top }
  return { left: Math.max(16, Math.min(rect.left, innerWidth - DD_WIDTH - 16)) + 'px', top }
}
function siteDdClick(e){
  const t = e.target.closest && e.target.closest('[data-net]')
  if (t) { E.ddNet(); return }
  const b = e.target.closest && e.target.closest('[data-site]')
  if (b && !b.disabled) { E.ddSite(+b.dataset.site) }
}
function bellDdClick(e){
  const c = e.target.closest && e.target.closest('[data-clear]')
  if (c) { E.clearNotices() }
}
// combo/score pulse re-triggering
const pulseCombo = ref(false), bumpScore = ref(false)
let bumpT = null
watch(() => s.pCombo, v => { if (!v) return; pulseCombo.value = false; requestAnimationFrame(() => { pulseCombo.value = true }) })
watch(() => s.pScore, v => {
  if (!v) return
  bumpScore.value = false
  requestAnimationFrame(() => { bumpScore.value = true })
  clearTimeout(bumpT); bumpT = setTimeout(() => { bumpScore.value = false }, 160)
})
const comboPips = computed(() => {
  const c = d.kpis && d.kpis.combo
  if (!c) return ''
  return c.pips.map(on => '<i class="' + (on ? 'on' : '') + '"></i>').join('')
})
</script>
