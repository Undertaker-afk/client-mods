
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

    // -- Speed (Enhanced with Strafe) --
    const speed = new Module('speed', 'Speed', 'Movement', 'Moves faster on ground', { 
        groundSpeedMultiplier: 1.5,
        airSpeedMultiplier: 1.2,
        mode: 'strafe' // 'strafe' | 'forward'
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
    const blink = new Module('blink', 'Blink', 'Movement', 'Record positions and teleport back', {
        recordInterval: 50, // ms between position recordings
        maxRecordTime: 10000, // 10 seconds max
        holdKey: 'KeyB' // Key to hold for recording
    })

    let positionHistory = [] // Array of {pos, time}
    let isRecording = false
    let recordStartPos = null
    let recordStartTime = 0

    blink.onToggle = (enabled) => {
        const log = window.anticlientLogger?.module('Blink')
        if (!enabled) {
            positionHistory = []
            isRecording = false
            recordStartPos = null
            if (window.anticlient?.blinkUI) {
                window.anticlient.blinkUI.active = false
            }
            if (log) log.info('Blink disabled, history cleared')
        } else {
            if (log) log.info('Blink enabled - hold B to record path')
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

                // Limit history to maxRecordTime
                const cutoffTime = now - blink.settings.maxRecordTime
                positionHistory = positionHistory.filter(p => p.time >= cutoffTime)

                // Update UI
                if (window.anticlient?.blinkUI) {
                    window.anticlient.blinkUI.positions = positionHistory.length
                    window.anticlient.blinkUI.duration = now - recordStartTime
                }
            }
        }
    }

    // Keyboard handler for recording
    window.addEventListener('keydown', (e) => {
        if (!blink.enabled || !window.bot) return

        if (e.code === blink.settings.holdKey && !isRecording) {
            const log = window.anticlientLogger?.module('Blink')
            isRecording = true
            recordStartPos = window.bot.entity.position.clone()
            recordStartTime = Date.now()
            positionHistory = [{
                pos: recordStartPos.clone(),
                time: recordStartTime
            }]

            if (window.anticlient) {
                window.anticlient.blinkUI = {
                    active: true,
                    positions: 1,
                    duration: 0
                }
            }

            if (log) log.info('Started recording positions')
        }
    })

    window.addEventListener('keyup', (e) => {
        if (!blink.enabled || !window.bot) return

        if (e.code === blink.settings.holdKey && isRecording) {
            const log = window.anticlientLogger?.module('Blink')
            isRecording = false

            // Teleport back to start position
            if (recordStartPos && positionHistory.length > 0) {
                const startPos = positionHistory[0].pos
                window.bot.entity.position.set(startPos.x, startPos.y, startPos.z)

                if (log) log.info(`Teleported back ${positionHistory.length} positions (${((Date.now() - recordStartTime) / 1000).toFixed(1)}s)`)
            }

            // Clear history after teleport
            setTimeout(() => {
                positionHistory = []
                if (window.anticlient?.blinkUI) {
                    window.anticlient.blinkUI.active = false
                }
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
}
