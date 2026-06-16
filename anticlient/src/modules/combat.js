
import { Module, registerModule, modules, eventBus, getTargetFilter, distanceToSq, sharedEntityCache, PHYSICS } from '../core/Module.js'

export const loadCombatModules = () => {
    const logger = window.anticlientLogger?.module('Combat') || console

    // ---- Shared attack hook chain ----
    let attackHooks = []

    const applyAttackHook = (bot) => {
        if (!bot || bot._anticlientAttackHooked) return
        bot._originalAttack = bot.attack.bind(bot)
        bot._anticlientAttackHooked = true
        bot.attack = (entity) => {
            for (const hook of attackHooks) {
                try { hook(bot, entity) } catch (e) {}
            }
            return bot._originalAttack(entity)
        }
    }

    const restoreAttackHook = (bot) => {
        if (!bot || !bot._anticlientAttackHooked) return
        bot.attack = bot._originalAttack
        delete bot._originalAttack
        delete bot._anticlientAttackHooked
    }

    // ---- Shared reach value (used by Killaura and Reach) ----
    let sharedReach = 3.0

    // ---- Kill Aura (Enhanced) ----
    const killaura = new Module('killaura', 'Kill Aura', 'Combat',
        'Automatically attacks entities around you',
        {
            range: 4.5,
            speed: 10,
            fov: 360,
            wallCheck: true,
            targetSort: 'nearest',
            autoBlock: false,
            ignoreFriends: true,
            onlyAxe: false
        },
        {
            targetSort: { type: 'dropdown', options: ['nearest', 'lowestHealth', 'angle'] }
        }
    )

    killaura.onTick = (bot) => {
        if (!killaura.lastAttack) killaura.lastAttack = 0
        const now = Date.now()
        if (now - killaura.lastAttack < (1000 / killaura.settings.speed)) return

        // Respect 1.9+ attack cooldown
        if (bot.getCooldown) {
            const cooldown = bot.getCooldown()
            if (cooldown && cooldown < 0.9) return
        }

        const attackRange = modules['reach'] && modules['reach'].enabled
            ? modules['reach'].settings.reach
            : killaura.settings.range

        // Use shared entity cache
        const candidates = killaura.settings.targetSort === 'nearest'
            ? [...sharedEntityCache.all]
            : sharedEntityCache.all

        // Filter candidates
        let validTargets = candidates.filter(e => {
            if (e === bot.entity) return false
            if (e.type !== 'player' && e.type !== 'mob' && e.type !== 'hostile' && e.type !== 'animal') return false

            const distSq = distanceToSq(bot.entity.position, e.position)
            if (distSq > attackRange * attackRange) return false

            // FOV check
            if (killaura.settings.fov < 360) {
                const dp = e.position.offset(0, e.height * 0.85, 0)
                const dx = dp.x - bot.entity.position.x - 0
                const dy = dp.y - (bot.entity.position.y + bot.entity.eyeHeight)
                const dz = dp.z - bot.entity.position.z
                const yaw = bot.entity.yaw
                const pitch = bot.entity.pitch
                const dx1 = -Math.sin(yaw) * Math.cos(pitch)
                const dy1 = Math.sin(pitch)
                const dz1 = -Math.cos(yaw) * Math.cos(pitch)
                const dot = dx * dx1 + dy * dy1 + dz * dz1
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
                const angle = Math.acos(dot / dist) * (180 / Math.PI)
                if (angle > killaura.settings.fov / 2) return false
            }

            // Wall check
            if (killaura.settings.wallCheck && bot.canSeeEntity) {
                try {
                    if (!bot.canSeeEntity(e)) return false
                } catch (err) {}
            }

            // Friends check
            if (killaura.settings.ignoreFriends && window.anticlient?.friends?.includes(e.username)) {
                return false
            }

            return true
        })

        // Sort targets
        if (killaura.settings.targetSort === 'lowestHealth') {
            validTargets.sort((a, b) => (a.health || 20) - (b.health || 20))
        } else if (killaura.settings.targetSort === 'angle') {
            validTargets.sort((a, b) => {
                const ya = Math.abs(bot.entity.yaw - Math.atan2(-(a.position.x - bot.entity.position.x), -(a.position.z - bot.entity.position.z)))
                const yb = Math.abs(bot.entity.yaw - Math.atan2(-(b.position.x - bot.entity.position.x), -(b.position.z - bot.entity.position.z)))
                return ya - yb
            })
        }

        const target = validTargets[0]
        if (target) {
            bot.lookAt(target.position.offset(0, target.height * 0.85, 0))
            bot.attack(target)
            killaura.lastAttack = now
        }
    }

    registerModule(killaura)

    // ---- Aimbot (time-based smoothing) ----
    const aimbot = new Module('aimbot', 'Aimbot', 'Combat',
        'Smooth aim towards nearest entity',
        { range: 6.0, smoothness: 0.3, target: 'both' },
        { target: { type: 'dropdown', options: ['players', 'mobs', 'both'] } }
    )

    let aimbotLastTime = 0
    aimbot.onTick = (bot) => {
        const filter = getTargetFilter(aimbot.settings.target)

        const target = bot.nearestEntity(e =>
            filter(e) &&
            distanceToSq(bot.entity.position, e.position) < aimbot.settings.range * aimbot.settings.range &&
            e !== bot.entity
        )

        if (target) {
            const eyePos = bot.entity.position.offset(0, bot.entity.eyeHeight, 0)
            const delta = target.position.offset(0, target.height * 0.85, 0).minus(eyePos)
            const targetYaw = Math.atan2(-delta.x, -delta.z)
            const groundDistance = Math.sqrt(delta.x * delta.x + delta.z * delta.z)
            const targetPitch = Math.atan2(delta.y, groundDistance)

            // Time-based smoothing
            const now = performance.now()
            const dt = Math.min(now - (aimbotLastTime || now), 100) / 1000
            aimbotLastTime = now
            const smooth = Math.pow(aimbot.settings.smoothness, dt * 60)

            bot.look(
                bot.entity.yaw + (targetYaw - bot.entity.yaw) * (1 - smooth),
                bot.entity.pitch + (targetPitch - bot.entity.pitch) * (1 - smooth),
                false
            )
        }
    }
    registerModule(aimbot)

    // ---- Reach Extension ----
    const reach = new Module('reach', 'Reach', 'Combat', 'Extend attack range', { reach: 3.5 })
    reach.onSettingChanged = (key, value) => {
        if (key === 'reach') sharedReach = value
    }
    reach.onToggle = (enabled) => {
        if (enabled) sharedReach = reach.settings.reach
    }
    registerModule(reach)

    // ---- Target Lock ----
    let lockedTarget = null

    const targetLock = new Module('targetlock', 'Target Lock', 'Combat',
        'Lock onto a target so modules don\'t flip between entities',
        { stickiness: 3, range: 10 }
    )

    let lockFramesUntilReeval = 0
    targetLock.onTick = (bot) => {
        if (lockFramesUntilReeval > 0) {
            lockFramesUntilReeval--
            return
        }
        lockFramesUntilReeval = targetLock.settings.stickiness

        if (lockedTarget && bot.entities[lockedTarget.id]) {
            // Keep lock if still valid
            const dist = distanceToSq(bot.entity.position, lockedTarget.position)
            if (dist > targetLock.settings.range * targetLock.settings.range) {
                lockedTarget = null
            }
        } else {
            lockedTarget = null
        }
    }

    // Expose target lock to other modules
    targetLock.getTarget = () => lockedTarget
    targetLock.setTarget = (entity) => { lockedTarget = entity; lockFramesUntilReeval = targetLock.settings.stickiness }
    targetLock.clearTarget = () => { lockedTarget = null }
    registerModule(targetLock)

    // ---- ClickTriggerBot ----
    const triggerBot = new Module('triggerbot', 'TriggerBot', 'Combat',
        'Attack when crosshair is on target (legit alternative)',
        { onlyPlayers: true, cooldownAware: true }
    )

    triggerBot.onTick = (bot) => {
        if (!bot.entityAtCursor) return
        try {
            const entity = bot.entityAtCursor()
            if (!entity) return
            if (triggerBot.settings.onlyPlayers && entity.type !== 'player') return

            if (triggerBot.settings.cooldownAware && bot.getCooldown) {
                const cd = bot.getCooldown()
                if (cd && cd < 0.85) return
            }

            bot.attack(entity)
        } catch (e) {}
    }
    registerModule(triggerBot)

    // ---- Criticals (with shared hook chain) ----
    const criticals = new Module('criticals', 'Criticals', 'Combat',
        'Deal critical hits',
        { mode: 'Packet', jumpHeight: 1.0 },
        { mode: { type: 'dropdown', options: ['Legit', 'Packet', 'MiniJump', 'GroundSpoof'] } }
    )

    const sendCriticalPackets = (bot) => {
        if (!bot._client) return
        const pos = bot.entity.position

        if (criticals.settings.mode === 'Packet') {
            const offsets = [PHYSICS.CRIT_OFFSET, 0.0, PHYSICS.CRIT_OFFSET, 0.0]
            offsets.forEach(offset => {
                bot._client.write('position', { x: pos.x, y: pos.y + offset, z: pos.z, onGround: false })
            })
        } else if (criticals.settings.mode === 'MiniJump') {
            bot._client.write('position', { x: pos.x, y: pos.y + PHYSICS.JUMP_VELOCITY * 0.42, z: pos.z, onGround: false })
            setTimeout(() => {
                if (bot._client) bot._client.write('position', { x: pos.x, y: pos.y, z: pos.z, onGround: true })
            }, 50)
        } else if (criticals.settings.mode === 'GroundSpoof') {
            bot._client.write('position', { x: pos.x, y: pos.y + 0.001, z: pos.z, onGround: false })
        }
    }

    criticals.onEnable = (bot) => {
        if (!bot) return
        applyAttackHook(bot)

        const hook = (b, entity) => {
            if (criticals.enabled) {
                if (criticals.settings.mode === 'Packet' || criticals.settings.mode === 'MiniJump' || criticals.settings.mode === 'GroundSpoof') {
                    sendCriticalPackets(b)
                } else if (criticals.settings.mode === 'Legit') {
                    if (b.entity.onGround) {
                        b.entity.velocity.y = PHYSICS.JUMP_VELOCITY * criticals.settings.jumpHeight
                    }
                }
            }
        }
        attackHooks.push(hook)
        criticals._hook = hook
        logger.info(`Criticals enabled - Mode: ${criticals.settings.mode}`)
    }

    criticals.onDisable = (bot) => {
        if (criticals._hook) {
            attackHooks = attackHooks.filter(h => h !== criticals._hook)
            delete criticals._hook
        }
        if (attackHooks.length === 0 && bot) {
            restoreAttackHook(bot)
        }
        logger.info('Criticals disabled')
    }

    criticals.onSettingChanged = (key, newValue) => {
        if (key === 'mode') logger.info(`Criticals mode changed to: ${newValue}`)
    }
    registerModule(criticals)

    // ---- Velocity/Anti-Knockback (packet-based) ----
    const velocity = new Module('velocity', 'AntiKnockback', 'Combat',
        'Cancel knockback',
        { horizontal: true, vertical: false, strength: 0.0 }
    )

    let velocityPacketHandler = null

    velocity.onEnable = (bot) => {
        if (!bot || !bot._client) return
        velocityPacketHandler = (parsed) => {
            if (!velocity.enabled) return
            if (velocity.settings.horizontal && velocity.settings.strength < 1.0) {
                const reduction = 1 - velocity.settings.strength
                bot.entity.velocity.x *= reduction
                bot.entity.velocity.z *= reduction
            }
            if (velocity.settings.vertical && velocity.settings.strength < 1.0) {
                bot.entity.velocity.y *= 1 - velocity.settings.strength
            }
        }
        bot._client.on('entity_velocity', velocityPacketHandler)
    }

    velocity.onDisable = (bot) => {
        if (velocityPacketHandler && bot && bot._client) {
            bot._client.removeListener('entity_velocity', velocityPacketHandler)
            velocityPacketHandler = null
        }
    }
    registerModule(velocity)

    // ---- Auto-Totem (Enhanced) ----
    const autoTotem = new Module('autototem', 'Auto Totem', 'Combat',
        'Auto-equip totem in offhand',
        { healthThreshold: 16, checkInterval: 5, postPopDelay: 1000 }
    )

    let totemTick = 0
    let lastTotemPop = 0

    autoTotem.onEnable = (bot) => {
        if (!bot) return
        const onDeath = () => {
            lastTotemPop = Date.now()
        }
        bot.on('death', onDeath)
        autoTotem._deathHandler = onDeath
    }

    autoTotem.onDisable = (bot) => {
        if (autoTotem._deathHandler && bot) {
            bot.removeListener('death', autoTotem._deathHandler)
            delete autoTotem._deathHandler
        }
    }

    autoTotem.onTick = (bot) => {
        if (!bot.inventory?.slots) return

        totemTick++
        if (totemTick % autoTotem.settings.checkInterval !== 0) return

        // Post-pop cooldown
        if (Date.now() - lastTotemPop < autoTotem.settings.postPopDelay) return

        const offhandItem = bot.inventory.slots[45]

        // Don't interrupt if player is eating or using item
        if (bot.usingHeldItem) return

        const hasTotem = offhandItem && (offhandItem.name === 'totem_of_undying' || offhandItem.name.includes('totem'))

        if (!hasTotem) {
            const totem = bot.inventory.items().find(item =>
                item.name === 'totem_of_undying' || item.name.includes('totem')
            )
            if (totem) {
                bot.equip(totem, 'off-hand').catch(() => {})
            }
        }
    }
    registerModule(autoTotem)

    // ---- Auto-Soup ----
    const autoSoup = new Module('autosoup', 'Auto Soup', 'Combat',
        'Auto-consume soup/potions',
        { healthThreshold: 16, itemType: 'soup' },
        { itemType: { type: 'dropdown', options: ['soup', 'potion', 'both'] } }
    )

    autoSoup.onTick = (bot) => {
        if (!bot.inventory?.slots) return
        if (bot.health > autoSoup.settings.healthThreshold || autoSoup.eating) return

        // Don't interrupt combat
        if (bot.targetDigBlock || (bot.pathfinder?.isMoving?.())) return

        let item = null
        if (autoSoup.settings.itemType === 'soup' || autoSoup.settings.itemType === 'both') {
            item = bot.inventory.items().find(i => i.name.includes('soup') || i.name.includes('stew'))
        }
        if (!item && (autoSoup.settings.itemType === 'potion' || autoSoup.settings.itemType === 'both')) {
            item = bot.inventory.items().find(i =>
                i.name.includes('potion') && (i.name.includes('healing') || i.name.includes('regeneration'))
            )
        }

        if (item) {
            autoSoup.eating = true
            bot.equip(item, 'hand').then(() => bot.consume()).then(() => {
                autoSoup.eating = false
            }).catch(() => { autoSoup.eating = false })
        }
    }
    registerModule(autoSoup)

    // ---- Auto Armor ----
    const autoArmor = new Module('autoarmor', 'Auto Armor', 'Combat',
        'Equip best armor',
        { checkInterval: 20 }
    )

    let aaTick = 0
    let equippingArmor = false

    const armorSlots = { head: 5, torso: 6, legs: 7, feet: 8 }

    const getArmorValue = (itemName) => {
        if (!itemName || itemName === 'air') return 0
        if (itemName.includes('diamond')) return 100
        if (itemName.includes('netherite')) return 110
        if (itemName.includes('iron')) return 80
        if (itemName.includes('gold')) return 60
        if (itemName.includes('chain')) return 50
        if (itemName.includes('leather')) return 40
        if (itemName.includes('helmet') || itemName.includes('cap')) return 20
        if (itemName.includes('chestplate') || itemName.includes('tunic')) return 20
        if (itemName.includes('leggings') || itemName.includes('pants')) return 20
        if (itemName.includes('boots')) return 20
        return 0
    }

    autoArmor.onTick = async (bot) => {
        if (!bot.inventory?.slots) return

        aaTick++
        if (aaTick % autoArmor.settings.checkInterval !== 0 || equippingArmor) return

        // Don't interrupt combat
        if (bot.targetDigBlock) return

        equippingArmor = true
        try {
            for (const [slotName, slotId] of Object.entries(armorSlots)) {
                const currentArmor = bot.inventory.slots[slotId]
                const currentValue = getArmorValue(currentArmor?.name)

                const betterArmor = bot.inventory.items().find(item => {
                    if (item.slot === slotId) return false
                    if (item.slot < 9 || item.slot >= 36) return false
                    if (getArmorValue(item.name) <= currentValue) return false
                    if (slotName === 'head' && !item.name.includes('helmet') && !item.name.includes('cap')) return false
                    if (slotName === 'torso' && !item.name.includes('chestplate') && !item.name.includes('tunic')) return false
                    if (slotName === 'legs' && !item.name.includes('leggings') && !item.name.includes('pants')) return false
                    if (slotName === 'feet' && !item.name.includes('boots')) return false
                    return true
                })

                if (betterArmor) {
                    try {
                        await bot.equip(betterArmor, slotName)
                        await new Promise(resolve => setTimeout(resolve, 100))
                    } catch (e) {}
                }
            }
        } catch (e) {
            console.error('Auto-armor error:', e)
        } finally {
            equippingArmor = false
        }
    }
    registerModule(autoArmor)

    // ---- W-Tap ----
    const wtap = new Module('wtap', 'W-Tap', 'Combat',
        'Auto sprint reset for better knockback',
        { mode: 'W', delay: 50, onlyOnHit: true },
        { mode: { type: 'dropdown', options: ['W', 'S', 'Sprint'] } }
    )

    let lastWtapTime = 0
    let wtapActive = false

    wtap.onEnable = (bot) => {
        if (!bot) return
        applyAttackHook(bot)
        const hook = (b, entity) => {
            if (wtap.enabled && wtap.settings.onlyOnHit) {
                performWtap()
            }
        }
        attackHooks.push(hook)
        wtap._hook = hook
    }

    wtap.onDisable = (bot) => {
        if (wtap._hook) {
            attackHooks = attackHooks.filter(h => h !== wtap._hook)
            delete wtap._hook
        }
        if (attackHooks.length === 0 && bot) {
            restoreAttackHook(bot)
        }
    }

    const performWtap = () => {
        const now = Date.now()
        if (now - lastWtapTime < wtap.settings.delay * 2 || wtapActive) return
        wtapActive = true
        lastWtapTime = now
        const b = window.bot
        if (!b) return

        if (wtap.settings.mode === 'W') {
            b.setControlState('forward', false)
            setTimeout(() => { b.setControlState('forward', true); wtapActive = false }, wtap.settings.delay)
        } else if (wtap.settings.mode === 'S') {
            b.setControlState('back', true)
            setTimeout(() => { b.setControlState('back', false); wtapActive = false }, wtap.settings.delay)
        } else if (wtap.settings.mode === 'Sprint') {
            b.setSprinting(false)
            setTimeout(() => { b.setSprinting(true); wtapActive = false }, wtap.settings.delay)
        }
    }

    wtap.onTick = (bot) => {
        if (!wtap.settings.onlyOnHit && bot.controlState.attack) {
            performWtap()
        }
    }

    registerModule(wtap)

    // ---- Bow Aimbot (Enhanced) ----
    const bowAimbot = new Module('bowaimbot', 'Bow Aimbot', 'Combat',
        'Predict and aim at moving targets with bow/projectiles',
        {
            range: 32,
            target: 'players',
            predict: true,
            gravity: PHYSICS.GRAVITY,
            velocity: 3.0,
            autoCharge: true,
            chargeTime: 1000,
            leadAmount: 1.0,
            visualize: true,
            stickiness: 10
        },
        { target: { type: 'dropdown', options: ['players', 'mobs', 'both'] } }
    )

    let chargingBow = false
    let chargeStartTime = 0
    let predictedHitPos = null
    let bowLockedTarget = null
    let bowStickTicks = 0

    const predictProjectileHit = (bot, target, velocity, gravity) => {
        if (!target || !bot.entity) return null
        const shooterPos = bot.entity.position.offset(0, bot.entity.eyeHeight, 0)
        const targetPos = target.position.offset(0, target.height / 2, 0)
        const targetVel = target.velocity || { x: 0, y: 0, z: 0 }
        let bestTime = 0
        let bestError = Infinity

        for (let t = 0; t < 100; t += 0.05) {
            const predictedTarget = {
                x: targetPos.x + targetVel.x * t * PHYSICS.TPS,
                y: targetPos.y + targetVel.y * t * PHYSICS.TPS,
                z: targetPos.z + targetVel.z * t * PHYSICS.TPS
            }
            const dx = predictedTarget.x - shooterPos.x
            const dy = predictedTarget.y - shooterPos.y
            const dz = predictedTarget.z - shooterPos.z
            const horizontalDist = Math.sqrt(dx * dx + dz * dz)
            const arrivalTime = horizontalDist / velocity
            const arrowY = shooterPos.y + (velocity * Math.sin(Math.atan2(dy, horizontalDist)) * arrivalTime) - (0.5 * gravity * arrivalTime * arrivalTime * (PHYSICS.TPS * PHYSICS.TPS))
            const error = Math.abs(arrowY - predictedTarget.y)
            if (error < bestError) { bestError = error; bestTime = arrivalTime }
            if (error < 0.1) break
        }

        return {
            x: targetPos.x + targetVel.x * bestTime * PHYSICS.TPS * bowAimbot.settings.leadAmount,
            y: targetPos.y + targetVel.y * bestTime * PHYSICS.TPS * bowAimbot.settings.leadAmount,
            z: targetPos.z + targetVel.z * bestTime * PHYSICS.TPS * bowAimbot.settings.leadAmount
        }
    }

    const calculateProjectileAngle = (bot, targetPos, velocity, gravity) => {
        const shooterPos = bot.entity.position.offset(0, bot.entity.eyeHeight, 0)
        const dx = targetPos.x - shooterPos.x
        const dy = targetPos.y - shooterPos.y
        const dz = targetPos.z - shooterPos.z
        const horizontalDist = Math.sqrt(dx * dx + dz * dz)
        const yaw = Math.atan2(-dx, -dz)
        const v2 = velocity * velocity
        const v4 = v2 * v2
        const g = gravity * (PHYSICS.TPS * PHYSICS.TPS)
        const x = horizontalDist
        const y = dy
        const underSqrt = v4 - g * (g * x * x + 2 * y * v2)
        if (underSqrt < 0) {
            return { yaw, pitch: Math.atan2(dy, horizontalDist) }
        }
        const pitch = Math.atan((v2 - Math.sqrt(underSqrt)) / (g * x))
        return { yaw, pitch }
    }

    bowAimbot.onTick = (bot) => {
        if (!bot.heldItem || !bot.heldItem.name.includes('bow')) {
            chargingBow = false
            predictedHitPos = null
            bowLockedTarget = null
            return
        }

        const filter = getTargetFilter(bowAimbot.settings.target)

        // Target stickiness
        if (bowLockedTarget && bowStickTicks > 0) {
            bowStickTicks--
            // Check if locked target still valid
            if (!bot.entities[bowLockedTarget.id] ||
                distanceToSq(bot.entity.position, bowLockedTarget.position) > bowAimbot.settings.range * bowAimbot.settings.range) {
                bowLockedTarget = null
            }
        }

        if (!bowLockedTarget) {
            bowLockedTarget = bot.nearestEntity(e =>
                filter(e) &&
                distanceToSq(bot.entity.position, e.position) < bowAimbot.settings.range * bowAimbot.settings.range &&
                e !== bot.entity
            )
            bowStickTicks = bowAimbot.settings.stickiness
        }

        if (!bowLockedTarget) {
            chargingBow = false
            predictedHitPos = null
            return
        }

        const chargeLevel = chargingBow ? Math.min(1.0, (Date.now() - chargeStartTime) / bowAimbot.settings.chargeTime) : 0
        const currentVelocity = bowAimbot.settings.velocity * (0.5 + chargeLevel * 0.5)

        if (bowAimbot.settings.predict) {
            predictedHitPos = predictProjectileHit(bot, bowLockedTarget, currentVelocity, bowAimbot.settings.gravity)
        } else {
            predictedHitPos = {
                x: bowLockedTarget.position.x,
                y: bowLockedTarget.position.y + bowLockedTarget.height / 2,
                z: bowLockedTarget.position.z
            }
        }

        if (predictedHitPos) {
            const angles = calculateProjectileAngle(bot, predictedHitPos, currentVelocity, bowAimbot.settings.gravity)
            bot.look(angles.yaw, angles.pitch, false)

            if (bowAimbot.settings.autoCharge) {
                if (!chargingBow) {
                    bot.activateItem()
                    chargingBow = true
                    chargeStartTime = Date.now()
                } else if (chargeLevel >= 1.0) {
                    bot.deactivateItem()
                    chargingBow = false
                }
            }

            if (bowAimbot.settings.visualize) {
                if (!window.anticlient) window.anticlient = { visuals: {} }
                if (!window.anticlient.visuals) window.anticlient.visuals = {}
                window.anticlient.visuals.projectilePrediction = {
                    enabled: true,
                    from: bot.entity.position.offset(0, bot.entity.eyeHeight, 0),
                    to: predictedHitPos,
                    target: bowLockedTarget.position,
                    charge: chargeLevel
                }
            }
        }
    }

    bowAimbot.onToggle = (enabled) => {
        if (!enabled) {
            chargingBow = false
            predictedHitPos = null
            bowLockedTarget = null
            if (window.anticlient?.visuals) {
                window.anticlient.visuals.projectilePrediction = { enabled: false }
            }
        }
    }

    registerModule(bowAimbot)

    // ---- Humanizer ----
    const humanizer = new Module('humanizer', 'Humanizer', 'Combat',
        'Add randomization to make aim less robotic',
        { yawNoise: 0.5, pitchNoise: 0.2, missChance: 0.0, delayNoise: 50 }
    )

    humanizer.onTick = (bot) => { /* Humanizer applies noise in the render hook via visuals */ }
    registerModule(humanizer)

    logger.info('Combat modules loaded')
}
