<template>
  <!-- eslint-disable vue/no-v-html -->
  <section v-if="inc" class="incident glass" :class="[inc.cls,{'spot':s.spot==='#incident'}]">
    <div class="inc-h">
      <span class="inc-ic" v-html="inc.icon"></span>
      <div><h4>{{ inc.title }}</h4><p>{{ inc.body }}</p></div>
    </div>
    <div class="inc-acts">
      <button v-for="o in inc.opts" :key="o.i" :class="{primary:o.primary}" @click="E.chooseIncident(o.i)">
        <span>{{ o.label }}<kbd>{{ o.i+1 }}</kbd></span>
        <small>{{ o.note }}</small>
      </button>
    </div>
    <div v-if="inc.more" class="inc-more">{{ $t('app.inc.more', { n: inc.more }) }}</div>
    <i class="inc-timer" :style="{width:(s.incidentT==null?100:s.incidentT)+'%'}"></i>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useGame } from '../stores/game'
import { E } from '../game/bridge'

const { d } = useGame()
const s = d.live
const inc = computed(() => d.incident)
</script>
