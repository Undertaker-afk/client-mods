
import { Module, registerModule } from '../core/Module.js'

export const loadClientModules = () => {
    // -- Settings Module --
    // We add a 'Settings' module that acts as a container for client-wide configs
    const settings = new Module('client_settings', 'Client Settings', 'Settings', 'Client configuration', {
        theme: 'Default',
        repo: 'Undertaker-afk/client-mods' // For display mainly
    })

    // Store action handlers on the module for UI to call
    settings.actions = {
        update: async () => {
            try {
                // Try to update the mod using the mod system API
                if (window.mcraft && window.mcraft.installModByName) {
                    // Try to find the repository URL from all repositories
                    let repoUrl = settings.settings.repo
                    if (window.getAllRepositories) {
                        try {
                            const repos = await window.getAllRepositories()
                            // Look for a repo that contains the anticlient mod
                            const repo = repos.find(r => 
                                r.packages && r.packages.some(p => p.name === 'anticlient')
                            )
                            if (repo) {
                                repoUrl = repo.url
                            } else {
                                // Fallback: try GitHub slug format
                                repoUrl = settings.settings.repo
                            }
                        } catch (e) {
                            console.warn('Could not fetch repositories, using default:', e)
                        }
                    }
                    await window.mcraft.installModByName(repoUrl, 'anticlient')
                    // After update, the mod will need a reload - show notification
                    if (window.mcraft && window.mcraft.showNotification) {
                        window.mcraft.showNotification('Mod updated', 'Please reload the page to apply changes', false)
                    } else {
                        alert('Mod updated! Please reload the page to apply changes.')
                    }
                } else {
                    // Fallback: open GitHub repo for manual update
                    const repoUrl = 'https://github.com/' + settings.settings.repo
                    window.open(repoUrl, '_blank')
                    alert('Update API not available. Please use the Mod Manager UI to update, or visit the GitHub repository.')
                }
            } catch (error) {
                console.error('Failed to update mod:', error)
                alert('Failed to update mod: ' + (error.message || String(error)))
            }
        },
        unload: async () => {
            try {
                // Use the mod system API to disable/unload the mod
                if (window.mcraft && window.mcraft.setEnabledModAction) {
                    const modName = 'anticlient'
                    await window.mcraft.setEnabledModAction(modName, false)
                } else {
                    // Fallback: cleanup manually
                    if (window.anticlient && window.anticlient.cleanup) {
                        window.anticlient.cleanup()
                    }
                }
            } catch (error) {
                console.error('Failed to unload mod:', error)
                alert('Failed to unload mod: ' + error.message)
            }
        }
    }

    // Monitor theme changes
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
    }

    registerModule(settings)
}
