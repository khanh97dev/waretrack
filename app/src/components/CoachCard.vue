<template>
  <div v-if="c && s.coaching" class="coach glass">
    <div class="cstep">{{ $t('app.coach.step', { step: c.step, total: c.total }) }}</div>
    <h4>{{ c.title }}</h4>
    <p>{{ c.body }}</p>
    <div class="cfoot">
      <button v-if="c.btn" class="act solid" @click="E.coachNext()">{{ c.btn }}</button>
      <span v-else class="wait">{{ c.wait }}</span>
      <button class="skip" @click="E.coachSkip()">{{ $t('app.coach.skip') }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useGame } from '../stores/game'
import { E } from '../game/bridge'

const { d } = useGame()
const s = d.live
const c = computed(() => d.coach)
watch(() => s.coachTop, v => { document.body.classList.toggle('coach-top', !!v) })
watch(() => s.coaching, v => { document.body.classList.toggle('coaching', !!v) })
</script>

