
import { logger } from '../logger.js'

export const CATEGORY_COMBAT = 'Combat'
export const CATEGORY_MOVEMENT = 'Movement'
export const CATEGORY_RENDER = 'Render'
export const CATEGORY_PLAYER = 'Player'
export const CATEGORY_WORLD = 'World'
export const CATEGORY_SETTINGS = 'Settings'
export const CATEGORY_PACKETS = 'Packets'
export const CATEGORY_SCRIPTING = 'Scripting'

export class Module {
    constructor(id, name, category, description, defaultSettings = {}, settingsMetadata = {}) {
        this.id = id
        this.name = name
        this.category = category
        this.description = description
        this.enabled = false
        this.bind = null
        this.uiElement = null
        this.settingsMetadata = settingsMetadata
        this.customKeybind = false
        this._timers = []
        this._listeners = []
        this._state = {}
        this._errorCount = 0
        this._maxErrors = 5

        // Load persisted settings
        const persisted = this._loadPersistedSettings()
        const initialSettings = { ...defaultSettings, ...persisted }

        // Deep proxy for nested settings
        this.settings = this._createDeepProxy(initialSettings)

        // Restore enabled state from persistence
        if (persisted && persisted._enabled === true) {
            // Don't auto-enable modules that touch the network
            const dangerousCategories = [CATEGORY_PACKETS]
            if (!dangerousCategories.includes(category)) {
                this.enabled = true
                this._wasPersisted = true
            }
        }
    }

    _loadPersistedSettings() {
        try {
            const key = `anticlient:module:${this.id}`
            const data = localStorage.getItem(key)
            return data ? JSON.parse(data) : null
        } catch (e) {
            return null
        }
    }

    _savePersistedSettings() {
        try {
            const key = `anticlient:module:${this.id}`
            const toSave = { ...this.settings, _enabled: this.enabled }
            localStorage.setItem(key, JSON.stringify(toSave))
        } catch (e) {
            // localStorage might be full or unavailable
        }
    }

    _createDeepProxy(obj, path = '') {
        const self = this
        return new Proxy(obj, {
            set: (target, prop, value) => {
                const oldValue = target[prop]
                if (oldValue === value) return true

                // Validate if metadata exists
                const meta = self.settingsMetadata[prop]
                if (meta) {
                    if (meta.type === 'number' || meta.type === 'slider') {
                        const num = Number(value)
                        if (isNaN(num)) return true
                        if (meta.min !== undefined && num < meta.min) value = meta.min
                        if (meta.max !== undefined && num > meta.max) value = meta.max
                    } else if (meta.type === 'dropdown' && meta.options) {
                        if (!meta.options.includes(value)) return true
                    }
                }

                target[prop] = value

                // Make nested objects reactive
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    target[prop] = self._createDeepProxy(value, path ? `${path}.${prop}` : prop)
                }

                if (oldValue !== value && self.onSettingChanged) {
                    self.onSettingChanged(prop, value, oldValue)
                }

                self._savePersistedSettings()
                return true
            }
        })
    }

    toggle() {
        this.enabled = !this.enabled
        if (this.uiElement) {
            if (this.enabled) this.uiElement.classList.add('enabled')
            else this.uiElement.classList.remove('enabled')
        }

        // Call onEnable/onDisable if defined
        if (this.enabled && this.onEnable) {
            try { this.onEnable(window.bot) } catch (e) { logger.error(`[${this.id}] onEnable failed:`, e) }
        } else if (!this.enabled && this.onDisable) {
            try { this.onDisable(window.bot) } catch (e) { logger.error(`[${this.id}] onDisable failed:`, e) }
            this._clearAllTimers()
            this._removeAllListeners()
            this._state = {}
            this._errorCount = 0
        }

        this.onToggle(this.enabled)
        this._savePersistedSettings()
    }

    // Timer management
    _addTimer(timerId) {
        this._timers.push(timerId)
    }

    addTimeout(callback, delay) {
        const id = setTimeout(() => {
            this._timers = this._timers.filter(t => t !== id)
            callback()
        }, delay)
        this._timers.push(id)
        return id
    }

    addInterval(callback, intervalMs) {
        const id = setInterval(callback, intervalMs)
        this._timers.push(id)
        return id
    }

    _clearAllTimers() {
        for (const id of this._timers) {
            clearTimeout(id)
            clearInterval(id)
        }
        this._timers = []
    }

    // Listener management
    addListener(target, event, handler, options) {
        target.addEventListener(event, handler, options)
        this._listeners.push({ target, event, handler, options })
    }

    removeListener(target, event, handler, options) {
        target.removeEventListener(event, handler, options)
        this._listeners = this._listeners.filter(l =>
            !(l.target === target && l.event === event && l.handler === handler)
        )
    }

    _removeAllListeners() {
        for (const { target, event, handler, options } of this._listeners) {
            target.removeEventListener(event, handler, options)
        }
        this._listeners = []
    }

    // State management
    get state() { return this._state }
    set state(v) { this._state = v; return v }

    // Standard hooks
    onToggle(enabled) { }
    onTick(bot) { }
    onRender(bot) { }
    onFrame(bot) { }
    onSettingChanged(key, newValue, oldValue) { }
    onWorldChange(bot) { }
    onRespawn(bot) { }
    onEnable(bot) { }
    onDisable(bot) { }
}

// Event bus for inter-module communication
export const eventBus = {
    _listeners: {},

    on(event, callback) {
        if (!this._listeners[event]) this._listeners[event] = []
        this._listeners[event].push(callback)
        return () => this.off(event, callback)
    },

    off(event, callback) {
        if (this._listeners[event]) {
            this._listeners[event] = this._listeners[event].filter(cb => cb !== callback)
        }
    },

    emit(event, ...args) {
        if (this._listeners[event]) {
            for (const cb of this._listeners[event]) {
                try { cb(...args) } catch (e) { logger.error(`[EventBus:${event}]`, e) }
            }
        }
    }
}

// Module profiles system
export const profiles = {
    _storage: {},

    save(name) {
        const profile = {}
        for (const [id, mod] of Object.entries(modules)) {
            profile[id] = { enabled: mod.enabled, settings: { ...mod.settings } }
        }
        profiles._storage[name] = profile
        try { localStorage.setItem('anticlient:profiles', JSON.stringify(profiles._storage)) } catch (e) {}
        eventBus.emit('profiles:saved', name)
    },

    load(name) {
        const profile = profiles._storage[name]
        if (!profile) return false
        for (const [id, mod] of Object.entries(modules)) {
            const saved = profile[id]
            if (!saved) continue
            if (mod.enabled !== saved.enabled) {
                mod.toggle()
            }
            Object.assign(mod.settings, saved.settings)
        }
        eventBus.emit('profiles:loaded', name)
        return true
    },

    delete(name) {
        delete profiles._storage[name]
        try { localStorage.setItem('anticlient:profiles', JSON.stringify(profiles._storage)) } catch (e) {}
    },

    list() {
        return Object.keys(profiles._storage)
    },

    _loadFromStorage() {
        try {
            const data = localStorage.getItem('anticlient:profiles')
            if (data) profiles._storage = JSON.parse(data)
        } catch (e) {}
    }
}

// Category constants array
export const ALL_CATEGORIES = [
    CATEGORY_COMBAT, CATEGORY_MOVEMENT, CATEGORY_RENDER,
    CATEGORY_PLAYER, CATEGORY_WORLD, CATEGORY_SETTINGS,
    CATEGORY_PACKETS, CATEGORY_SCRIPTING
]

// Legacy categories map for UI compatibility
export const categories = {}
ALL_CATEGORIES.forEach(cat => { categories[cat] = [] })

export const modules = {}

// Module discovery registry
export const moduleLoaders = []

export const registerModuleLoader = (loader) => {
    moduleLoaders.push(loader)
}

export const registerModule = (module) => {
    if (!categories[module.category]) categories[module.category] = []
    categories[module.category].push(module)
    modules[module.id] = module
    return module
}

// Shared helpers
export const getTargetFilter = (targetType) => {
    if (targetType === 'players') return (e) => e.type === 'player'
    if (targetType === 'mobs') return (e) => (e.type === 'mob' || e.type === 'hostile' || e.type === 'animal')
    return (e) => (e.type === 'player' || e.type === 'mob' || e.type === 'hostile' || e.type === 'animal')
}

export const distanceToSq = (p1, p2) => {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    const dz = p1.z - p2.z
    return dx * dx + dy * dy + dz * dz
}

// Shared entity list computed once per tick
export let sharedEntityCache = {
    tick: 0,
    players: [],
    mobs: [],
    all: [],
    nearestPlayer: null,
    nearestMob: null
}

export const updateSharedEntityCache = (bot) => {
    const tick = sharedEntityCache.tick + 1
    const players = []
    const mobs = []
    let nearestPlayer = null
    let nearestMob = null
    let nearestPlayerDist = Infinity
    let nearestMobDist = Infinity

    if (bot && bot.entities) {
        for (const [id, entity] of Object.entries(bot.entities)) {
            if (!entity || !entity.position || entity === bot.entity) continue
            if (entity.type === 'player') {
                players.push(entity)
                const distSq = distanceToSq(bot.entity.position, entity.position)
                if (distSq < nearestPlayerDist) {
                    nearestPlayerDist = distSq
                    nearestPlayer = entity
                }
            } else if (entity.type === 'mob' || entity.type === 'hostile' || entity.type === 'animal') {
                mobs.push(entity)
                const distSq = distanceToSq(bot.entity.position, entity.position)
                if (distSq < nearestMobDist) {
                    nearestMobDist = distSq
                    nearestMob = entity
                }
            }
        }
    }

    sharedEntityCache = { tick, players, mobs, all: [...players, ...mobs], nearestPlayer, nearestMob }
}

// Physics constants
export const PHYSICS = {
    GRAVITY: 0.05,
    DRAG: 0.99,
    JUMP_VELOCITY: 0.42,
    CRIT_OFFSET: 0.0625,
    TPS: 20
}
