
import { Module, registerModule } from '../core/Module.js'

export const loadClientModules = () => {
    // -- Settings Module --
    // We add a 'Settings' module that acts as a container for client-wide configs
    const settings = new Module('client_settings', 'Settings', 'Client', 'Client configuration', {
        theme: 'Default',
        repo: 'Undertaker-afk/client-mods' // For display mainly
    })

    // To handle special actions like "Unload" or "Update", we can treat them as boolean toggles that reset themselves
    // or we'd ideally have a button widget. For now, we will add fake boolean toggles.
    settings.settings.unloadClient = false
    settings.settings.checkUpdates = false

    // We can monitor these settings in an interval or just on change (if we had an onChange hook per setting)
    // Since we don't have individual setting callbacks yet, we can't easily trigger just on click without UI support for buttons.
    // However, we can hack it: 

    // We will inject logic into the toggle method to "intercept" the user creating this module interaction
    // But this module is "passive". 

    // Let's implement a loop check for these "Action" booleans in onTick, even though it's not a bot hack.
    // But onTick runs often.

    // Monitor changes
    let lastTheme = settings.settings.theme

    settings.onTick = (bot) => {
        // Handle Theme Change
        const currentTheme = settings.settings.theme
        if (currentTheme !== lastTheme) {
            lastTheme = currentTheme
            if (window.anticlient && window.anticlient.ui && window.anticlient.ui.setTheme) {
                window.anticlient.ui.setTheme(currentTheme)
            }
        }

        // Handle Unload
        if (settings.settings.unloadClient) {
            settings.settings.unloadClient = false // Reset
            // Use the mod system API to disable the mod
            if (window.mcraft && window.mcraft.setEnabledModAction) {
                // Assuming mod name is 'anticlient' (or derived from repo name)
                const modName = 'Undertaker-afk/client-mods' // Adjust if needed
                window.mcraft.setEnabledModAction(modName, false)
            } else {
                // Fallback
                if (window.anticlient && window.anticlient.cleanup) {
                    window.anticlient.cleanup()
                }
            }
        }

        // Handle Update Check
        if (settings.settings.checkUpdates) {
            settings.settings.checkUpdates = false // Reset
            if (window.mcraft && window.mcraft.installOrUpdateMod && window.mcraft.activateMod) {
                // Trigger self-update flow
                // This usually requires re-fetching the repo config or file
                // For now, simpler approach: Just open the UI mod page or trigger reload if supported
                // window.location.reload() // Gross, but effective for hot-reload if files changed
                console.log('Update requested via UI')
                // If we have access to the specific update function:
                // window.mcraft.callMethodAction('Undertaker-afk/client-mods', 'main', 'update')

                // Simulating checking updates by logging for now as we lack direct handle to 'mod' object here easily
                // unless we passed it down from loading.
                alert('To update: Please use the Mod Manager UI update button for now.')
            } else {
                const repoUrl = 'https://github.com/' + settings.settings.repo
                window.open(repoUrl, '_blank')
            }
        }
    }

    registerModule(settings)
}
