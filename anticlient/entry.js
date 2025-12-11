
import { loadCombatModules } from './src/modules/combat.js'
import { loadMovementModules } from './src/modules/movement.js'
import { loadRenderModules } from './src/modules/render.js'
import { loadPlayerModules } from './src/modules/player.js'
import { loadWorldModules } from './src/modules/world.js'
import { loadClientModules } from './src/modules/client.js'
import { loadPacketsModules } from './src/modules/packets.js'
import { loadNetworkModules } from './src/modules/network.js'
import { Module, modules, registerModule } from './src/core/Module.js'
import { initUI } from './src/ui/index.js'
import { logger, LogLevel } from './src/logger.js'

export default (mod) => {
    // 0. Cleanup Previous Instance
    if (window.anticlient && window.anticlient.cleanup) {
        try {
            window.anticlient.cleanup()
        } catch (e) { console.error(e) }
    }

    logger.info('Initializing Modular Architecture...')

    // 1. Load Modules
    loadCombatModules()
    loadMovementModules()
    loadRenderModules()
    loadPlayerModules()
    loadWorldModules()
    loadClientModules()
    loadPacketsModules()
    loadNetworkModules()

    // Load Logger Settings Module
    const loggerSettings = new Module('loggersettings', 'Logger Settings', 'Settings',
        'Configure logging level (0=Debug, 1=Info, 2=Warning, 3=Error, 4=None)',
        { logLevel: 0 } // DEBUG by default
    )
    loggerSettings.enabled = true
    loggerSettings.onToggle = () => {}
    loggerSettings.onTick = () => {}
    loggerSettings.onSettingChanged = (key, newValue) => {
        if (key === 'logLevel') {
            logger.setLevel(newValue)
            logger.info(`Log level changed to ${newValue}`)
        }
    }
    registerModule(loggerSettings)

    logger.info(`Modules loaded. Total: ${Object.keys(modules).length}`)

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
