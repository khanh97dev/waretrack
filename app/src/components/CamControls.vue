<template>
  <div class="cam glass" role="group" :aria-label="$t('app.cam.group')" :class="{'spot': s.spot==='.cam'}">
    <button class="zoom" :aria-label="$t('app.cam.zoomIn')" @click="E.zoomIn()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
    <button class="zoom" :aria-label="$t('app.cam.zoomOut')" @click="E.zoomOut()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></svg></button>
    <hr class="zoom">
    <button :aria-label="$t('app.cam.rotL')" @click="E.rotL()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/></svg></button>
    <button :aria-label="$t('app.cam.rotR')" @click="E.rotR()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4h-4"/></svg></button>
    <button :aria-label="$t('app.cam.reset')" @click="E.resetCam()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/></svg></button>
  </div>
</template>
<script setup>
import { useGame } from '../stores/game'
import { E } from '../game/bridge'
const { d } = useGame()
const s = d.live
</script>
