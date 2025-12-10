
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
}
