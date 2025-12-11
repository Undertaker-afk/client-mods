
export class Module {
    constructor(id, name, category, description, defaultSettings = {}, settingsMetadata = {}) {
        this.id = id
        this.name = name
        this.category = category
        this.description = description
        this.enabled = false
        this.bind = null
        this.uiElement = null
        this.settingsMetadata = settingsMetadata // { settingKey: { type: 'dropdown', options: [...] } }

        // Wrap settings in a Proxy to detect changes
        this.settings = new Proxy(defaultSettings, {
            set: (target, prop, value) => {
                const oldValue = target[prop]
                target[prop] = value

                // Call onSettingChanged if it exists and value actually changed
                if (oldValue !== value && this.onSettingChanged) {
                    this.onSettingChanged(prop, value, oldValue)
                }

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
        this.onToggle(this.enabled)
    }

    onToggle(enabled) { }
    onTick(bot) { }
    onRender(bot) { }
    onSettingChanged(key, newValue, oldValue) { }
}

export const categories = {
    'Combat': [],
    'Movement': [],
    'Render': [],
    'Player': [],
    'World': [],
    'Settings': [],
    'Packets': [],
    'Network': [],
    'Scripting': []
}

export const modules = {}

export const registerModule = (module) => {
    if (!categories[module.category]) categories[module.category] = []
    categories[module.category].push(module)
    modules[module.id] = module
    return module
}
