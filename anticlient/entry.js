
import { loadCombatModules } from './src/modules/combat.js'
import { loadMovementModules } from './src/modules/movement.js'
import { loadRenderModules } from './src/modules/render.js'
import { loadPlayerModules } from './src/modules/player.js'
import { loadWorldModules } from './src/modules/world.js'
import { loadClientModules } from './src/modules/client.js'
import { loadPacketsModules } from './src/modules/packets.js'
import { modules } from './src/core/Module.js'
import { initUI } from './src/ui/index.js'

export default (mod) => {
    // 0. Cleanup Previous Instance
    if (window.anticlient && window.anticlient.cleanup) {
        try {
            window.anticlient.cleanup()
        } catch (e) { console.error(e) }
    }

    console.log('[Anticlient] Initializing Modular Architecture...')

    // 1. Load Modules
    loadCombatModules()
    loadMovementModules()
    loadRenderModules()
    loadPlayerModules()
    loadWorldModules()
    loadClientModules()
    loadPacketsModules()

    // 2. Initialize UI
    const cleanupUI = initUI()

    // 3. Start Main Loop
    let bot = undefined
    let loopRunning = true
    const loop = () => {
        if (!loopRunning) return
        if (!bot && window.bot) bot = window.bot

        if (bot) {
            Object.values(modules).forEach(mod => {
                if (mod.enabled) mod.onTick(bot)
            })
        }
        requestAnimationFrame(loop)
    }
    loop()

    // Register global cleanup
    if (!window.anticlient) window.anticlient = {}
    window.anticlient.cleanup = () => {
        cleanupUI()
        loopRunning = false
        console.log('[Anticlient] Cleaned up.')
    }

    return {
        deactivate: () => {
            window.anticlient.cleanup()
        }
    }
}
