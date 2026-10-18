<template>
  <div v-if="s.building" class="buildbar glass">
    <b>{{ $t('app.bar.build') }}</b><span>{{ $t('app.bar.buildHint') }}</span>
    <button class="act solid" @click="E.exitBuild()">{{ $t('app.bar.done') }}</button>
  </div>
  <div v-else-if="s.town" class="buildbar glass">
    <b>{{ $t('app.bar.town') }}</b><span>{{ $t('app.bar.townHint') }}</span>
    <button class="act" @click="E.undoTown()">{{ $t('app.bar.undo') }}</button>
    <button class="act solid" @click="E.exitTown()">{{ $t('app.bar.done') }}</button>
  </div>
</template>
<script setup>
import { watch } from 'vue'
import { useGame } from '../stores/game'
import { E } from '../game/bridge'
const { d } = useGame()
const s = d.live
// app.css hides the track, left column and KPIs under body.building (build and town modes)
watch(() => s.building || s.town, v => document.body.classList.toggle('building', !!v), { immediate: true })
</script>
