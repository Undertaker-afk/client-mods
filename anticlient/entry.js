
import { Module, modules, registerModule, categories, ALL_CATEGORIES, moduleLoaders, updateSharedEntityCache, eventBus, profiles, PHYSICS } from './src/core/Module.js'
import { initUI } from './src/ui/index.js'
import { logger, LogLevel } from './src/logger.js'

// Auto-import all module loaders
import { loadCombatModules } from './src/modules/combat.js'
import { loadMovementModules } from './src/modules/movement.js'
import { loadRenderModules } from './src/modules/render.js'
import { loadPlayerModules } from './src/modules/player.js'
import { loadWorldModules } from './src/modules/world.js'
import { loadClientModules } from './src/modules/client.js'
import { loadPacketsModules } from './src/modules/packets.js'
import { loadProjectileModules } from './src/modules/projectile.js'

// Register all known loaders
registerModuleLoader(loadCombatModules)
registerModuleLoader(loadMovementModules)
registerModuleLoader(loadRenderModules)
registerModuleLoader(loadPlayerModules)
registerModuleLoader(loadWorldModules)
registerModuleLoader(loadClientModules)
registerModuleLoader(loadPacketsModules)
registerModuleLoader(loadProjectileModules)

const VERSION = '2.0.0'
const TPS = PHYSICS.TPS

export default (mod) => {
    // Guard against double-init
    if (window.anticlient?._initialized) {
        logger.warning('Anticlient already initialized, cleaning up previous instance')
        window.anticlient.cleanup()
    }

    // Cleanup previous instance
    if (window.anticlient?.cleanup) {
        try { window.anticlient.cleanup() } catch (e) { console.error(e) }
    }

    // Teardown registry
    window.anticlient = window.anticlient || {}
    window.anticlient._teardownCallbacks = []
    window.anticlient._initialized = true
    window.anticlient._version = VERSION
    window.anticlient._build = Date.now()

    const registerTeardown = (fn) => {
        window.anticlient._teardownCallbacks.push(fn)
    }

    // Stable public API
    window.anticlient.api = {
        get version() { return VERSION },
        getModule: (id) => modules[id],
        toggleModule: (id) => { const m = modules[id]; if (m) m.toggle() },
        enableAll: () => { for (const m of Object.values(modules)) { if (!m.enabled) m.toggle() } },
        disableAll: () => { for (const m of Object.values(modules)) { if (m.enabled) m.toggle() } },
        getCategories: () => ALL_CATEGORIES,
        getModules: () => modules,
        getEventBus: () => eventBus,
        getProfiles: () => profiles,
        cleanup: () => window.anticlient.cleanup()
    }

    // Load persisted logger level
    try {
        const savedLogLevel = localStorage.getItem('anticlient:logLevel')
        if (savedLogLevel !== null) {
            logger.setLevel(parseInt(savedLogLevel))
        }
    } catch (e) {}

    logger.info(`Initializing Anticlient v${VERSION}...`)

    // 1. Load Modules via registry
    for (const loader of moduleLoaders) {
        try { loader() } catch (e) { logger.error('Module loader failed:', e) }
    }

    // Logger Settings Module
    const loggerSettings = new Module('loggersettings', 'Logger Settings', 'Settings',
        'Configure logging level (0=Debug, 1=Info, 2=Warning, 3=Error, 4=None)',
        { logLevel: logger.level }
    )
    loggerSettings.enabled = true
    loggerSettings.onToggle = () => {}
    loggerSettings.onTick = () => {}
    loggerSettings.onSettingChanged = (key, newValue) => {
        if (key === 'logLevel') {
            logger.setLevel(newValue)
            try { localStorage.setItem('anticlient:logLevel', String(newValue)) } catch (e) {}
        }
    }
    registerModule(loggerSettings)

    logger.info(`Modules loaded. Total: ${Object.keys(modules).length}`)

    // 2. Initialize UI
    const cleanupUI = initUI()
    registerTeardown(cleanupUI)

    // 3. Bot tracking
    let bot = undefined
    let lastBotIdentity = null
    let loopRunning = true

    const bindBotEvents = (currentBot) => {
        if (!currentBot) return
        if (currentBot._anticlientBound) return
        currentBot._anticlientBound = true

        if (currentBot._client) {
            currentBot._client.on('end', () => {
                bot = undefined
                lastBotIdentity = null
                eventBus.emit('bot:disconnect')
            })
            currentBot._client.on('login', () => {
                eventBus.emit('bot:respawn')
                for (const mod of Object.values(modules)) {
                    if (mod.enabled && mod.onRespawn) {
                        try { mod.onRespawn(bot) } catch (e) {}
                    }
                }
            })
        }

        currentBot.on('spawn', () => {
            eventBus.emit('bot:respawn')
            for (const mod of Object.values(modules)) {
                if (mod.enabled && mod.onRespawn) {
                    try { mod.onRespawn(bot) } catch (e) {}
                }
            }
        })
    }

    // Shared physics tick accumulator
    let tickAccumulator = 0
    let lastTickTime = performance.now()
    const FIXED_DT = 1000 / TPS // 50ms

    const loop = () => {
        if (!loopRunning) return

        // Re-acquire bot if identity changed
        const currentBot = window.bot
        if (currentBot && currentBot !== bot) {
            bot = currentBot
            if (bot !== lastBotIdentity) {
                lastBotIdentity = bot
                bindBotEvents(bot)
                eventBus.emit('bot:connect', bot)
                for (const mod of Object.values(modules)) {
                    if (mod.enabled && mod.onWorldChange) {
                        try { mod.onWorldChange(bot) } catch (e) {}
                    }
                }
            }
        }
        if (!currentBot) {
            bot = undefined
            requestAnimationFrame(loop)
            return
        }

        const now = performance.now()
        tickAccumulator += now - lastTickTime
        lastTickTime = now

        // Fixed-timestep game logic tick
        while (tickAccumulator >= FIXED_DT) {
            tickAccumulator -= FIXED_DT

            // Update shared entity cache once per tick
            updateSharedEntityCache(bot)

            // Run onTick for all enabled modules with error isolation
            for (const mod of Object.values(modules)) {
                if (!mod.enabled) continue
                try {
                    mod.onTick(bot)
                    mod._errorCount = 0
                } catch (e) {
                    mod._errorCount++
                    logger.error(`[${mod.id}] onTick error (${mod._errorCount}/${mod._maxErrors}):`, e)
                    if (mod._errorCount >= mod._maxErrors) {
                        logger.error(`[${mod.id}] Auto-disabling after ${mod._maxErrors} consecutive errors`)
                        mod.toggle()
                    }
                }
            }
        }

        // Per-frame render pass (visuals)
        for (const mod of Object.values(modules)) {
            if (!mod.enabled) continue
            try {
                if (mod.onFrame) mod.onFrame(bot)
                if (mod.onRender) mod.onRender(bot)
            } catch (e) {
                // Render errors should not auto-disable
                if (mod._errorCount < mod._maxErrors) {
                    logger.debug(`[${mod.id}] onRender error:`, e)
                }
            }
        }

        requestAnimationFrame(loop)
    }
    loop()

    // 4. Panic hotkey (Pause/Break or Ctrl+Backslash to disable all)
    window.addEventListener('keydown', (e) => {
        if ((e.key === 'Pause' || e.key === 'ScrollLock') ||
            (e.ctrlKey && e.code === 'Backslash')) {
            e.preventDefault()
            let disabledCount = 0
            for (const mod of Object.values(modules)) {
                if (mod.enabled) {
                    mod.toggle()
                    disabledCount++
                }
            }
            logger.warning(`PANIC: Disabled ${disabledCount} modules`)
        }
    })

    // 5. Protocol version detection
    const detectProtocolVersion = (currentBot) => {
        if (!currentBot || !currentBot.version) return
        try {
            const protocolVersion = currentBot.version
            window.anticlient._protocolVersion = protocolVersion
            eventBus.emit('protocol:detected', protocolVersion)

            // Feature-detect key thresholds
            const isModern = parseInt(protocolVersion) >= 735 // 1.16+
            const isLegacy = parseInt(protocolVersion) < 340 // pre-1.12
            window.anticlient._protocolFlags = { isModern, isLegacy }

            logger.info(`Detected protocol version: ${protocolVersion} (${isModern ? 'modern' : isLegacy ? 'legacy' : 'standard'})`)
        } catch (e) {}
    }

    // Run detection on bot connect
    eventBus.on('bot:connect', detectProtocolVersion)

    // 5. Canonical cleanup function
    const cleanup = () => {
        loopRunning = false

        // Restore all module state
        for (const mod of Object.values(modules)) {
            if (mod.enabled) {
                try { mod.onDisable(bot) } catch (e) {}
                mod.enabled = false
            }
            mod._clearAllTimers()
            mod._removeAllListeners()
        }

        // Run all registered teardown callbacks
        for (const fn of window.anticlient._teardownCallbacks) {
            try { fn() } catch (e) {}
        }
        window.anticlient._teardownCallbacks = []

        // Restore bot attack if overridden
        if (bot && bot._originalAttack) {
            bot.attack = bot._originalAttack
            delete bot._originalAttack
        }

        cleanupUI()
        logger.info('Anticlient cleaned up.')
    }

    window.anticlient.cleanup = cleanup
    registerTeardown(() => {
        if (bot?._client) {
            bot._client._anticlientBound = false
        }
    })

    return {
        deactivate: () => {
            cleanup()
        }
    }
}

// For console access
if (typeof window !== 'undefined') {
    window.anticlient = window.anticlient || {}
    window.anticlient.modules = modules
}
