
import { Module, registerModule, modules } from '../core/Module.js'

export const loadCombatModules = () => {
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
            // Check if criticals is enabled
            if (criticalsModule && criticalsModule.enabled) {
                // Jump for crit
                if (bot.entity.onGround) {
                    bot.entity.velocity.y = 0.42 * (criticalsModule.settings.jumpHeight || 1.0)
                }
            }
            
            bot.lookAt(target.position.offset(0, target.height * 0.85, 0))
            bot.attack(target)
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

    // -- Criticals (Working) --
    const criticals = new Module('criticals', 'Criticals', 'Combat', 'Deal critical hits', {
        jumpHeight: 1.0
    })
    criticalsModule = criticals
    criticals.onTick = (bot) => {
        // Logic integrated with killaura
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
}
