
import { Module, registerModule } from '../core/Module.js'

export const loadRenderModules = () => {
    const fullbright = new Module('fullbright', 'Fullbright', 'Render', 'See in the dark', { gamma: 1.0 })
    registerModule(fullbright)

    const esp = new Module('esp', 'ESP', 'Render', 'See entities through walls', {
        playerColor: '#00ffff',
        mobColor: '#ff0000',
        wireframe: true
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

    const tracers = new Module('tracers', 'Tracers', 'Render', 'Draw lines to entities', { color: '#ffffff' })
    tracers.onToggle = (enabled) => {
        if (!window.anticlient) window.anticlient = { visuals: {} }
        if (!window.anticlient.visuals) window.anticlient.visuals = {}
        window.anticlient.visuals.tracers = enabled
    }
    registerModule(tracers)

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
