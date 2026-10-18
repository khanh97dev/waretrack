// Single non-reactive handle to the engine API. Components call `E.someAction(...)`;
// before the engine boots (or for an action it lacks) the call is a no-op.
let api = null
const noop = () => undefined

export const setEngine = a => { api = a }
export const E = new Proxy({}, {
  get: (_, k) => (api && typeof api[k] === 'function' ? api[k] : noop),
})
