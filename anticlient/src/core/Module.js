
export class Module {
    constructor(id, name, category, description, defaultSettings = {}) {
        this.id = id
        this.name = name
        this.category = category
        this.description = description
        this.enabled = false
        this.settings = defaultSettings
        this.bind = null
        this.uiElement = null
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
}

export const categories = {
    'Combat': [],
    'Movement': [],
    'Render': [],
    'Player': [],
    'World': [],
    'Client': [],
    'Packets': [],
    'Settings': []
}

export const modules = {}

export const registerModule = (module) => {
    if (!categories[module.category]) categories[module.category] = []
    categories[module.category].push(module)
    modules[module.id] = module
    return module
}
