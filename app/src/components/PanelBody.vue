<template>
  <!-- eslint-disable vue/no-v-html -->
  <aside id="panel" ref="rootEl" class="panel glass" :class="{building:s.building||s.town, spot:s.spot==='#panel', open:s.panelOpen}">
    <div class="p-head" @click="headClick">
      <div class="handle"></div>
      <div class="eyebrow">{{ s.siteMeta ? s.siteMeta.eyebrow : $t('app.panel.dc') }}</div>
      <div class="p-title">
        <h2>{{ s.siteMeta ? s.siteMeta.name : '—' }}</h2>
        <p>{{ s.siteMeta ? s.siteMeta.addr : '' }}</p>
      </div>
      <div class="chips" v-html="P.chips || ''"></div>
      <div v-if="P.tab" class="tabs" role="tablist" @click.stop>
        <button v-for="t in tabs" :key="t.k" role="tab" :aria-selected="String(P.tab===t.k)" :data-tab="t.k" @click.stop="selectTab(t.k, $event)">
          {{ t.l }} <span v-if="t.count!=null" class="count" :class="{hot:t.hot}">{{ t.count }}</span>
        </button>
      </div>
    </div>
    <div class="p-body" @click.stop="row($event)" v-html="P.html || ''"></div>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useGame } from '../stores/game'
import { E } from '../game/bridge'
import { useI18n } from 'vue-i18n'

const { d } = useGame()
const s = d.live
const { t } = useI18n()
const P = computed(() => d.panel || { mode:'normal', tab:'ord', counts:{ord:{n:0},dock:{n:''},fl:{n:''},tk:{n:''},van:{n:0}}, chips:'', html:null, cr:'' })
const rootEl = ref(null)

const tabs = computed(() => {
  const c = P.value.counts || {}
  return [
    { k:'ord', l:t('app.panel.tab.ord'), count:c.ord&&c.ord.n, hot:bang('ord') },
    { k:'dock', l:t('app.panel.tab.dock'), count:c.dock&&c.dock.n },
    { k:'fl', l:t('app.panel.tab.fl'), count:c.fl&&c.fl.n },
    { k:'tk', l:t('app.panel.tab.tk'), count:c.tk&&c.tk.n },
    { k:'van', l:t('app.panel.tab.van'), count:c.van&&c.van.n, hot:bang('van') },
    { k:'inv', l:t('app.panel.tab.inv') },
    { k:'log', l:t('app.panel.tab.log') },
  ]
})
function bang(k){
  return P.value && P.value.counts && P.value.counts[k] && P.value.counts[k].hot
}
function row(e){
  if (!e.target || !e.target.closest) return
  E.panelRowClick(e)
}
function selectTab(k, e){
  E.setTab(k)
  e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}
function headClick(){
  if (innerWidth > 760 || s.building) return
  E.panelHead()
}
defineExpose({ rootEl })
</script>

<style scoped>
:deep(.row.click){cursor:pointer}
:deep(.row.click:hover){background:var(--mute-soft)}
</style>
