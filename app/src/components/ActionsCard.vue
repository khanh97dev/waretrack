<template>
  <section v-if="!A.hidden" class="acts glass" @click="click">
    <div class="acts-h">
      <b>{{ $t('app.acts.title') }}</b>
      <span v-if="A.count" class="pill" :class="A.badBadge?'bad':'info'">{{ A.count }}</span>
      <span class="seg">
        <button :class="{on:!A.hands}" @click.stop="hands(0)">{{ $t('app.acts.autopilot') }}</button>
        <button :class="{on:A.hands}" @click.stop="hands(1)">{{ $t('app.acts.handsOn') }}</button>
      </span>
    </div>
    <div v-if="!A.list.length" class="acts-empty">{{ A.empty }}</div>
    <div v-for="a in A.list" :key="a.key" class="act-card" :class="[a.tone, {new:a.new}]">
      <span class="ac-ic" v-html="a.icon"></span>
      <div class="ac-t">
        <b>{{ a.title }}</b><small>{{ a.sub }}</small>
        <div class="ac-b">
          <button v-for="b in a.btns" :key="b.a" class="act" :class="{solid:b.primary}" :disabled="b.dis"
            @click.stop="E.doAct(a.i, b.a)">{{ b.l }}</button>
        </div>
      </div>
      <i class="ac-bar" :style="{width:a.pct+'%'}"></i>
    </div>
    <div v-if="A.more" class="acts-more">+{{ A.more }} more</div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useGame } from '../stores/game'
import { E } from '../game/bridge'

const { d } = useGame()
const A = computed(() => d.acts || { hidden:false, list:[], count:0 })
function click(e){ E.actsClick(e) }
function hands(v){ E.setHands(!!v) }
</script>
