
import { Module, registerModule, modules } from '../core/Module.js'

export const loadCombatModules = () => {
    const logger = window.anticlientLogger?.module('Combat') || console
    // Store references for cross-module integration
    let criticalsModule = null

    const killaura = new Module('killaura', 'Kill Aura', 'Combat', 'Automatically attacks entities around you', { range: 4.5, speed: 10 })
    killaura.onTick = (bot) => {
        if (!killaura.lastAttack) killaura.lastAttack = 0
        const now = Date.now()
        if (now - killaura.lastAttack < (1000 / killaura.settings.speed)) return

        // Use extended reach if reach module is enabled
        const reachModule = modules['reach']
        const attackRange = reachModule && reachModule.enabled ? reachModule.settings.reach : killaura.settings.range

        const target = bot.nearestEntity(e => (e.type === 'player' || e.type === 'mob') && e.position.distanceTo(bot.entity.position) < attackRange && e !== bot.entity)
        if (target) {
            bot.lookAt(target.position.offset(0, target.height * 0.85, 0))
            bot.attack(target) // Criticals are now handled in the attack override
            killaura.lastAttack = now
        }
    }
    registerModule(killaura)

    // -- Aimbot --
    const aimbot = new Module('aimbot', 'Aimbot', 'Combat', 'Smooth aim towards nearest entity', {
        range: 6.0,
        smoothness: 0.3, // 0 = instant, 1 = very smooth
        target: 'both' // 'players' | 'mobs' | 'both'
    })
    let currentYaw = 0
    let currentPitch = 0
    aimbot.onTick = (bot) => {
        if (!aimbot.enabled) return
        
        const filter = aimbot.settings.target === 'players' ? (e => e.type === 'player') :
                      aimbot.settings.target === 'mobs' ? (e => e.type === 'mob') :
                      (e => e.type === 'player' || e.type === 'mob')
        
        const target = bot.nearestEntity(e => 
            filter(e) && 
            e.position.distanceTo(bot.entity.position) < aimbot.settings.range && 
            e !== bot.entity
        )
        
        if (target) {
            const eyePos = bot.entity.position.offset(0, bot.entity.eyeHeight, 0)
            const delta = target.position.offset(0, target.height * 0.85, 0).minus(eyePos)
            const targetYaw = Math.atan2(-delta.x, -delta.z)
            const groundDistance = Math.sqrt(delta.x * delta.x + delta.z * delta.z)
            const targetPitch = Math.atan2(delta.y, groundDistance)
            
            // Smooth interpolation
            const smooth = aimbot.settings.smoothness
            currentYaw = bot.entity.yaw + (targetYaw - bot.entity.yaw) * (1 - smooth)
            currentPitch = bot.entity.pitch + (targetPitch - bot.entity.pitch) * (1 - smooth)
            
            bot.look(currentYaw, currentPitch, false)
        }
    }
    registerModule(aimbot)

    // -- Reach Extension --
    const reach = new Module('reach', 'Reach', 'Combat', 'Extend attack range', { reach: 3.5 })
    reach.onTick = (bot) => {
        // Reach extension is handled by modifying the range check in killaura
        // The actual server-side reach is limited, but we can extend client-side detection
    }
    registerModule(reach)

    // -- Criticals (Packet & Legit) --
    const criticals = new Module('criticals', 'Criticals', 'Combat', 'Deal critical hits', {
        mode: 'Packet',
        jumpHeight: 1.0
    }, {
        mode: { type: 'dropdown', options: ['Legit', 'Packet'] }
    })
    criticalsModule = criticals

    // Store last attack time to trigger criticals
    let lastCriticalAttack = 0

    // Hook into bot attack to send critical packets
    criticals.onEnable = (bot) => {
        if (!bot._client) return

        logger.info(`Criticals enabled - Mode: ${criticals.settings.mode}`)

        // Store original attack function
        if (!criticals._originalAttack) {
            criticals._originalAttack = bot.attack.bind(bot)
        }

        // Override attack function
        bot.attack = (entity) => {
            if (criticals.enabled && criticals.settings.mode === 'Packet') {
                // Send packet-based critical
                logger.debug('Sending critical packets')
                sendCriticalPackets(bot)
            } else if (criticals.enabled && criticals.settings.mode === 'Legit') {
                // Legit mode: jump if on ground
                if (bot.entity.onGround) {
                    logger.debug('Legit critical jump')
                    bot.entity.velocity.y = 0.42 * criticals.settings.jumpHeight
                }
            }

            // Call original attack
            criticals._originalAttack(entity)
        }
    }

    criticals.onDisable = (bot) => {
        logger.info('Criticals disabled')
        // Restore original attack function
        if (criticals._originalAttack) {
            bot.attack = criticals._originalAttack
        }
    }

    criticals.onSettingChanged = (key, newValue) => {
        if (key === 'mode') {
            logger.info(`Criticals mode changed to: ${newValue}`)
        }
    }

    // Send critical hit packets (NCP bypass method)
    const sendCriticalPackets = (bot) => {
        if (!bot._client) return

        const pos = bot.entity.position

        // Method 1: Mini jump packets (most reliable)
        // Send position packets that simulate a small jump
        const offsets = [0.0625, 0.0, 0.0625, 0.0]

        offsets.forEach(offset => {
            bot._client.write('position', {
                x: pos.x,
                y: pos.y + offset,
                z: pos.z,
                onGround: false
            })
        })

        // Alternative Method 2: Single jump packet (faster but less reliable)
        // bot._client.write('position', {
        //     x: pos.x,
        //     y: pos.y + 0.1,
        //     z: pos.z,
        //     onGround: false
        // })
        // bot._client.write('position', {
        //     x: pos.x,
        //     y: pos.y,
        //     z: pos.z,
        //     onGround: true
        // })
    }

    criticals.onTick = (bot) => {
        // Legit mode logic is handled in killaura integration
        // Packet mode is handled in attack override
    }

    registerModule(criticals)

    // -- Velocity/Anti-Knockback (Enhanced) --
    const velocity = new Module('velocity', 'AntiKnockback', 'Combat', 'Cancel knockback', {
        horizontal: true,
        vertical: false,
        strength: 0.0 // 0 = full cancel, 1 = no cancel
    })
    velocity.onTick = (bot) => {
        if (velocity.settings.horizontal && velocity.settings.strength < 1.0) {
            const reduction = 1 - velocity.settings.strength
            bot.entity.velocity.x *= reduction
            bot.entity.velocity.z *= reduction
        }
        if (velocity.settings.vertical && velocity.settings.strength < 1.0) {
            const reduction = 1 - velocity.settings.strength
            bot.entity.velocity.y *= reduction
        }
    }
    registerModule(velocity)

    // -- Auto-Totem --
    const autoTotem = new Module('autototem', 'Auto Totem', 'Combat', 'Auto-equip totem in offhand', {
        healthThreshold: 16, // Half hearts
        checkInterval: 5 // Ticks
    })
    let totemTick = 0
    autoTotem.onTick = (bot) => {
        if (!bot.inventory || !bot.inventory.slots) return // Guard against undefined inventory
        
        totemTick++
        if (totemTick % autoTotem.settings.checkInterval !== 0) return
        
        // Check if we need totem
        const needsTotem = bot.health <= autoTotem.settings.healthThreshold
        const offhandItem = bot.inventory.slots[45] // Offhand slot
        
        if (needsTotem && (!offhandItem || offhandItem.name !== 'totem_of_undying')) {
            // Find totem in inventory
            const totem = bot.inventory.items().find(item => item.name === 'totem_of_undying')
            if (totem) {
                bot.equip(totem, 'off-hand').catch(() => {})
            }
        }
    }
    registerModule(autoTotem)

    // -- Auto-Soup/Potion --
    const autoSoup = new Module('autosoup', 'Auto Soup', 'Combat', 'Auto-consume soup/potions', {
        healthThreshold: 16,
        itemType: 'soup' // 'soup' | 'potion' | 'both'
    })
    autoSoup.onTick = (bot) => {
        if (!bot.inventory || !bot.inventory.slots) return // Guard against undefined inventory
        
        if (bot.health <= autoSoup.settings.healthThreshold && !autoSoup.eating) {
            let item = null
            if (autoSoup.settings.itemType === 'soup' || autoSoup.settings.itemType === 'both') {
                item = bot.inventory.items().find(i => i.name.includes('soup') || i.name.includes('stew'))
            }
            if (!item && (autoSoup.settings.itemType === 'potion' || autoSoup.settings.itemType === 'both')) {
                item = bot.inventory.items().find(i => i.name.includes('potion') && (i.name.includes('healing') || i.name.includes('regeneration')))
            }
            
            if (item) {
                autoSoup.eating = true
                bot.equip(item, 'hand').then(() => bot.consume()).then(() => {
                    autoSoup.eating = false
                }).catch(() => {
                    autoSoup.eating = false
                })
            }
        }
    }
    registerModule(autoSoup)

    // -- AutoArmor --
    const autoArmor = new Module('autoarmor', 'Auto Armor', 'Combat', 'Equip best armor', {
        checkInterval: 20 // Ticks
    })
    let aaTick = 0
    let equippingArmor = false
    
    // Armor slot mapping
    const armorSlots = {
        head: 5,
        torso: 6,
        legs: 7,
        feet: 8
    }
    
    // Armor value mapping (simplified - higher number = better)
    const getArmorValue = (itemName) => {
        if (!itemName || itemName === 'air') return 0
        
        // Diamond > Netherite > Iron > Gold > Leather > Chain
        if (itemName.includes('diamond')) return 100
        if (itemName.includes('netherite')) return 110
        if (itemName.includes('iron')) return 80
        if (itemName.includes('gold')) return 60
        if (itemName.includes('chain')) return 50
        if (itemName.includes('leather')) return 40
        
        // Check armor type
        if (itemName.includes('helmet') || itemName.includes('cap')) return 20
        if (itemName.includes('chestplate') || itemName.includes('tunic')) return 20
        if (itemName.includes('leggings') || itemName.includes('pants')) return 20
        if (itemName.includes('boots')) return 20
        
        return 0
    }
    
    autoArmor.onTick = async (bot) => {
        if (!bot.inventory || !bot.inventory.slots) return // Guard against undefined inventory
        
        aaTick++
        if (aaTick % autoArmor.settings.checkInterval !== 0 || equippingArmor) return
        
        equippingArmor = true
        try {
            // Check each armor slot
            for (const [slotName, slotId] of Object.entries(armorSlots)) {
                const currentArmor = bot.inventory.slots[slotId]
                const currentValue = getArmorValue(currentArmor?.name)
                
                // Find better armor in inventory
                const betterArmor = bot.inventory.items().find(item => {
                    if (item.slot === slotId) return false // Already equipped
                    if (item.slot < 9 || item.slot >= 36) return false // Not in main inventory
                    
                    const itemValue = getArmorValue(item.name)
                    if (itemValue <= currentValue) return false
                    
                    // Check if it's the right armor type
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
                    } catch (e) {
                        // Ignore errors
                    }
                }
            }
        } catch (e) {
            console.error('Auto-armor error:', e)
        } finally {
            equippingArmor = false
        }
    }
    registerModule(autoArmor)

    // -- Bow Aimbot with Projectile Prediction --
    const bowAimbot = new Module('bowaimbot', 'Bow Aimbot', 'Combat', 'Predict and aim at moving targets with bow/projectiles', {
        range: 32,
        target: 'players', // 'players' | 'mobs' | 'both'
        predict: true, // Enable movement prediction
        gravity: 0.05, // Arrow gravity
        velocity: 3.0, // Arrow velocity (depends on charge)
        autoCharge: true, // Auto-release at full charge
        chargeTime: 1000, // ms for full charge
        leadAmount: 1.0, // Lead multiplier (1.0 = perfect lead)
        visualize: true // Show prediction line
    }, {
        target: { type: 'dropdown', options: ['players', 'mobs', 'both'] }
    })

    let chargingBow = false
    let chargeStartTime = 0
    let predictedHitPos = null

    // Calculate arrow trajectory and predict hit position
    const predictProjectileHit = (bot, target, velocity, gravity) => {
        if (!target || !bot.entity) return null

        const shooterPos = bot.entity.position.offset(0, bot.entity.eyeHeight, 0)
        const targetPos = target.position.offset(0, target.height / 2, 0)
        
        // Get target velocity
        const targetVel = target.velocity || { x: 0, y: 0, z: 0 }
        
        // Iterative prediction
        let bestTime = 0
        let bestError = Infinity
        
        for (let t = 0; t < 100; t += 0.05) {
            // Predict target position at time t
            const predictedTarget = {
                x: targetPos.x + targetVel.x * t * 20, // Convert ticks to seconds
                y: targetPos.y + targetVel.y * t * 20,
                z: targetPos.z + targetVel.z * t * 20
            }
            
            // Calculate required arrow trajectory
            const dx = predictedTarget.x - shooterPos.x
            const dy = predictedTarget.y - shooterPos.y
            const dz = predictedTarget.z - shooterPos.z
            const horizontalDist = Math.sqrt(dx * dx + dz * dz)
            
            // Time for arrow to reach target horizontally
            const arrivalTime = horizontalDist / velocity
            
            // Calculate where arrow would be at this time
            const arrowY = shooterPos.y + (velocity * Math.sin(Math.atan2(dy, horizontalDist)) * arrivalTime) - (0.5 * gravity * arrivalTime * arrivalTime * 400)
            
            // Error between predicted target Y and arrow Y
            const error = Math.abs(arrowY - predictedTarget.y)
            
            if (error < bestError) {
                bestError = error
                bestTime = arrivalTime
            }
            
            // Good enough
            if (error < 0.1) break
        }
        
        // Return predicted hit position
        return {
            x: targetPos.x + targetVel.x * bestTime * 20 * bowAimbot.settings.leadAmount,
            y: targetPos.y + targetVel.y * bestTime * 20 * bowAimbot.settings.leadAmount,
            z: targetPos.z + targetVel.z * bestTime * 20 * bowAimbot.settings.leadAmount
        }
    }

    // Calculate pitch and yaw for projectile trajectory
    const calculateProjectileAngle = (bot, targetPos, velocity, gravity) => {
        const shooterPos = bot.entity.position.offset(0, bot.entity.eyeHeight, 0)
        const dx = targetPos.x - shooterPos.x
        const dy = targetPos.y - shooterPos.y
        const dz = targetPos.z - shooterPos.z
        
        const horizontalDist = Math.sqrt(dx * dx + dz * dz)
        const yaw = Math.atan2(-dx, -dz)
        
        // Solve ballistic trajectory equation
        const v2 = velocity * velocity
        const v4 = v2 * v2
        const g = gravity * 400 // Scale gravity
        const x = horizontalDist
        const y = dy
        
        // Quadratic formula for launch angle
        const underSqrt = v4 - g * (g * x * x + 2 * y * v2)
        
        if (underSqrt < 0) {
            // Target out of range, aim directly
            return {
                yaw: yaw,
                pitch: Math.atan2(dy, horizontalDist)
            }
        }
        
        const pitch = Math.atan((v2 - Math.sqrt(underSqrt)) / (g * x))
        
        return { yaw, pitch }
    }

    bowAimbot.onTick = (bot) => {
        if (!bot.heldItem || !bot.heldItem.name.includes('bow')) {
            chargingBow = false
            predictedHitPos = null
            return
        }

        const filter = bowAimbot.settings.target === 'players' ? (e => e.type === 'player') :
                      bowAimbot.settings.target === 'mobs' ? (e => e.type === 'mob') :
                      (e => e.type === 'player' || e.type === 'mob')
        
        const target = bot.nearestEntity(e => 
            filter(e) && 
            e.position.distanceTo(bot.entity.position) < bowAimbot.settings.range && 
            e !== bot.entity
        )

        if (!target) {
            chargingBow = false
            predictedHitPos = null
            return
        }

        // Calculate charge level
        const chargeLevel = chargingBow ? Math.min(1.0, (Date.now() - chargeStartTime) / bowAimbot.settings.chargeTime) : 0
        const currentVelocity = bowAimbot.settings.velocity * (0.5 + chargeLevel * 0.5) // 50% to 100% velocity

        // Predict hit position
        if (bowAimbot.settings.predict) {
            predictedHitPos = predictProjectileHit(bot, target, currentVelocity, bowAimbot.settings.gravity)
        } else {
            predictedHitPos = {
                x: target.position.x,
                y: target.position.y + target.height / 2,
                z: target.position.z
            }
        }

        if (predictedHitPos) {
            const angles = calculateProjectileAngle(bot, predictedHitPos, currentVelocity, bowAimbot.settings.gravity)
            bot.look(angles.yaw, angles.pitch, false)

            // Auto charge and release
            if (bowAimbot.settings.autoCharge) {
                if (!chargingBow) {
                    // Start charging
                    bot.activateItem()
                    chargingBow = true
                    chargeStartTime = Date.now()
                } else if (chargeLevel >= 1.0) {
                    // Release at full charge
                    bot.deactivateItem()
                    chargingBow = false
                }
            }

            // Expose prediction for visualization
            if (bowAimbot.settings.visualize) {
                if (!window.anticlient) window.anticlient = { visuals: {} }
                if (!window.anticlient.visuals) window.anticlient.visuals = {}
                window.anticlient.visuals.projectilePrediction = {
                    enabled: true,
                    from: bot.entity.position.offset(0, bot.entity.eyeHeight, 0),
                    to: predictedHitPos,
                    target: target.position,
                    charge: chargeLevel
                }
            }
        }
    }

    bowAimbot.onToggle = (enabled) => {
        if (!enabled) {
            chargingBow = false
            predictedHitPos = null
            if (window.anticlient?.visuals) {
                window.anticlient.visuals.projectilePrediction = { enabled: false }
            }
        }
    }

    registerModule(bowAimbot)
}
