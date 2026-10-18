<template>
  <div class="toasts" aria-live="polite">
    <transition-group name="toastt">
      <div v-for="t in d.toasts" :key="t.id" class="toast" :class="t.kind">
        <span class="ti" v-html="t.icon"></span><div><b>{{ t.title }}</b><small v-if="t.body">{{ t.body }}</small></div>
      </div>
    </transition-group>
  </div>
</template>
<script setup>
import { useGame } from '../stores/game'
const { d } = useGame()
</script>
<style scoped>
/* .toast already animates in (app.css); leave like the original .toast.out */
.toastt-leave-active{animation:tout .3s forwards}
</style>
