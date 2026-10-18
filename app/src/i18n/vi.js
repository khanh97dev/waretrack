import app from './parts/app.vi.js'
import data from './parts/data.vi.js'
import world from './parts/world.vi.js'
import ops from './parts/ops.vi.js'
import hud from './parts/hud.vi.js'
import menu from './parts/menu.vi.js'

export default { ...app, ...data, ...world, ...ops, ...hud, ...menu }
