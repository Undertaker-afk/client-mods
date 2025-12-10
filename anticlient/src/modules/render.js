
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
    // Update settings live
    esp.settings = new Proxy(esp.settings, {
        set: (target, prop, value) => {
            target[prop] = value
            if (window.anticlient?.visuals) window.anticlient.visuals.espSettings = target
            return true
        }
    })
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
    tracers.settings = new Proxy(tracers.settings, {
        set: (target, prop, value) => {
            target[prop] = value
            if (window.anticlient?.visuals) window.anticlient.visuals.tracersSettings = target
            return true
        }
    })
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
    nameTags.settings = new Proxy(nameTags.settings, {
        set: (target, prop, value) => {
            target[prop] = value
            if (window.anticlient?.visuals) window.anticlient.visuals.nameTagsSettings = target
            return true
        }
    })
    registerModule(nameTags)

    // -- Block ESP/X-Ray --
    const blockEsp = new Module('blockesp', 'Block ESP', 'Render', 'Highlight blocks through walls', {
        blocks: ['diamond_ore', 'gold_ore', 'iron_ore', 'emerald_ore', 'ancient_debris'],
        color: '#00ff00',
        range: 32
    })
    blockEsp.lastScan = 0
    blockEsp.onToggle = (enabled) => {
        if (!window.anticlient) window.anticlient = { visuals: {} }
        if (!window.anticlient.visuals) window.anticlient.visuals = {}
        window.anticlient.visuals.blockEsp = enabled
        window.anticlient.visuals.blockEspSettings = blockEsp.settings
    }
    blockEsp.onTick = (bot) => {
        if (Date.now() - blockEsp.lastScan > 1000) {
            const blocks = bot.findBlocks({
                matching: (block) => blockEsp.settings.blocks.some(name => block.name.includes(name)),
                maxDistance: blockEsp.settings.range,
                count: 200
            })
            if (window.anticlient?.visuals) {
                window.anticlient.visuals.blockEspLocations = blocks
            }
            blockEsp.lastScan = Date.now()
        }
    }
    blockEsp.settings = new Proxy(blockEsp.settings, {
        set: (target, prop, value) => {
            target[prop] = value
            if (window.anticlient?.visuals) window.anticlient.visuals.blockEspSettings = target
            return true
        }
    })
    registerModule(blockEsp)

    // -- Storage ESP --
    const storageEsp = new Module('storageesp', 'Storage ESP', 'Render', 'See chests and containers', { color: '#FFA500' })
    storageEsp.lastScan = 0
    storageEsp.onToggle = (enabled) => {
        if (!window.anticlient?.visuals) return
        window.anticlient.visuals.storageEsp = enabled
        window.anticlient.visuals.storageEspSettings = storageEsp.settings
    }
    storageEsp.onTick = (bot) => {
        if (Date.now() - storageEsp.lastScan > 1000) {
            // Periodic scan
            const chests = bot.findBlocks({
                matching: (block) => ['chest', 'ender_chest', 'trapped_chest', 'shulker_box', 'barrel', 'furnace'].some(n => block.name.includes(n)),
                maxDistance: 64,
                count: 100
            })
            if (window.anticlient?.visuals) {
                window.anticlient.visuals.storageLocations = chests
            }
            storageEsp.lastScan = Date.now()
        }
    }
    registerModule(storageEsp)
}
