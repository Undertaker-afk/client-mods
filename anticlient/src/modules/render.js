
import { Module, registerModule } from '../core/Module.js'

export const loadRenderModules = () => {
    const fullbright = new Module('fullbright', 'Fullbright', 'Render', 'See in the dark', { gamma: 1.0 })
    registerModule(fullbright)

    // -- ESP (Enhanced) --
    const esp = new Module('esp', 'ESP', 'Render', 'See entities through walls', {
        playerColor: '#00ffff',
        mobColor: '#ff0000',
        wireframe: true,
        showDistance: true,
        distanceColor: '#ffffff'
    })
    esp.onToggle = (enabled) => {
        if (!window.anticlient) window.anticlient = { visuals: {} }
        if (!window.anticlient.visuals) window.anticlient.visuals = {}
        window.anticlient.visuals.esp = enabled
        window.anticlient.visuals.espSettings = esp.settings
    }
    esp.onSettingChanged = (key, newValue) => {
        if (window.anticlient?.visuals) {
            window.anticlient.visuals.espSettings = esp.settings
        }
    }
    registerModule(esp)

    // -- Tracers (Enhanced) --
    const tracers = new Module('tracers', 'Tracers', 'Render', 'Draw lines to entities', { 
        color: '#ffffff',
        showDistance: true,
        maxDistance: 64
    })
    tracers.onToggle = (enabled) => {
        if (!window.anticlient) window.anticlient = { visuals: {} }
        if (!window.anticlient.visuals) window.anticlient.visuals = {}
        window.anticlient.visuals.tracers = enabled
        window.anticlient.visuals.tracersSettings = tracers.settings
    }
    tracers.onSettingChanged = () => {
        if (window.anticlient?.visuals) {
            window.anticlient.visuals.tracersSettings = tracers.settings
        }
    }
    registerModule(tracers)

    // -- NameTags --
    const nameTags = new Module('nametags', 'NameTags', 'Render', 'Show entity names above heads', {
        range: 64,
        showHealth: true,
        showDistance: true
    })
    nameTags.onToggle = (enabled) => {
        if (!window.anticlient) window.anticlient = { visuals: {} }
        if (!window.anticlient.visuals) window.anticlient.visuals = {}
        window.anticlient.visuals.nameTags = enabled
        window.anticlient.visuals.nameTagsSettings = nameTags.settings
    }
    nameTags.onSettingChanged = () => {
        if (window.anticlient?.visuals) {
            window.anticlient.visuals.nameTagsSettings = nameTags.settings
        }
    }
    registerModule(nameTags)

    // -- Block ESP/X-Ray --
    const blockEsp = new Module('blockesp', 'Block ESP', 'Render', 'Highlight blocks through walls', {
        blocks: ['diamond_ore', 'gold_ore', 'iron_ore', 'emerald_ore', 'ancient_debris'],
        color: '#00ff00',
        range: 32
    })
    blockEsp.lastScan = 0
    blockEsp.onToggle = (enabled) => {
        const log = window.anticlientLogger?.module('BlockESP')
        if (log) log.info(`Block ESP ${enabled ? 'enabled' : 'disabled'}`)

        if (!window.anticlient) window.anticlient = { visuals: {} }
        if (!window.anticlient.visuals) window.anticlient.visuals = {}
        window.anticlient.visuals.blockEsp = enabled
        window.anticlient.visuals.blockEspSettings = blockEsp.settings

        if (log && enabled) {
            log.info(`Searching for blocks: ${blockEsp.settings.blocks.join(', ')}`)
            log.info(`Range: ${blockEsp.settings.range} blocks`)
        }
    }
    blockEsp.onTick = (bot) => {
        if (!bot || !bot.entity || !bot.entity.position || !bot.findBlocks) return

        if (Date.now() - blockEsp.lastScan > 1000) {
            const log = window.anticlientLogger?.module('BlockESP')

            try {
                // Additional safety check
                if (!bot.entity || !bot.entity.position) {
                    blockEsp.lastScan = Date.now()
                    return
                }

                const blocks = bot.findBlocks({
                    matching: (block) => blockEsp.settings.blocks.some(name => block.name.includes(name)),
                    maxDistance: blockEsp.settings.range,
                    count: 200
                })

                if (log) log.debug(`Found ${blocks.length} blocks`)

                if (window.anticlient?.visuals) {
                    window.anticlient.visuals.blockEspLocations = blocks
                }
            } catch (e) {
                // Silently fail - bot not ready yet
                if (log && log.level <= 0) log.debug('Bot not ready for block scanning')
            }

            blockEsp.lastScan = Date.now()
        }
    }
    blockEsp.onSettingChanged = () => {
        if (window.anticlient?.visuals) {
            window.anticlient.visuals.blockEspSettings = blockEsp.settings
        }
    }
    registerModule(blockEsp)

    // -- Storage ESP --
    const storageEsp = new Module('storageesp', 'Storage ESP', 'Render', 'See chests and containers', { color: '#FFA500' })
    storageEsp.lastScan = 0
    storageEsp.onToggle = (enabled) => {
        if (!window.anticlient?.visuals) return
        window.anticlient.visuals.storageEsp = enabled
        window.anticlient.visuals.storageEspSettings = storageEsp.settings
    }
    storageEsp.onSettingChanged = () => {
        if (window.anticlient?.visuals) {
            window.anticlient.visuals.storageEspSettings = storageEsp.settings
        }
    }
    storageEsp.onTick = (bot) => {
        if (!bot || !bot.entity || !bot.entity.position || !bot.findBlocks) return

        if (Date.now() - storageEsp.lastScan > 1000) {
            try {
                // Additional safety check
                if (!bot.entity || !bot.entity.position) {
                    storageEsp.lastScan = Date.now()
                    return
                }

                // Periodic scan
                const chests = bot.findBlocks({
                    matching: (block) => ['chest', 'ender_chest', 'trapped_chest', 'shulker_box', 'barrel', 'furnace'].some(n => block.name.includes(n)),
                    maxDistance: 64,
                    count: 100
                })
                if (window.anticlient?.visuals) {
                    window.anticlient.visuals.storageLocations = chests
                }
            } catch (e) {
                // Silently fail if bot not ready
            }
            storageEsp.lastScan = Date.now()
        }
    }
    registerModule(storageEsp)
}
