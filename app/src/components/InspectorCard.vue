<!-- eslint-disable vue/no-v-html -->
<template>
  <section v-if="I.show" class="insp glass" :class="{sel:I.sel}" aria-live="polite" @click="E.inspClick($event)" v-html="I.html"></section>
</template>

<script setup>
import { computed } from 'vue'
import { useGame } from '../stores/game'
import { E } from '../game/bridge'

const { d } = useGame()
const I = computed(() => d.insp || { show: false, sel: false, html: '' })
</script>
