
import { Module, registerModule } from '../core/Module.js'

export const loadMovementModules = () => {
    // -- Flight --
    const flight = new Module('flight', 'Flight', 'Movement', 'Allows you to fly like in creative mode', {
        speed: 1,
        doubleJumpToggle: false
    })

    let lastSpacePress = 0
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && flight.settings.doubleJumpToggle) {
            const now = Date.now()
            if (now - lastSpacePress < 300) {
                flight.toggle()
            }
            lastSpacePress = now
        }
    })

    flight.onTick = (bot) => {
        bot.entity.velocity.y = 0
        const speed = flight.settings.speed
        if (bot.controlState.jump) bot.entity.velocity.y = speed
        if (bot.controlState.sneak) bot.entity.velocity.y = -speed

        const yaw = bot.entity.yaw
        if (bot.controlState.forward) {
            bot.entity.velocity.x = -Math.sin(yaw) * speed
            bot.entity.velocity.z = -Math.cos(yaw) * speed
        } else if (bot.controlState.back) {
            bot.entity.velocity.x = Math.sin(yaw) * speed
            bot.entity.velocity.z = Math.cos(yaw) * speed
        }
    }
    registerModule(flight)

    // -- Freecam --
    const freecam = new Module('freecam', 'Freecam', 'Movement', 'Detach camera from player and fly freely', {
        speed: 1.0,
        fastSpeed: 3.0,
        slowSpeed: 0.3,
        smoothing: 0.5
    })

    let freecamPosition = null
    let freecamYaw = 0
    let freecamPitch = 0
    let freecamVelocity = { x: 0, y: 0, z: 0 }
    let originalPosition = null

    freecam.onToggle = (enabled) => {
        if (!window.bot || !window.bot.entity) return

        if (enabled) {
            // Store original position
            originalPosition = window.bot.entity.position.clone()
            freecamPosition = window.bot.entity.position.clone()
            freecamYaw = window.bot.entity.yaw
            freecamPitch = window.bot.entity.pitch
            freecamVelocity = { x: 0, y: 0, z: 0 }

            console.log('[Freecam] Enabled - Camera detached from player')
        } else {
            // Reset camera to player position
            freecamPosition = null
            freecamVelocity = { x: 0, y: 0, z: 0 }
            console.log('[Freecam] Disabled - Camera attached to player')
        }
    }

    freecam.onTick = (bot) => {
        if (!freecamPosition) return

        // Get current speed based on control state
        let currentSpeed = freecam.settings.speed
        if (bot.controlState.sprint) currentSpeed = freecam.settings.fastSpeed
        if (bot.controlState.sneak) currentSpeed = freecam.settings.slowSpeed

        // Calculate movement direction based on camera rotation
        const yaw = freecamYaw
        const pitch = freecamPitch

        // Reset velocity
        let vx = 0, vy = 0, vz = 0

        // Forward/Backward
        if (bot.controlState.forward) {
            vx -= Math.sin(yaw) * Math.cos(pitch) * currentSpeed
            vy -= Math.sin(pitch) * currentSpeed
            vz -= Math.cos(yaw) * Math.cos(pitch) * currentSpeed
        }
        if (bot.controlState.back) {
            vx += Math.sin(yaw) * Math.cos(pitch) * currentSpeed
            vy += Math.sin(pitch) * currentSpeed
            vz += Math.cos(yaw) * Math.cos(pitch) * currentSpeed
        }

        // Left/Right strafe
        if (bot.controlState.left) {
            vx -= Math.cos(yaw) * currentSpeed
            vz += Math.sin(yaw) * currentSpeed
        }
        if (bot.controlState.right) {
            vx += Math.cos(yaw) * currentSpeed
            vz -= Math.sin(yaw) * currentSpeed
        }

        // Up/Down (space/shift)
        if (bot.controlState.jump) vy += currentSpeed
        // Note: sneak is used for slow mode, so we use a different key for down
        // We'll use the actual sneak key when not in slow mode
        if (bot.controlState.sneak && !bot.controlState.sprint) {
            vy -= currentSpeed * 0.5 // Slower descent
        }

        // Apply smoothing
        const smoothing = freecam.settings.smoothing
        freecamVelocity.x = freecamVelocity.x * smoothing + vx * (1 - smoothing)
        freecamVelocity.y = freecamVelocity.y * smoothing + vy * (1 - smoothing)
        freecamVelocity.z = freecamVelocity.z * smoothing + vz * (1 - smoothing)

        // Update freecam position
        freecamPosition.x += freecamVelocity.x
        freecamPosition.y += freecamVelocity.y
        freecamPosition.z += freecamVelocity.z

        // Update camera rotation from bot entity (which gets updated by mouse movement)
        freecamYaw = bot.entity.yaw
        freecamPitch = bot.entity.pitch

        // Update the camera position in the renderer
        if (window.viewer && window.viewer.world) {
            // Create a Vec3 for the camera position
            const Vec3 = window.bot.entity.position.constructor
            const cameraPos = new Vec3(freecamPosition.x, freecamPosition.y + 1.62, freecamPosition.z)

            // Update camera directly
            if (window.viewer.world.updateCamera) {
                window.viewer.world.updateCamera(cameraPos, freecamYaw, freecamPitch)
            }
        }

        // Keep player stationary (prevent server-side movement)
        bot.entity.velocity.x = 0
        bot.entity.velocity.y = 0
        bot.entity.velocity.z = 0
    }

    registerModule(freecam)

    // -- Speed (Enhanced with Strafe) --
    const speed = new Module('speed', 'Speed', 'Movement', 'Moves faster on ground', {
        groundSpeedMultiplier: 1.5,
        airSpeedMultiplier: 1.2,
        mode: 'strafe'
    }, {
        mode: { type: 'dropdown', options: ['strafe', 'forward'] }
    })
    speed.onTick = (bot) => {
        const controlStates = [
            bot.controlState.forward,
            bot.controlState.right,
            bot.controlState.back,
            bot.controlState.left,
        ]
        
        if (!controlStates.some(state => state === true)) return
        
        if (speed.settings.mode === 'strafe') {
            let yaw = bot.entity.yaw
            const vel = bot.entity.velocity
            
            // Calculate strafe direction
            if (!(controlStates[0] || controlStates[2])) {
                // Only left/right
                if (controlStates[1]) yaw += Math.PI / 2
                else if (controlStates[3]) yaw -= Math.PI / 2
            } else if (controlStates[0]) {
                // Forward
                yaw += Math.PI / 2
                if (controlStates[1]) yaw += Math.PI / 4
                else if (controlStates[3]) yaw -= Math.PI / 4
            } else if (controlStates[2]) {
                // Back
                yaw -= Math.PI / 2
                if (controlStates[1]) yaw -= Math.PI / 4
                else if (controlStates[3]) yaw += Math.PI / 4
            }
            
            const newX = Math.sin(yaw + Math.PI / 2)
            const newZ = Math.cos(yaw + Math.PI / 2)
            
            if (bot.entity.onGround) {
                bot.entity.velocity = bot.entity.velocity.set(
                    speed.settings.groundSpeedMultiplier * newX,
                    vel.y,
                    speed.settings.groundSpeedMultiplier * newZ
                )
            } else {
                bot.entity.velocity = bot.entity.velocity.set(
                    speed.settings.airSpeedMultiplier * newX,
                    vel.y,
                    speed.settings.airSpeedMultiplier * newZ
                )
            }
        } else {
            // Forward mode (original)
            if (bot.entity.onGround && (bot.controlState.forward || bot.controlState.left || bot.controlState.right || bot.controlState.back)) {
                bot.entity.velocity.x *= speed.settings.groundSpeedMultiplier
                bot.entity.velocity.z *= speed.settings.groundSpeedMultiplier
            }
        }
    }
    registerModule(speed)

    // -- Jesus --
    const jesus = new Module('jesus', 'Jesus', 'Movement', 'Walk on water', {})
    jesus.onTick = (bot) => {
        const inLiquid = bot.blockAt(bot.entity.position)?.name.includes('water') || bot.entity.isInWater
        if (inLiquid) {
            bot.entity.velocity.y = 0.1
            bot.entity.onGround = true
        }
    }
    registerModule(jesus)

    // -- Step --
    const step = new Module('step', 'Step', 'Movement', 'Instantly step up blocks', { height: 2 })
    let originalStepHeight = 0.6
    step.onToggle = (enabled) => {
        const log = window.anticlientLogger?.module('Step')
        if (!window.bot) {
            if (log) log.warning('Bot not available')
            return
        }
        if (enabled) {
            originalStepHeight = window.bot.physics?.stepHeight || 0.6
            if (window.bot.physics) {
                window.bot.physics.stepHeight = step.settings.height
                if (log) log.info(`Step enabled: ${step.settings.height} blocks`)
            }
        } else {
            if (window.bot.physics) {
                window.bot.physics.stepHeight = originalStepHeight
                if (log) log.info('Step disabled')
            }
        }
    }
    step.onSettingChanged = (key, newValue) => {
        const log = window.anticlientLogger?.module('Step')
        if (key === 'height' && step.enabled && window.bot?.physics) {
            window.bot.physics.stepHeight = newValue
            if (log) log.info(`Step height changed to ${newValue} blocks`)
        }
    }
    step.onTick = (bot) => {
        // Ensure step height is maintained
        if (bot.physics && bot.physics.stepHeight !== step.settings.height) {
            bot.physics.stepHeight = step.settings.height
        }
    }
    registerModule(step)

    // -- Spider --
    const spider = new Module('spider', 'Spider', 'Movement', 'Climb walls', {})
    spider.onTick = (bot) => {
        if (bot.entity && bot.entity.isCollidedHorizontally) {
            bot.entity.velocity.y = 0.2
        }
    }
    registerModule(spider)

    // -- NoFall --
    const nofall = new Module('nofall', 'NoFall', 'Movement', 'Avoid fall damage', {})
    nofall.onTick = (bot) => {
        if (bot.entity.velocity.y < -0.5) {
            bot.entity.onGround = true
        }
    }
    registerModule(nofall)

    // -- High Jump --
    const highJump = new Module('highjump', 'High Jump', 'Movement', 'Jump higher', { height: 1.5 })
    highJump.onTick = (bot) => {
        if (bot.controlState.jump && bot.entity.onGround) {
            bot.entity.velocity.y = 0.42 * highJump.settings.height
        }
    }
    registerModule(highJump)

    // -- Scaffold --
    const scaffold = new Module('scaffold', 'Scaffold', 'Movement', 'Place blocks under you', {})
    scaffold.onTick = (bot) => {
        if (!bot.inventory || !bot.inventory.slots) return // Guard against undefined inventory
        
        const pos = bot.entity.position
        const blockBelow = bot.blockAt(pos.offset(0, -1, 0))
        if (blockBelow && blockBelow.boundingBox === 'empty') {
            // Find block to place
            const item = bot.inventory.items().find(i => i.name !== 'air' && !i.name.includes('sword') && !i.name.includes('pickaxe'))
            if (item) {
                bot.equip(item, 'hand').then(() => {
                    // Try to place against a neighbor
                    // This is complex logic for simple scaffold
                    // We'll trust bot.placeBlock logic if we can find a reference face
                }).catch(() => { })
            }
        }
    }
    registerModule(scaffold)

    // -- NoSlow (Working Implementation) --
    const noSlow = new Module('noslow', 'No Slow', 'Movement', 'No slowdown when eating', { enabled: true })
    let lastVelocity = null
    noSlow.onTick = (bot) => {
        if (bot.usingHeldItem && noSlow.settings.enabled) {
            // Store velocity before slowdown
            if (!lastVelocity) {
                lastVelocity = { x: bot.entity.velocity.x, z: bot.entity.velocity.z }
            }
            // Restore velocity to prevent slowdown
            if (lastVelocity) {
                bot.entity.velocity.x = lastVelocity.x
                bot.entity.velocity.z = lastVelocity.z
            }
        } else {
            lastVelocity = null
        }
    }
    registerModule(noSlow)

    // -- SlowFall --
    const slowFall = new Module('slowfall', 'Slow Fall', 'Movement', 'Limit fall velocity', { maxFallSpeed: -0.2 })
    slowFall.onTick = (bot) => {
        if (bot.entity.velocity.y < slowFall.settings.maxFallSpeed) {
            bot.entity.velocity.y = slowFall.settings.maxFallSpeed
        }
    }
    registerModule(slowFall)

    // -- Blink/Backtrack --
    const blink = new Module('blink', 'Blink', 'Movement', 'Hold button to record, release to teleport back', {
        recordInterval: 50, // ms between position recordings
        maxRecordTime: 10000, // 10 seconds max
        onHUD: true, // Always show on HUD overlay
        visualizeTrail: true, // Show trail of recorded positions
        trailColor: '#ff00ff' // Trail color
    })

    // Set custom keybind flag (don't toggle on keybind press)
    blink.customKeybind = true

    let positionHistory = [] // Array of {pos, time}
    let isRecording = false
    let recordStartPos = null
    let recordStartTime = 0

    // Expose state for HUD
    blink.getHUDInfo = () => ({
        active: isRecording,
        positions: positionHistory.length,
        duration: isRecording ? Date.now() - recordStartTime : 0,
        maxTime: blink.settings.maxRecordTime,
        startPos: recordStartPos
    })

    // Expose position history for rendering
    blink.getPositionHistory = () => positionHistory

    // Update window.anticlient.blinkUI for HUD display
    const updateBlinkUI = () => {
        if (!window.anticlient) window.anticlient = {}
        const info = blink.getHUDInfo()
        window.anticlient.blinkUI = {
            active: info.active,
            positions: info.positions,
            duration: info.duration
        }
    }

    blink.onToggle = (enabled) => {
        const log = window.anticlientLogger?.module('Blink')
        if (!enabled) {
            positionHistory = []
            isRecording = false
            recordStartPos = null
            updateBlinkUI()
            if (log) log.info('Blink disabled, history cleared')
        } else {
            if (log) log.info('Blink enabled - Hold keybind to record path, release to teleport back')
        }
    }

    blink.onTick = (bot) => {
        if (!bot || !bot.entity || !bot.entity.position) return

        const now = Date.now()

        if (isRecording) {
            // Record position
            if (now - (positionHistory[positionHistory.length - 1]?.time || 0) >= blink.settings.recordInterval) {
                positionHistory.push({
                    pos: bot.entity.position.clone(),
                    time: now
                })

                // Limit history to maxRecordTime (remove oldest)
                const cutoffTime = now - blink.settings.maxRecordTime
                positionHistory = positionHistory.filter(p => p.time >= cutoffTime)

                // Update HUD
                updateBlinkUI()
            }
        }
    }

    // Keyboard handler for recording
    window.addEventListener('keydown', (e) => {
        if (!blink.enabled || !window.bot) return

        if (e.code === blink.bind && !isRecording) {
            const log = window.anticlientLogger?.module('Blink')
            isRecording = true
            recordStartPos = window.bot.entity.position.clone()
            recordStartTime = Date.now()
            positionHistory = [{
                pos: recordStartPos.clone(),
                time: recordStartTime
            }]

            updateBlinkUI()
            if (log) log.info('Blink recording started')
        }
    })

    window.addEventListener('keyup', (e) => {
        if (!blink.enabled || !window.bot) return

        if (e.code === blink.bind && isRecording) {
            const log = window.anticlientLogger?.module('Blink')
            isRecording = false

            // Teleport back to start position (earliest record)
            if (recordStartPos && positionHistory.length > 0) {
                const startPos = positionHistory[0].pos
                window.bot.entity.position.set(startPos.x, startPos.y, startPos.z)

                const duration = ((Date.now() - recordStartTime) / 1000).toFixed(1)
                const distance = startPos.distanceTo(window.bot.entity.position)
                
                if (log) log.info(`Blinked back ${positionHistory.length} positions (${duration}s, ${distance.toFixed(1)} blocks)`)
            }

            // Clear history after short delay
            setTimeout(() => {
                positionHistory = []
                updateBlinkUI()
            }, 100)
        }
    })

    registerModule(blink)

    // -- Anti-Knockback (Enhanced) --
    const antiKnockback = new Module('antiknockback', 'Anti-Knockback', 'Movement', 'Cancel knockback', {
        updateMineflayer: true,
        strength: 1.0 // 0 = full cancel, 1 = no cancel
    })
    let lastVelocityBeforeHit = null
    antiKnockback.onTick = (bot) => {
        if (antiKnockback.settings.strength < 1.0) {
            // Store velocity before potential hit
            const currentVel = Math.sqrt(bot.entity.velocity.x ** 2 + bot.entity.velocity.z ** 2)
            if (currentVel < 0.1) {
                lastVelocityBeforeHit = { x: bot.entity.velocity.x, z: bot.entity.velocity.z }
            }
            
            // If velocity suddenly increases (knockback), reduce it
            if (lastVelocityBeforeHit && currentVel > 0.3) {
                const reduction = 1 - antiKnockback.settings.strength
                bot.entity.velocity.x *= reduction
                bot.entity.velocity.z *= reduction
            }
        }
    }
    registerModule(antiKnockback)

    // -- Elytra Fly --
    const elytraFly = new Module('elytrafly', 'Elytra Fly', 'Movement', 'Auto-activate and control elytra', {
        autoActivate: true,
        speed: 1.0
    })
    elytraFly.onTick = (bot) => {
        if (!bot.inventory || !bot.inventory.slots) return // Guard against undefined inventory
        
        if (elytraFly.settings.autoActivate && bot.entity.velocity.y < -0.5) {
            // Check if elytra is equipped
            const chestplate = bot.inventory.slots[6] // Chest slot
            if (chestplate && chestplate.name === 'elytra') {
                // Activate elytra
                if (bot.elytraFly) {
                    bot.elytraFly()
                }
            }
        }
        
        // Control flight
        if (bot.entity.elytraFlying) {
            const yaw = bot.entity.yaw
            const speed = elytraFly.settings.speed
            
            if (bot.controlState.forward) {
                bot.entity.velocity.x = -Math.sin(yaw) * speed
                bot.entity.velocity.z = -Math.cos(yaw) * speed
            } else if (bot.controlState.back) {
                bot.entity.velocity.x = Math.sin(yaw) * speed
                bot.entity.velocity.z = Math.cos(yaw) * speed
            }
            
            if (bot.controlState.jump) {
                bot.entity.velocity.y = speed * 0.5
            } else if (bot.controlState.sneak) {
                bot.entity.velocity.y = -speed * 0.5
            }
        }
    }
    registerModule(elytraFly)

    // -- Scaffold (Enhanced) --
    scaffold.settings.range = 5
    scaffold.settings.sneakOnly = false
    scaffold.onTick = (bot) => {
        if (!bot.inventory || !bot.inventory.slots) return // Guard against undefined inventory
        if (scaffold.settings.sneakOnly && !bot.controlState.sneak) return
        
        const pos = bot.entity.position
        const blockBelow = bot.blockAt(pos.offset(0, -1, 0))
        if (blockBelow && blockBelow.boundingBox === 'empty') {
            // Find block to place
            const item = bot.inventory.items().find(i => 
                i.name !== 'air' && 
                !i.name.includes('sword') && 
                !i.name.includes('pickaxe') &&
                !i.name.includes('axe') &&
                !i.name.includes('shovel')
            )
            if (item) {
                bot.equip(item, 'hand').then(() => {
                    // Try to place block
                    const referenceBlock = bot.blockAt(pos.offset(0, -2, 0))
                    if (referenceBlock && referenceBlock.boundingBox !== 'empty') {
                        bot.placeBlock(referenceBlock, { x: 0, y: 1, z: 0 }).catch(() => {})
                    }
                }).catch(() => { })
            }
        }
    }

    // -- Inventory Walk --
    const invWalk = new Module('invwalk', 'Inventory Walk', 'Movement', 'Move while inventory/GUI is open')

    let keyListeners = {}
    let activeKeys = {
        forward: false,
        back: false,
        left: false,
        right: false,
        jump: false,
        sneak: false
    }

    const keyMap = {
        'KeyW': 'forward',
        'KeyS': 'back',
        'KeyA': 'left',
        'KeyD': 'right',
        'Space': 'jump',
        'ShiftLeft': 'sneak'
    }

    const handleKeyDown = (e) => {
        const control = keyMap[e.code]
        if (!control) return

        // Check if any modal is active (not in foreground)
        if (window.activeModalStack && window.activeModalStack.length > 0) {
            if (!activeKeys[control]) {
                activeKeys[control] = true
                if (window.bot) {
                    window.bot.setControlState(control, true)
                }
            }
        }
    }

    const handleKeyUp = (e) => {
        const control = keyMap[e.code]
        if (!control) return

        if (activeKeys[control]) {
            activeKeys[control] = false
            if (window.bot) {
                window.bot.setControlState(control, false)
            }
        }
    }

    invWalk.onToggle = (enabled) => {
        const log = window.anticlientLogger?.module('InvWalk')
        if (enabled) {
            // Add keyboard listeners
            keyListeners.down = handleKeyDown
            keyListeners.up = handleKeyUp
            window.addEventListener('keydown', keyListeners.down, true)
            window.addEventListener('keyup', keyListeners.up, true)
            if (log) log.info('Inventory Walk enabled - WASD works in GUIs')
        } else {
            // Remove keyboard listeners
            window.removeEventListener('keydown', keyListeners.down, true)
            window.removeEventListener('keyup', keyListeners.up, true)
            keyListeners = {}
            // Clear all active keys
            if (window.bot) {
                for (const control in activeKeys) {
                    if (activeKeys[control]) {
                        window.bot.setControlState(control, false)
                        activeKeys[control] = false
                    }
                }
            }
            if (log) log.info('Inventory Walk disabled')
        }
    }

    registerModule(invWalk)

    // -- Portal GUI --
    const portalGUI = new Module('portalgui', 'Portal GUI', 'Movement', 'Allow opening inventory in nether portals')

    let originalIsInPortal = null

    portalGUI.onToggle = (enabled) => {
        const log = window.anticlientLogger?.module('PortalGUI')
        if (enabled) {
            if (log) log.info('Portal GUI enabled - You can now open inventory in portals')
        } else {
            if (log) log.info('Portal GUI disabled')
        }
    }

    portalGUI.onTick = (bot) => {
        if (!bot || !bot.entity) return

        // Temporarily disable portal state to allow GUI opening
        // The game blocks GUI opening when isInPortal is true
        if (bot.entity.isInPortal) {
            // Store original value
            if (originalIsInPortal === null) {
                originalIsInPortal = bot.entity.isInPortal
            }
            // Fake that we're not in portal (only for GUI checks)
            bot.entity.isInPortal = false

            // Restore it immediately after (next tick will set it again if needed)
            setTimeout(() => {
                if (bot.entity && originalIsInPortal !== null) {
                    bot.entity.isInPortal = originalIsInPortal
                    originalIsInPortal = null
                }
            }, 10)
        }
    }

    registerModule(portalGUI)

    // -- Phase/Ghost (Wall Clipping) --
    const phase = new Module('phase', 'Phase', 'Movement', 'Walk through walls using packet manipulation', {
        mode: 'packet', // 'packet' | 'velocity'
        speed: 0.3, // Movement speed through walls
        vertical: false, // Allow vertical phasing
        autoDisable: true // Auto-disable after 5 seconds
    }, {
        mode: { type: 'dropdown', options: ['packet', 'velocity'] }
    })

    let phaseStartTime = 0
    let originalNoClip = null
    let phaseInterval = null

    phase.onToggle = (enabled) => {
        const log = window.anticlientLogger?.module('Phase')
        
        if (enabled) {
            phaseStartTime = Date.now()
            
            if (phase.settings.mode === 'packet') {
                // Packet mode: send position packets to clip through walls
                phaseInterval = setInterval(() => {
                    if (!window.bot || !window.bot._client) return
                    
                    const bot = window.bot
                    const pos = bot.entity.position
                    const yaw = bot.entity.yaw
                    
                    // Calculate movement direction
                    let dx = 0
                    let dz = 0
                    let dy = 0
                    
                    if (bot.controlState.forward) {
                        dx = -Math.sin(yaw) * phase.settings.speed
                        dz = -Math.cos(yaw) * phase.settings.speed
                    } else if (bot.controlState.back) {
                        dx = Math.sin(yaw) * phase.settings.speed
                        dz = Math.cos(yaw) * phase.settings.speed
                    }
                    
                    if (phase.settings.vertical) {
                        if (bot.controlState.jump) dy = phase.settings.speed
                        if (bot.controlState.sneak) dy = -phase.settings.speed
                    }
                    
                    // Send position packet to server (bypasses collision)
                    if (dx !== 0 || dy !== 0 || dz !== 0) {
                        bot._client.write('position', {
                            x: pos.x + dx,
                            y: pos.y + dy,
                            z: pos.z + dz,
                            onGround: false
                        })
                        
                        // Update client position
                        bot.entity.position.x += dx
                        bot.entity.position.y += dy
                        bot.entity.position.z += dz
                    }
                }, 50)
            } else {
                // Velocity mode: modify collision
                if (window.bot && window.bot.entity) {
                    originalNoClip = window.bot.entity.noClip || false
                    window.bot.entity.noClip = true
                }
            }
            
            if (log) log.info(`Phase enabled (${phase.settings.mode} mode)`)
            
            // Auto-disable after 5 seconds
            if (phase.settings.autoDisable) {
                setTimeout(() => {
                    if (phase.enabled) {
                        phase.toggle()
                        if (log) log.info('Phase auto-disabled after 5 seconds')
                    }
                }, 5000)
            }
        } else {
            // Cleanup
            if (phaseInterval) {
                clearInterval(phaseInterval)
                phaseInterval = null
            }
            
            if (originalNoClip !== null && window.bot && window.bot.entity) {
                window.bot.entity.noClip = originalNoClip
                originalNoClip = null
            }
            
            if (log) log.info('Phase disabled')
        }
    }

    phase.onTick = (bot) => {
        // Velocity mode movement
        if (phase.settings.mode === 'velocity' && bot.entity.noClip) {
            const yaw = bot.entity.yaw
            const speed = phase.settings.speed
            
            if (bot.controlState.forward) {
                bot.entity.velocity.x = -Math.sin(yaw) * speed
                bot.entity.velocity.z = -Math.cos(yaw) * speed
            } else if (bot.controlState.back) {
                bot.entity.velocity.x = Math.sin(yaw) * speed
                bot.entity.velocity.z = Math.cos(yaw) * speed
            } else {
                bot.entity.velocity.x = 0
                bot.entity.velocity.z = 0
            }
            
            if (phase.settings.vertical) {
                if (bot.controlState.jump) bot.entity.velocity.y = speed
                else if (bot.controlState.sneak) bot.entity.velocity.y = -speed
                else bot.entity.velocity.y = 0
            }
        }
    }

    registerModule(phase)
}
