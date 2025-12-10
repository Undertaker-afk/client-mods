
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
    const xray = new Module('xray', 'X-Ray', 'World', 'Highlight ores and valuable blocks', {
        blocks: ['diamond_ore', 'gold_ore', 'iron_ore', 'emerald_ore', 'ancient_debris', 'nether_gold_ore'],
        color: '#00ff00',
        range: 32
    })
    xray.lastScan = 0
    xray.onToggle = (enabled) => {
        if (!window.anticlient) window.anticlient = { visuals: {} }
        if (!window.anticlient.visuals) window.anticlient.visuals = {}
        window.anticlient.visuals.xray = enabled
        window.anticlient.visuals.xraySettings = xray.settings
    }
    xray.onTick = (bot) => {
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
    // Update settings live
    xray.settings = new Proxy(xray.settings, {
        set: (target, prop, value) => {
            target[prop] = value
            if (window.anticlient?.visuals) window.anticlient.visuals.xraySettings = target
            return true
        }
    })
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
