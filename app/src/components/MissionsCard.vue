<template>
  <section v-if="!M.hidden" class="missions glass">
    <div class="ms-h">
      <b>{{ $t('app.ms.title') }}</b>
      <span v-if="M.ready" class="pill gold">{{ $t('app.ms.toClaim', { n: M.ready }) }}</span>
      <span class="ms-chest" :title="$t('app.ms.chestTip')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9.5 17h5"/></svg>
        {{ $t('app.ms.toChest', { n: M.next }) }}
      </span>
    </div>
    <div v-for="m in M.list" :key="m.i" class="ms" :class="{done:m.done}">
      <div class="ms-t">
        <span>{{ m.label }}</span>
        <button v-if="m.done" class="act solid" @click.stop="E.claimMission(m.i)">{{ $t('app.ms.claim', { n: m.reward }) }}</button>
        <small v-else class="mono">{{ m.progText }}</small>
      </div>
      <div class="meter" :class="{gold:m.done}"><i :style="{width:m.pct+'%'}"></i></div>
      <div v-if="!m.done" class="ms-r">{{ $t('app.ms.reward', { cr: m.reward, xp: m.xp }) }}</div>
    </div>
    <div v-if="M.compactNote" class="ms-r">{{ M.compactNote }}</div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useGame } from '../stores/game'
import { E } from '../game/bridge'

const { d } = useGame()
const M = computed(() => d.missions)
</script>

