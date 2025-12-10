
import { loadCombatModules } from './src/modules/combat.js'
import { loadMovementModules } from './src/modules/movement.js'
import { loadRenderModules } from './src/modules/render.js'
import { loadPlayerModules } from './src/modules/player.js'
import { modules } from './src/core/Module.js'
import { initUI } from './src/ui/index.js'

export default (mod) => {
    console.log('[Anticlient] Initializing Modular Architecture...')

    // 1. Load Modules
    loadCombatModules()
    loadMovementModules()
    loadRenderModules()
    loadPlayerModules()

    // 2. Initialize UI
    initUI()

    // 3. Start Main Loop
    let bot = undefined
    const loop = () => {
        if (!bot && window.bot) bot = window.bot

        if (bot) {
            Object.values(modules).forEach(mod => {
                if (mod.enabled) mod.onTick(bot)
            })
        }
        requestAnimationFrame(loop)
    }
    loop()
}
