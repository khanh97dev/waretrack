<template>
  <section v-if="k" class="kpis">
    <div class="kpi glass">
      <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3 4 7.5v9L12 21l8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></svg></div>
      <div><label>{{ $t('app.kpi.stock') }}</label><div class="v"><span>{{ k.stock.v }}</span><span class="d" :class="{down:k.stock.down}">{{ k.stock.d }}</span></div><small>{{ k.stock.s }}</small></div>
    </div>
    <div class="kpi glass">
      <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg></div>
      <div><label>{{ $t('app.kpi.trucks') }}</label><div class="v"><span>{{ k.trucks.v }}</span><span class="d">{{ k.trucks.d }}</span></div><small>{{ k.trucks.s }}</small></div>
    </div>
    <div class="kpi glass">
      <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div>
      <div><label>{{ $t('app.kpi.onTime') }}</label><div class="v"><span>{{ k.onTime.v }}</span></div><small>{{ k.onTime.s }}</small></div>
    </div>
    <div class="kpi glass">
      <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V4M4 20h16M4 14h6v6M10 9h6v11M16 4h4v16"/></svg></div>
      <div style="min-width:96px"><label>{{ $t('app.kpi.occ') }}</label><div class="v"><span>{{ k.occ.v }}</span></div><div class="meter" :class="k.occ.cls"><i :style="{width:k.occ.pct+'%'}"></i></div></div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useGame } from '../stores/game'
const { d } = useGame()
const k = computed(() => d.kpis)
</script>
