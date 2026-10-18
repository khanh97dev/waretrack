<!-- eslint-disable vue/no-v-html -->
<template>
  <div class="app-root">
    <!-- same element order as the original index.html so equal z-index layers stack the same way -->
    <div id="stage" ref="stageEl"></div>
    <div v-if="!s.ready || s.loadFail" class="loading">{{ s.loadFail || $t('app.loading') }}</div>
    <div id="fx" ref="fxEl"></div>
    <canvas id="confetti" ref="confEl"></canvas>
    <ToastStub />

    <div class="hud" :hidden="!s.ready || !!s.loadFail">
      <TopBar />
      <KpiCards />
      <div class="leftcol">
        <ShiftCard />
        <MissionsCard />
        <IncidentCard />
        <ActionsCard />
      </div>
      <BuildTownBar />
      <CamControls />
      <InspectorCard />
      <PanelBody ref="panelC" />
      <TrackCard />
      <Transition name="hint-fade">
        <div v-if="s.hint" id="hint" class="hint">{{ $t('app.hint') }}</div>
      </Transition>
    </div>
    <CoachCard />
    <div class="tag3d" id="tag3d" ref="tagEl" hidden></div>
    <MenuDialog />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useGame } from './stores/game'
import { createEngine } from './game/engine'
import TopBar from './components/TopBar.vue'
import KpiCards from './components/KpiCards.vue'
import ShiftCard from './components/ShiftCard.vue'
import MissionsCard from './components/MissionsCard.vue'
import IncidentCard from './components/IncidentCard.vue'
import ActionsCard from './components/ActionsCard.vue'
import CamControls from './components/CamControls.vue'
import TrackCard from './components/TrackCard.vue'
import PanelBody from './components/PanelBody.vue'
import BuildTownBar from './components/BuildTownBar.vue'
import InspectorCard from './components/InspectorCard.vue'
import CoachCard from './components/CoachCard.vue'
import MenuDialog from './components/MenuDialog.vue'
import ToastStub from './components/ToastStub.vue'

const { d, bootEngine } = useGame()
const s = d.live
const stageEl = ref(null), fxEl = ref(null), confEl = ref(null), tagEl = ref(null), panelC = ref(null)

onMounted(() => {
  const els = {
    stage: stageEl.value,
    fx: fxEl.value,
    conf: confEl.value,
    tag: tagEl.value,
    panel: (panelC.value && (panelC.value.rootEl || panelC.value.$el)) || null,
  }
  bootEngine(els, createEngine)
})
</script>

<style>
/* .hint already transitions opacity over .6s (app.css); fade it out like the original hideHint */
.hint-fade-leave-to{opacity:0}
</style>
