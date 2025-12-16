
import { Module, registerModule } from '../core/Module.js'

export const loadWorldModules = () => {
    // -- Nuker (Enhanced) --
    const nuker = new Module('nuker', 'Nuker', 'World', 'Break blocks around you', {
        range: 4,
        filter: [],
        mode: 'all'
    }, {
        mode: { type: 'dropdown', options: ['all', 'filter'] }
    })
    nuker.onTick = (bot) => {
        if (bot.targetDigBlock) return // Already digging

        // Find a block to break
        const target = bot.findBlock({
            matching: (block) => {
                if (block.name === 'air' || block.name === 'bedrock' || block.hardness >= 100) return false
                if (nuker.settings.mode === 'filter' && nuker.settings.filter.length > 0) {
                    return nuker.settings.filter.some(f => block.name.includes(f))
                }
                return true
            },
            maxDistance: nuker.settings.range
        })

        if (target) {
            bot.dig(target).catch(e => { }) // Ignore errors
        }
    }
    registerModule(nuker)

    // -- Fast Place (Working) --
    const fastPlace = new Module('fastplace', 'Fast Place', 'World', 'Place blocks faster', { delay: 0 })
    let originalPlaceBlock = null
    fastPlace.onToggle = (enabled) => {
        if (!window.bot) return
        if (enabled && !originalPlaceBlock) {
            originalPlaceBlock = window.bot.placeBlock.bind(window.bot)
            window.bot.placeBlock = async function(referenceBlock, faceVector) {
                // Remove delay by calling immediately
                return originalPlaceBlock(referenceBlock, faceVector)
            }
        } else if (!enabled && originalPlaceBlock) {
            window.bot.placeBlock = originalPlaceBlock
            originalPlaceBlock = null
        }
    }
    registerModule(fastPlace)

    // -- Fast Break --
    const fastBreak = new Module('fastbreak', 'Fast Break', 'World', 'Break blocks faster', { multiplier: 0.5 })
    let originalDigTime = null
    fastBreak.onToggle = (enabled) => {
        if (!window.bot) return
        if (enabled && !originalDigTime) {
            originalDigTime = window.bot.digTime.bind(window.bot)
            window.bot.digTime = function(block) {
                const originalTime = originalDigTime(block)
                // Reduce dig time by multiplier (0.5 = half time)
                return originalTime * fastBreak.settings.multiplier
            }
        } else if (!enabled && originalDigTime) {
            window.bot.digTime = originalDigTime
            originalDigTime = null
        }
    }
    fastBreak.onTick = (bot) => {
        // Fast break works by modifying digTime calculation
        // Actual breaking speed is server-side, but we can optimize client-side timing
    }
    registerModule(fastBreak)

    // -- X-Ray/Block ESP --
    const xray = new Module('xray', 'X-Ray', 'World', 'See through walls and highlight ores', {
        mode: 'highlight', // highlight, seethrough
        seeThroughMode: 'glass', // glass, opacity
        blocks: ['diamond_ore', 'gold_ore', 'iron_ore', 'emerald_ore', 'ancient_debris', 'nether_gold_ore'],
        hideBlocks: ['stone', 'deepslate', 'netherrack', 'dirt', 'grass_block'], // Blocks to hide in seethrough mode
        color: '#00ff00',
        range: 32,
        opacity: 0.3 // For opacity mode
    }, {
        mode: { type: 'dropdown', options: ['highlight', 'seethrough'] },
        seeThroughMode: { type: 'dropdown', options: ['glass', 'opacity'] }
    })
    
    xray.lastScan = 0

    // NOTE: worldView patching removed - now handled by direct renderer hooks in three.js
    // The three.js file modifies world.material and world.sectionObjects directly

    xray.onToggle = (enabled) => {
        const log = window.anticlientLogger?.module('XRay')
        if (!window.anticlient) window.anticlient = { visuals: {} }
        if (!window.anticlient.visuals) window.anticlient.visuals = {}
        
        window.anticlient.visuals.xray = enabled
        window.anticlient.visuals.xraySettings = xray.settings

        if (enabled) {
            if (log) log.info(`X-Ray enabled (${xray.settings.mode} mode)`)
        } else {
            if (log) log.info('X-Ray disabled')
        }
    }

    xray.onTick = (bot) => {
        // Always update settings for the renderer
        if (window.anticlient?.visuals) {
            window.anticlient.visuals.xraySettings = xray.settings
        }

        // Highlight mode: scan for blocks
        if (xray.settings.mode === 'highlight') {
            if (Date.now() - xray.lastScan > 1000) {
                const blocks = bot.findBlocks({
                    matching: (block) => xray.settings.blocks.some(name => block.name.includes(name)),
                    maxDistance: xray.settings.range,
                    count: 200
                })
                if (window.anticlient?.visuals) {
                    window.anticlient.visuals.xrayBlocks = blocks
                }
                xray.lastScan = Date.now()
            }
        }
        // Seethrough mode: ensure settings are always available
        else if (xray.settings.mode === 'seethrough') {
            if (window.anticlient?.visuals) {
                window.anticlient.visuals.xrayOpacity = {
                    enabled: true,
                    hideBlocks: xray.settings.hideBlocks,
                    opacity: xray.settings.opacity,
                    showBlocks: xray.settings.blocks,
                    seeThroughMode: xray.settings.seeThroughMode
                }
            }
        }
    }

    // Update settings live and handle mode changes
    xray.onSettingChanged = (key, newValue, oldValue) => {
        const log = window.anticlientLogger?.module('XRay')
        
        // Update visuals - the renderer hook in three.js reads these
        if (window.anticlient?.visuals) {
            window.anticlient.visuals.xraySettings = xray.settings
        }

        // Log mode changes
        if (key === 'mode' && xray.enabled) {
            if (log) log.info(`Switched to ${newValue} mode`)
        }
        if (key === 'seeThroughMode' && xray.enabled && xray.settings.mode === 'seethrough') {
            if (log) log.info(`Switched to ${newValue} mode`)
        }
    }

    registerModule(xray)

    // -- Auto-Mine --
    const autoMine = new Module('automine', 'Auto Mine', 'World', 'Automatically mine target blocks', {
        blocks: ['diamond_ore', 'gold_ore', 'iron_ore', 'emerald_ore'],
        range: 16,
        pathfind: false
    })
    autoMine.onTick = (bot) => {
        if (bot.targetDigBlock) return // Already mining

        const target = bot.findBlock({
            matching: (block) => autoMine.settings.blocks.some(name => block.name.includes(name)),
            maxDistance: autoMine.settings.range
        })
        
        if (target) {
            // Simple approach: move towards block and mine
            const distance = bot.entity.position.distanceTo(target.position)
            if (distance < 5) {
                bot.dig(target).catch(() => {})
            } else if (!autoMine.settings.pathfind) {
                // Simple movement towards block
                bot.lookAt(target.position)
                bot.setControlState('forward', true)
                setTimeout(() => bot.setControlState('forward', false), 100)
            }
        }
    }
    registerModule(autoMine)

    // -- Search (Block Finder) --
    const search = new Module('search', 'Search', 'World', 'Search and highlight blocks in loaded chunks', {
        blocks: ['diamond_ore'], // Blocks to search for
        range: 64,
        maxResults: 500,
        highlightColor: '#00ffff',
        showDistance: true,
        showCount: true,
        sortByDistance: true
    })

    let searchResults = []
    let lastSearchTime = 0

    search.onToggle = (enabled) => {
        const log = window.anticlientLogger?.module('Search')
        
        if (!window.anticlient) window.anticlient = { visuals: {} }
        if (!window.anticlient.visuals) window.anticlient.visuals = {}

        if (enabled) {
            // Perform initial search
            performSearch()
            if (log) log.info(`Search enabled - looking for: ${search.settings.blocks.join(', ')}`)
        } else {
            searchResults = []
            window.anticlient.visuals.searchResults = []
            if (log) log.info('Search disabled')
        }
    }

    const performSearch = () => {
        if (!window.bot) return

        const bot = window.bot
        searchResults = []

        try {
            // Search for each block type
            for (const blockName of search.settings.blocks) {
                const blocks = bot.findBlocks({
                    matching: (block) => block.name === blockName || block.name.includes(blockName),
                    maxDistance: search.settings.range,
                    count: search.settings.maxResults
                })

                // Add blocks with metadata
                for (const blockPos of blocks) {
                    const distance = bot.entity.position.distanceTo(blockPos)
                    const block = bot.blockAt(blockPos)
                    
                    searchResults.push({
                        position: blockPos,
                        distance: distance,
                        blockName: block ? block.name : blockName,
                        displayName: block ? block.displayName : blockName
                    })
                }
            }

            // Sort by distance if enabled
            if (search.settings.sortByDistance) {
                searchResults.sort((a, b) => a.distance - b.distance)
            }

            // Limit to maxResults
            searchResults = searchResults.slice(0, search.settings.maxResults)

            // Expose to visuals
            if (window.anticlient?.visuals) {
                window.anticlient.visuals.searchResults = searchResults.map(r => ({
                    position: r.position,
                    distance: r.distance,
                    color: search.settings.highlightColor,
                    showDistance: search.settings.showDistance,
                    name: r.displayName
                }))

                window.anticlient.visuals.searchCount = searchResults.length
            }

        } catch (e) {
            console.error('Search error:', e)
        }
    }

    search.onTick = (bot) => {
        // Re-search every 2 seconds
        const now = Date.now()
        if (now - lastSearchTime > 2000) {
            performSearch()
            lastSearchTime = now
        }
    }

    search.onSettingChanged = (key, newValue) => {
        const log = window.anticlientLogger?.module('Search')
        
        if (key === 'blocks' && search.enabled) {
            if (log) log.info(`Search blocks updated: ${newValue.join(', ')}`)
            performSearch()
        } else if (key === 'range' && search.enabled) {
            if (log) log.info(`Search range updated: ${newValue}`)
            performSearch()
        }

        // Update visuals settings
        if (window.anticlient?.visuals && search.enabled) {
            window.anticlient.visuals.searchSettings = search.settings
        }
    }

    registerModule(search)
}
