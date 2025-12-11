
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
    let worldViewPatched = false
    let originalLoadChunk = null
    let originalSetBlockStateId = null
    let originalWorldSetBlockStateId = null

    // Helper: Get block state IDs for a block name
    function getBlockStateIds(blockName) {
        const mcData = globalThis.mcData || globalThis.loadedData || window?.mcData
        const block = mcData?.blocksByName?.[blockName]
        if (!block) return []

        const stateIds = []
        if (block.minStateId !== undefined && block.maxStateId !== undefined) {
            for (let id = block.minStateId; id <= block.maxStateId; id++) {
                stateIds.push(id)
            }
        } else if (block.defaultState !== undefined) {
            stateIds.push(block.defaultState)
        }
        return stateIds
    }

    // Helper: Replace blocks in chunk
    function replaceBlocksInChunk(column, blocksToHide, replacementStateId) {
        if (!column || !replacementStateId) return

        const minY = column.minY ?? 0
        const worldHeight = column.worldHeight ?? 256
        const Vec3 = globalThis.Vec3

        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                for (let y = minY; y < worldHeight; y++) {
                    const pos = new Vec3(x, y, z)
                    try {
                        const stateId = column.getBlockStateId(pos)
                        if (blocksToHide.includes(stateId)) {
                            column.setBlockStateId(pos, replacementStateId)
                        }
                    } catch (e) {
                        // Skip invalid positions
                    }
                }
            }
        }
    }

    // Patch worldView for seethrough modes
    function patchWorldView() {
        const worldView = globalThis.worldView || window?.worldView
        if (!worldView || worldViewPatched) return

        const Vec3 = globalThis.Vec3
        const mcData = globalThis.mcData || globalThis.loadedData || window?.mcData
        if (!mcData) return

        // Get glass block ID for glass mode
        const glassStateId = mcData.blocksByName?.['glass']?.defaultState

        // Patch world.setBlockStateId
        if (worldView.world && worldView.world.setBlockStateId && !originalWorldSetBlockStateId) {
            originalWorldSetBlockStateId = worldView.world.setBlockStateId.bind(worldView.world)
            worldView.world.setBlockStateId = function(pos, stateId) {
                if (xray.enabled && xray.settings.mode === 'seethrough' && xray.settings.seeThroughMode === 'glass') {
                    const hideIds = xray.settings.hideBlocks.flatMap(name => getBlockStateIds(name))
                    if (hideIds.includes(stateId) && glassStateId) {
                        stateId = glassStateId
                    }
                }
                return originalWorldSetBlockStateId(pos, stateId)
            }
        }

        // Patch worldView.loadChunk
        if (worldView.loadChunk && !originalLoadChunk) {
            originalLoadChunk = worldView.loadChunk.bind(worldView)
            worldView.loadChunk = async function(pos, isLightUpdate, reason) {
                if (xray.enabled && xray.settings.mode === 'seethrough' && xray.settings.seeThroughMode === 'glass') {
                    const column = await this.world.getColumnAt(pos.y !== undefined ? pos : new Vec3(pos.x, 0, pos.z))
                    if (column && glassStateId) {
                        const hideIds = xray.settings.hideBlocks.flatMap(name => getBlockStateIds(name))
                        replaceBlocksInChunk(column, hideIds, glassStateId)
                    }
                }
                return originalLoadChunk(pos, isLightUpdate, reason)
            }
        }

        // Patch worldView.setBlockStateId
        if (worldView.setBlockStateId && !originalSetBlockStateId) {
            originalSetBlockStateId = worldView.setBlockStateId.bind(worldView)
            worldView.setBlockStateId = function(position, stateId) {
                if (xray.enabled && xray.settings.mode === 'seethrough' && xray.settings.seeThroughMode === 'glass') {
                    const hideIds = xray.settings.hideBlocks.flatMap(name => getBlockStateIds(name))
                    if (hideIds.includes(stateId) && glassStateId) {
                        stateId = glassStateId
                    }
                }
                return originalSetBlockStateId(position, stateId)
            }
        }

        worldViewPatched = true
    }

    // Unpatch worldView
    function unpatchWorldView() {
        const worldView = globalThis.worldView || window?.worldView
        if (!worldView || !worldViewPatched) return

        if (originalWorldSetBlockStateId && worldView.world) {
            worldView.world.setBlockStateId = originalWorldSetBlockStateId
            originalWorldSetBlockStateId = null
        }
        if (originalLoadChunk) {
            worldView.loadChunk = originalLoadChunk
            originalLoadChunk = null
        }
        if (originalSetBlockStateId) {
            worldView.setBlockStateId = originalSetBlockStateId
            originalSetBlockStateId = null
        }

        worldViewPatched = false
    }

    xray.onToggle = (enabled) => {
        const log = window.anticlientLogger?.module('XRay')
        if (!window.anticlient) window.anticlient = { visuals: {} }
        if (!window.anticlient.visuals) window.anticlient.visuals = {}
        
        window.anticlient.visuals.xray = enabled
        window.anticlient.visuals.xraySettings = xray.settings

        if (enabled) {
            if (xray.settings.mode === 'seethrough') {
                patchWorldView()
                if (log) log.info(`X-Ray enabled (${xray.settings.seeThroughMode} mode)`)
            } else {
                if (log) log.info('X-Ray enabled (highlight mode)')
            }
        } else {
            unpatchWorldView()
            if (log) log.info('X-Ray disabled')
        }
    }

    xray.onTick = (bot) => {
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
        // Seethrough opacity mode: update opacity settings
        else if (xray.settings.mode === 'seethrough' && xray.settings.seeThroughMode === 'opacity') {
            if (window.anticlient?.visuals) {
                window.anticlient.visuals.xrayOpacity = {
                    enabled: true,
                    hideBlocks: xray.settings.hideBlocks,
                    opacity: xray.settings.opacity,
                    showBlocks: xray.settings.blocks
                }
            }
        }
    }

    // Update settings live and handle mode changes
    xray.onSettingChanged = (key, newValue, oldValue) => {
        const log = window.anticlientLogger?.module('XRay')
        
        // Update visuals
        if (window.anticlient?.visuals) {
            window.anticlient.visuals.xraySettings = xray.settings
        }

        // Handle mode changes
        if (key === 'mode' && xray.enabled) {
            if (newValue === 'seethrough') {
                patchWorldView()
                if (log) log.info(`Switched to seethrough mode (${xray.settings.seeThroughMode})`)
            } else {
                unpatchWorldView()
                if (log) log.info('Switched to highlight mode')
            }
        }

        // Handle seethrough mode changes
        if (key === 'seeThroughMode' && xray.enabled && xray.settings.mode === 'seethrough') {
            if (newValue === 'glass') {
                patchWorldView()
                if (log) log.info('Switched to glass mode')
            } else {
                unpatchWorldView()
                if (log) log.info('Switched to opacity mode')
            }
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
}
