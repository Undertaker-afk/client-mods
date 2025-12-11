
import { Module, registerModule } from '../core/Module.js'

export const loadRenderModules = () => {
    const fullbright = new Module('fullbright', 'Fullbright', 'Render', 'See in the dark', { gamma: 1.0 })
    registerModule(fullbright)

    // -- ESP (Enhanced) --
    const esp = new Module('esp', 'ESP', 'Render', 'See entities through walls', {
        playerColor: '#00ffff',
        mobColor: '#ff0000',
        boxType: '3D',
        lineWidth: 2,
        showHealth: true,
        showDistance: true,
        glowEffect: true,
        chams: true,
        chamsColor: '#ff00ff',
        tightFit: true
    }, {
        boxType: { type: 'dropdown', options: ['2D', '3D'] }
    })
    esp.onToggle = (enabled) => {
        if (!window.anticlient) window.anticlient = { visuals: {} }
        if (!window.anticlient.visuals) window.anticlient.visuals = {}
        window.anticlient.visuals.esp = enabled
        window.anticlient.visuals.espSettings = esp.settings
    }
    esp.onSettingChanged = (key, newValue) => {
        if (window.anticlient?.visuals) {
            window.anticlient.visuals.espSettings = esp.settings
        }
    }
    registerModule(esp)

    // -- Tracers (Enhanced) --
    const tracers = new Module('tracers', 'Tracers', 'Render', 'Draw lines to entities', { 
        color: '#ffffff',
        showDistance: true,
        maxDistance: 64
    })
    tracers.onToggle = (enabled) => {
        if (!window.anticlient) window.anticlient = { visuals: {} }
        if (!window.anticlient.visuals) window.anticlient.visuals = {}
        window.anticlient.visuals.tracers = enabled
        window.anticlient.visuals.tracersSettings = tracers.settings
    }
    tracers.onSettingChanged = () => {
        if (window.anticlient?.visuals) {
            window.anticlient.visuals.tracersSettings = tracers.settings
        }
    }
    registerModule(tracers)

    // -- NameTags --
    const nameTags = new Module('nametags', 'NameTags', 'Render', 'Show entity names above heads', {
        range: 64,
        showHealth: true,
        showDistance: true
    })
    nameTags.onToggle = (enabled) => {
        if (!window.anticlient) window.anticlient = { visuals: {} }
        if (!window.anticlient.visuals) window.anticlient.visuals = {}
        window.anticlient.visuals.nameTags = enabled
        window.anticlient.visuals.nameTagsSettings = nameTags.settings
    }
    nameTags.onSettingChanged = () => {
        if (window.anticlient?.visuals) {
            window.anticlient.visuals.nameTagsSettings = nameTags.settings
        }
    }
    registerModule(nameTags)

    // -- Block ESP/X-Ray --
    const blockEsp = new Module('blockesp', 'Block ESP', 'Render', 'Highlight blocks through walls', {
        blocks: ['diamond_ore', 'gold_ore', 'iron_ore', 'emerald_ore', 'ancient_debris'],
        color: '#00ff00',
        range: 32
    })
    blockEsp.lastScan = 0
    blockEsp.onToggle = (enabled) => {
        const log = window.anticlientLogger?.module('BlockESP')
        if (log) log.info(`Block ESP ${enabled ? 'enabled' : 'disabled'}`)

        if (!window.anticlient) window.anticlient = { visuals: {} }
        if (!window.anticlient.visuals) window.anticlient.visuals = {}
        window.anticlient.visuals.blockEsp = enabled
        window.anticlient.visuals.blockEspSettings = blockEsp.settings

        if (log && enabled) {
            log.info(`Searching for blocks: ${blockEsp.settings.blocks.join(', ')}`)
            log.info(`Range: ${blockEsp.settings.range} blocks`)
        }
    }
    blockEsp.onTick = (bot) => {
        if (!bot || !bot.entity || !bot.entity.position || !bot.findBlocks) return

        if (Date.now() - blockEsp.lastScan > 1000) {
            const log = window.anticlientLogger?.module('BlockESP')

            try {
                // Additional safety check
                if (!bot.entity || !bot.entity.position) {
                    blockEsp.lastScan = Date.now()
                    return
                }

                const blocks = bot.findBlocks({
                    matching: (block) => blockEsp.settings.blocks.some(name => block.name.includes(name)),
                    maxDistance: blockEsp.settings.range,
                    count: 200
                })

                if (log) log.debug(`Found ${blocks.length} blocks`)

                if (window.anticlient?.visuals) {
                    window.anticlient.visuals.blockEspLocations = blocks
                }
            } catch (e) {
                // Silently fail - bot not ready yet
                if (log && log.level <= 0) log.debug('Bot not ready for block scanning')
            }

            blockEsp.lastScan = Date.now()
        }
    }
    blockEsp.onSettingChanged = () => {
        if (window.anticlient?.visuals) {
            window.anticlient.visuals.blockEspSettings = blockEsp.settings
        }
    }
    registerModule(blockEsp)

    // -- Storage ESP --
    const storageEsp = new Module('storageesp', 'Storage ESP', 'Render', 'See chests and containers', { color: '#FFA500' })
    storageEsp.lastScan = 0
    storageEsp.onToggle = (enabled) => {
        if (!window.anticlient?.visuals) return
        window.anticlient.visuals.storageEsp = enabled
        window.anticlient.visuals.storageEspSettings = storageEsp.settings
    }
    storageEsp.onSettingChanged = () => {
        if (window.anticlient?.visuals) {
            window.anticlient.visuals.storageEspSettings = storageEsp.settings
        }
    }
    storageEsp.onTick = (bot) => {
        if (!bot || !bot.entity || !bot.entity.position || !bot.findBlocks) return

        if (Date.now() - storageEsp.lastScan > 1000) {
            try {
                // Additional safety check
                if (!bot.entity || !bot.entity.position) {
                    storageEsp.lastScan = Date.now()
                    return
                }

                // Periodic scan
                const chests = bot.findBlocks({
                    matching: (block) => ['chest', 'ender_chest', 'trapped_chest', 'shulker_box', 'barrel', 'furnace'].some(n => block.name.includes(n)),
                    maxDistance: 64,
                    count: 100
                })
                if (window.anticlient?.visuals) {
                    window.anticlient.visuals.storageLocations = chests
                }
            } catch (e) {
                // Silently fail if bot not ready
            }
            storageEsp.lastScan = Date.now()
        }
    }
    registerModule(storageEsp)

    // -- HUD Overlay --
    const hudOverlay = new Module('hudoverlay', 'HUD Overlay', 'Render', 'Show module info on screen', {
        enabled: true,
        position: 'top-right',
        fontSize: 14,
        opacity: 0.85
    }, {
        position: { type: 'dropdown', options: ['top-left', 'top-right', 'bottom-left', 'bottom-right'] }
    })

    let hudElement = null

    hudOverlay.onToggle = (enabled) => {
        if (enabled) {
            createHUDElement()
        } else {
            if (hudElement) {
                hudElement.remove()
                hudElement = null
            }
        }
    }

    function createHUDElement() {
        if (hudElement) return

        hudElement = document.createElement('div')
        hudElement.id = 'anticlient-hud'
        hudElement.style.cssText = `
            position: fixed;
            z-index: 10000;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: ${hudOverlay.settings.fontSize}px;
            color: white;
            background: rgba(0, 0, 0, ${hudOverlay.settings.opacity});
            padding: 10px;
            border-radius: 6px;
            border: 2px solid #7c4dff;
            pointer-events: none;
            user-select: none;
            line-height: 1.6;
            min-width: 200px;
        `

        // Position based on settings
        const pos = hudOverlay.settings.position
        if (pos.includes('top')) hudElement.style.top = '10px'
        if (pos.includes('bottom')) hudElement.style.bottom = '10px'
        if (pos.includes('left')) hudElement.style.left = '10px'
        if (pos.includes('right')) hudElement.style.right = '10px'

        document.body.appendChild(hudElement)
    }

    hudOverlay.onTick = (bot) => {
        if (!hudElement) return

        const lines = []
        lines.push(`<div style="color: #b388ff; font-weight: bold; margin-bottom: 5px; text-align: center; border-bottom: 1px solid #7c4dff; padding-bottom: 5px;">ANTICLIENT</div>`)

        // Check for modules with onHUD enabled
        const { modules } = require('../core/Module.js')

        // Blink info
        const blinkModule = modules['blink']
        if (blinkModule && blinkModule.enabled && blinkModule.settings.onHUD) {
            const info = blinkModule.getHUDInfo()
            if (info.active) {
                const duration = (info.duration / 1000).toFixed(1)
                const maxDuration = (info.maxTime / 1000).toFixed(0)
                const progress = Math.min(100, (info.duration / info.maxTime) * 100)
                
                lines.push(`<div style="color: #ff00ff; margin-top: 5px;">`)
                lines.push(`  <strong>⚡ BLINK RECORDING</strong>`)
                lines.push(`  <div style="margin-left: 10px; font-size: 12px;">`)
                lines.push(`    <div>Positions: ${info.positions}</div>`)
                lines.push(`    <div>Time: ${duration}s / ${maxDuration}s</div>`)
                lines.push(`    <div style="background: #333; height: 6px; border-radius: 3px; margin-top: 3px; overflow: hidden;">`)
                lines.push(`      <div style="background: linear-gradient(90deg, #ff00ff, #7c4dff); height: 100%; width: ${progress}%;"></div>`)
                lines.push(`    </div>`)
                lines.push(`  </div>`)
                lines.push(`</div>`)
            } else {
                lines.push(`<div style="color: #888; font-size: 12px; margin-top: 5px;">Blink: Ready</div>`)
            }
        }

        // FakeLag info
        const fakeLagModule = modules['fakelag']
        if (fakeLagModule && fakeLagModule.enabled && fakeLagModule.settings.onHUD) {
            const info = fakeLagModule.getQueueInfo()
            
            lines.push(`<div style="color: #ffaa00; margin-top: 8px;">`)
            lines.push(`  <strong>📡 FAKE LAG</strong>`)
            lines.push(`  <div style="margin-left: 10px; font-size: 12px;">`)
            
            if (fakeLagModule.settings.burstMode) {
                const nextBurst = (info.nextBurstIn / 1000).toFixed(1)
                lines.push(`    <div>Mode: Burst</div>`)
                lines.push(`    <div>Queued: ${info.totalCount} packets</div>`)
                lines.push(`    <div>Next burst: ${nextBurst}s</div>`)
            } else {
                lines.push(`    <div>Mode: Delay</div>`)
                lines.push(`    <div>Out delay: ${fakeLagModule.settings.outgoingDelay}ms</div>`)
                if (fakeLagModule.settings.delayIncoming) {
                    lines.push(`    <div>In delay: ${fakeLagModule.settings.incomingDelay}ms</div>`)
                }
            }
            
            lines.push(`  </div>`)
            lines.push(`</div>`)
        }

        hudElement.innerHTML = lines.join('\n')
    }

    hudOverlay.onSettingChanged = (key, newValue) => {
        if (key === 'position' && hudElement) {
            // Update position
            hudElement.style.top = 'auto'
            hudElement.style.bottom = 'auto'
            hudElement.style.left = 'auto'
            hudElement.style.right = 'auto'
            
            if (newValue.includes('top')) hudElement.style.top = '10px'
            if (newValue.includes('bottom')) hudElement.style.bottom = '10px'
            if (newValue.includes('left')) hudElement.style.left = '10px'
            if (newValue.includes('right')) hudElement.style.right = '10px'
        } else if (key === 'fontSize' && hudElement) {
            hudElement.style.fontSize = newValue + 'px'
        } else if (key === 'opacity' && hudElement) {
            hudElement.style.background = `rgba(0, 0, 0, ${newValue})`
        }
    }

    registerModule(hudOverlay)

    // -- Blink Trail Renderer --
    const blinkTrail = new Module('blinktrail', 'Blink Trail', 'Render', 'Visualize blink movement path (auto-enabled with Blink)', {
        enabled: true,
        color: '#ff00ff',
        lineWidth: 3,
        opacity: 0.7
    })

    blinkTrail.onRender = (bot) => {
        // This will be rendered by the game's rendering system
        // We expose the trail data through window.anticlient.visuals
        const { modules } = require('../core/Module.js')
        const blinkModule = modules['blink']
        
        if (!window.anticlient) window.anticlient = { visuals: {} }
        if (!window.anticlient.visuals) window.anticlient.visuals = {}
        
        if (blinkModule && blinkModule.enabled && blinkModule.settings.visualizeTrail) {
            window.anticlient.visuals.blinkTrail = {
                enabled: true,
                positions: blinkModule.getPositionHistory(),
                color: blinkModule.settings.trailColor || blinkTrail.settings.color,
                lineWidth: blinkTrail.settings.lineWidth,
                opacity: blinkTrail.settings.opacity
            }
        } else {
            window.anticlient.visuals.blinkTrail = { enabled: false }
        }
    }

    registerModule(blinkTrail)

    // -- Projectile Trajectory Preview --
    const trajectory = new Module('trajectory', 'Trajectory', 'Render', 'Draw predicted path for projectiles (bow, ender pearl, potions, etc.)', {
        color: '#ffff00', // Yellow default
        landingColor: '#ff0000', // Red for landing spot
        lineWidth: 2,
        opacity: 0.8,
        showLanding: true, // Show landing marker
        showDistance: true, // Show distance to landing
        maxPoints: 100, // Max trajectory points
        simulationTime: 5.0, // Max seconds to simulate
        // Projectile-specific settings
        arrowGravity: 0.05,
        pearlGravity: 0.03,
        potionGravity: 0.05,
        snowballGravity: 0.03,
        eggGravity: 0.03
    })

    // Projectile physics constants
    const projectileData = {
        bow: { velocity: 3.0, gravity: 0.05, drag: 0.99 },
        crossbow: { velocity: 3.15, gravity: 0.05, drag: 0.99 },
        ender_pearl: { velocity: 1.5, gravity: 0.03, drag: 0.99 },
        splash_potion: { velocity: 0.5, gravity: 0.05, drag: 0.99 },
        lingering_potion: { velocity: 0.5, gravity: 0.05, drag: 0.99 },
        experience_bottle: { velocity: 0.7, gravity: 0.07, drag: 0.99 },
        snowball: { velocity: 1.5, gravity: 0.03, drag: 0.99 },
        egg: { velocity: 1.5, gravity: 0.03, drag: 0.99 },
        trident: { velocity: 2.5, gravity: 0.05, drag: 0.99 },
        firework_rocket: { velocity: 1.5, gravity: 0.0, drag: 0.95 }
    }

    // Check if item is a projectile
    const getProjectileType = (itemName) => {
        if (!itemName) return null
        
        if (itemName.includes('bow') && !itemName.includes('crossbow')) return 'bow'
        if (itemName.includes('crossbow')) return 'crossbow'
        if (itemName.includes('ender_pearl')) return 'ender_pearl'
        if (itemName.includes('splash_potion')) return 'splash_potion'
        if (itemName.includes('lingering_potion')) return 'lingering_potion'
        if (itemName.includes('experience_bottle')) return 'experience_bottle'
        if (itemName.includes('snowball')) return 'snowball'
        if (itemName.includes('egg')) return 'egg'
        if (itemName.includes('trident')) return 'trident'
        if (itemName.includes('firework')) return 'firework_rocket'
        
        return null
    }

    // Calculate trajectory points
    const calculateTrajectory = (bot, projectileType, chargeLevel = 1.0) => {
        const data = projectileData[projectileType]
        if (!data) return { points: [], landing: null }

        const points = []
        const startPos = {
            x: bot.entity.position.x,
            y: bot.entity.position.y + bot.entity.eyeHeight,
            z: bot.entity.position.z
        }

        // Calculate initial velocity based on look direction
        const yaw = bot.entity.yaw
        const pitch = bot.entity.pitch

        // Velocity scales with charge for bows
        let velocityMagnitude = data.velocity
        if (projectileType === 'bow' || projectileType === 'crossbow') {
            velocityMagnitude *= (0.3 + chargeLevel * 0.7) // 30% to 100% velocity
        }

        let velocity = {
            x: -Math.sin(yaw) * Math.cos(pitch) * velocityMagnitude,
            y: Math.sin(pitch) * velocityMagnitude,
            z: -Math.cos(yaw) * Math.cos(pitch) * velocityMagnitude
        }

        let pos = { ...startPos }
        const gravity = data.gravity * 20 // Scale for ticks
        const drag = data.drag
        const dt = 0.05 // Time step (50ms = 1 tick)
        let time = 0

        points.push({ x: pos.x, y: pos.y, z: pos.z, time: 0 })

        // Simulate trajectory
        for (let i = 0; i < trajectory.settings.maxPoints && time < trajectory.settings.simulationTime; i++) {
            // Update velocity (gravity + drag)
            velocity.y -= gravity * dt
            velocity.x *= drag
            velocity.y *= drag
            velocity.z *= drag

            // Update position
            pos.x += velocity.x
            pos.y += velocity.y
            pos.z += velocity.z
            time += dt

            points.push({ x: pos.x, y: pos.y, z: pos.z, time: time })

            // Check for ground collision (simple Y check)
            if (pos.y < -64) break

            // Check for block collision
            if (bot.blockAt) {
                try {
                    const block = bot.blockAt({ x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) })
                    if (block && block.name !== 'air' && block.name !== 'water' && block.name !== 'lava') {
                        // Hit a block - this is the landing point
                        break
                    }
                } catch (e) {
                    // Ignore block check errors
                }
            }
        }

        // Landing point is the last point
        const landing = points.length > 0 ? points[points.length - 1] : null

        return { points, landing }
    }

    trajectory.onTick = (bot) => {
        if (!bot || !bot.heldItem) {
            // Clear trajectory when no item held
            if (window.anticlient?.visuals) {
                window.anticlient.visuals.trajectory = { enabled: false }
            }
            return
        }

        const itemName = bot.heldItem.name
        const projectileType = getProjectileType(itemName)

        if (!projectileType) {
            if (window.anticlient?.visuals) {
                window.anticlient.visuals.trajectory = { enabled: false }
            }
            return
        }

        // Calculate charge level for bows
        let chargeLevel = 1.0
        if ((projectileType === 'bow' || projectileType === 'crossbow') && bot.isUsingItem) {
            // Estimate charge based on how long item has been used
            // Full charge is ~1 second (20 ticks)
            const useTime = bot.usingItemTime || 0
            chargeLevel = Math.min(1.0, useTime / 20)
        }

        // Calculate trajectory
        const { points, landing } = calculateTrajectory(bot, projectileType, chargeLevel)

        // Calculate distance to landing
        let landingDistance = 0
        if (landing) {
            landingDistance = Math.sqrt(
                Math.pow(landing.x - bot.entity.position.x, 2) +
                Math.pow(landing.y - bot.entity.position.y, 2) +
                Math.pow(landing.z - bot.entity.position.z, 2)
            )
        }

        // Expose trajectory data for rendering
        if (!window.anticlient) window.anticlient = { visuals: {} }
        if (!window.anticlient.visuals) window.anticlient.visuals = {}
        
        window.anticlient.visuals.trajectory = {
            enabled: true,
            projectileType: projectileType,
            points: points,
            landing: landing,
            landingDistance: landingDistance,
            chargeLevel: chargeLevel,
            color: trajectory.settings.color,
            landingColor: trajectory.settings.landingColor,
            lineWidth: trajectory.settings.lineWidth,
            opacity: trajectory.settings.opacity,
            showLanding: trajectory.settings.showLanding,
            showDistance: trajectory.settings.showDistance
        }
    }

    trajectory.onToggle = (enabled) => {
        const log = window.anticlientLogger?.module('Trajectory')
        
        if (!window.anticlient) window.anticlient = { visuals: {} }
        if (!window.anticlient.visuals) window.anticlient.visuals = {}
        
        if (enabled) {
            if (log) log.info('Trajectory preview enabled')
        } else {
            window.anticlient.visuals.trajectory = { enabled: false }
            if (log) log.info('Trajectory preview disabled')
        }
    }

    registerModule(trajectory)
}

