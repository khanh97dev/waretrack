import { reactive } from 'vue'
import { defineStore } from 'pinia'
import { setEngine } from '../game/bridge'

let tid = 0

// The engine pushes snapshots through the sink functions below;
// components read the reactive `d` tree and call `E` (game/bridge) for actions.
export const useGame = defineStore('game', () => {
  const d = reactive({
    live: {
      ready: false,
      loadFail: '',
      clock: '08:00', clockLbl: 'Live', clockLeft: '', clockPct: 0,
      speed: 1, paused: false,
      hint: true,
      soundOn: true,
      bellUnread: 0, bellDD: false,
      siteDD: false, siteDdHtml: '',
      focusSearch: 0,
      sheetOpen: false,
      building: false, town: false,
      coaching: false, coachTop: false,
      incidentT: null,
      siteMeta: null,
      pCombo: 0, pScore: 0,
      spot: null,
    },
    toasts: [],
    acts: { hidden: false, list: [], count: 0, empty: '' },
    missions: { hidden: false, list: [], ready: 0, next: 5, compactNote: '' },
    incident: null,
    coach: null,
    insp: { show: false, sel: false, html: '' },
    kpis: null,
    shift: { html: '', free: false },
    panel: null,
    track: { mode: 'in', html: '', focus: false },
    sheet: { open: false },
  })

  const put = (k, v) => {
    if (k === 'live') { Object.assign(d.live, v); return }
    if (k === 'toast') {
      const t = { ...v, id: ++tid }
      d.toasts.push(t)
      if (d.toasts.length > 3) d.toasts.shift()
      setTimeout(() => {
        const i = d.toasts.findIndex(x => x.id === t.id)
        if (i >= 0) d.toasts.splice(i, 1)
      }, 3800)
      return
    }
    d[k] = v
  }
  const sink = { put }
  const latch = { created: false }
  // App.vue calls bootEngine once with the DOM element handles
  const bootEngine = (els, createEngine) => {
    if (latch.created) return
    latch.created = true
    setEngine(createEngine({ store: sink, els }))
  }

  return { d, put, bootEngine }
})
