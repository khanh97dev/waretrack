<template>
  <section v-if="d.shift" class="shift glass" :class="{open:openCls, spot:s.spot==='#shift'}" @click="click" v-html="d.shift.html"></section>
</template>

<script setup>
import { ref } from 'vue'
import { useGame } from '../stores/game'
import { E } from '../game/bridge'

const { d } = useGame()
const s = d.live
const openCls = ref(false)
function click(e){
  const t = e.target
  if (t.closest && t.closest('[data-menu]')) { E.brand(); return }
  if (innerWidth > 760) return
  if (d.shift.free) { E.brand(); return }
  openCls.value = !openCls.value
}
</script>
