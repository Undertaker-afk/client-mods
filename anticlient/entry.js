
import { loadCombatModules } from './src/modules/combat.js'
import { loadMovementModules } from './src/modules/movement.js'
import { loadRenderModules } from './src/modules/render.js'
import { loadPlayerModules } from './src/modules/player.js'
import { loadWorldModules } from './src/modules/world.js'
import { loadClientModules } from './src/modules/client.js'
import { loadPacketsModules } from './src/modules/packets.js'
import { modules, registerModule } from './src/core/Module.js'
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

    // Load Logger Settings Module
    const loggerSettings = registerModule({
        id: 'loggersettings',
        name: 'Logger Settings',
        category: 'Settings',
        description: 'Configure logging level (0=Debug, 1=Info, 2=Warning, 3=Error, 4=None)',
        enabled: true,
        settings: {
            logLevel: 1 // INFO by default
        },
        onToggle: () => {},
        onTick: () => {}
    })

    // Watch for log level changes
    let lastLogLevel = loggerSettings.settings.logLevel
    setInterval(() => {
        if (loggerSettings.settings.logLevel !== lastLogLevel) {
            lastLogLevel = loggerSettings.settings.logLevel
            logger.setLevel(lastLogLevel)
        }
    }, 100)

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
