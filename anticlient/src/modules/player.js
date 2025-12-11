
import { Module, registerModule } from '../core/Module.js'

export const loadPlayerModules = () => {
    // -- Auto-Eat (Enhanced) --
    const autoEat = new Module('autoeat', 'Auto Eat', 'Player', 'Automatically eats food when hungry', {
        healthThreshold: 16,
        saturationThreshold: 10,
        preferGoldenApple: true
    })
    autoEat.onTick = (bot) => {
        if (!bot.inventory || !bot.inventory.slots) return // Guard against undefined inventory
        
        const needsFood = bot.food < autoEat.settings.healthThreshold || 
                         (bot.foodSaturation !== undefined && bot.foodSaturation < autoEat.settings.saturationThreshold)
        
        if (needsFood && !autoEat.eating) {
            let food = null
            
            // Prefer golden apple if health is low
            if (autoEat.settings.preferGoldenApple && bot.health < 10) {
                food = bot.inventory.items().find(item => 
                    item.name === 'golden_apple' || item.name === 'enchanted_golden_apple'
                )
            }
            
            // Otherwise find best food (highest saturation)
            if (!food) {
                const foods = bot.inventory.items().filter(item => 
                    item.name.includes('cooked') || 
                    item.name.includes('apple') || 
                    item.name.includes('steak') ||
                    item.name.includes('bread') ||
                    item.name.includes('porkchop') ||
                    item.name.includes('chicken')
                )
                
                // Simple heuristic: prefer cooked foods and golden apples
                food = foods.find(item => item.name.includes('golden_apple')) ||
                       foods.find(item => item.name.includes('cooked')) ||
                       foods[0]
            }
            
            if (food) {
                autoEat.eating = true
                bot.equip(food, 'hand').then(() => bot.consume()).then(() => {
                    autoEat.eating = false
                }).catch(() => {
                    autoEat.eating = false
                })
            }
        }
    }
    registerModule(autoEat)

    // -- Auto-Totem (Moved from Combat) --
    const autoTotem = new Module('autototem', 'Auto Totem', 'Player', 'Auto-equip totem in offhand', {
        healthThreshold: 16,
        checkInterval: 5
    })
    let totemTick = 0
    autoTotem.onTick = (bot) => {
        if (!bot.inventory || !bot.inventory.slots) return // Guard against undefined inventory
        
        totemTick++
        if (totemTick % autoTotem.settings.checkInterval !== 0) return
        
        const needsTotem = bot.health <= autoTotem.settings.healthThreshold
        const offhandItem = bot.inventory.slots[45] // Offhand slot
        
        if (needsTotem && (!offhandItem || offhandItem.name !== 'totem_of_undying')) {
            const totem = bot.inventory.items().find(item => item.name === 'totem_of_undying')
            if (totem) {
                bot.equip(totem, 'off-hand').catch(() => {})
            }
        }
    }
    registerModule(autoTotem)

    // -- Inventory Sorter --
    const inventorySorter = new Module('inventorysorter', 'Inventory Sorter', 'Player', 'Auto-organize inventory', {
        enabled: false,
        sortBy: 'type'
    }, {
        sortBy: { type: 'dropdown', options: ['type', 'value'] }
    })
    let sorting = false
    inventorySorter.onTick = async (bot) => {
        if (!bot.inventory || !bot.inventory.slots) return // Guard against undefined inventory
        if (!inventorySorter.settings.enabled || sorting || bot.currentWindow) return
        
        sorting = true
        try {
            // Get all items in main inventory (slots 9-35)
            const items = []
            for (let slot = 9; slot < 36; slot++) {
                const item = bot.inventory.slots[slot]
                if (item && item.name !== 'air') {
                    items.push({ slot, item })
                }
            }
            
            if (items.length === 0) {
                sorting = false
                return
            }
            
            // Sort items by type (group similar items together)
            if (inventorySorter.settings.sortBy === 'type') {
                items.sort((a, b) => {
                    // Group by item name
                    if (a.item.name < b.item.name) return -1
                    if (a.item.name > b.item.name) return 1
                    return 0
                })
            }
            
            // Move items to sorted positions
            for (let i = 0; i < items.length; i++) {
                const targetSlot = 9 + i
                const currentItem = items[i]
                
                if (currentItem.slot !== targetSlot) {
                    // Check if target slot is empty or has same item type
                    const targetItem = bot.inventory.slots[targetSlot]
                    if (!targetItem || targetItem.name === 'air' || targetItem.name === currentItem.item.name) {
                        try {
                            await bot.moveSlotItem(currentItem.slot, targetSlot)
                            // Wait a bit for the move to complete
                            await new Promise(resolve => setTimeout(resolve, 50))
                        } catch (e) {
                            // Ignore errors, continue sorting
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Inventory sort error:', e)
        } finally {
            sorting = false
        }
    }
    registerModule(inventorySorter)

    // -- Auto-Refill Hotbar --
    const autoRefill = new Module('autorefill', 'Auto Refill', 'Player', 'Keep hotbar filled from inventory', {
        enabled: true,
        slots: [0, 1, 2, 3, 4, 5, 6, 7, 8] // All hotbar slots
    })
    let refillTick = 0
    let refilling = false
    autoRefill.onTick = async (bot) => {
        if (!bot.inventory || !bot.inventory.slots) return // Guard against undefined inventory
        
        refillTick++
        if (refillTick % 20 !== 0 || refilling || bot.currentWindow) return // Check every second
        
        refilling = true
        try {
            for (const slotIndex of autoRefill.settings.slots) {
                const hotbarSlot = bot.inventory.slots[36 + slotIndex] // Hotbar starts at slot 36
                
                if (!hotbarSlot || hotbarSlot.name === 'air' || hotbarSlot.count === 0) {
                    // Find same item type in inventory
                    const itemType = hotbarSlot?.name
                    let replacement = null
                    
                    if (itemType) {
                        // Try to find same item type
                        replacement = bot.inventory.items().find(item => 
                            item.name === itemType && item.slot >= 9 && item.slot < 36
                        )
                    }
                    
                    // If no same type found, find any item to fill
                    if (!replacement) {
                        replacement = bot.inventory.items().find(item => 
                            item.slot >= 9 && item.slot < 36 && item.name !== 'air'
                        )
                    }
                    
                    if (replacement) {
                        try {
                            // Move item from inventory to hotbar
                            await bot.moveSlotItem(replacement.slot, 36 + slotIndex)
                            await new Promise(resolve => setTimeout(resolve, 50))
                        } catch (e) {
                            // Ignore errors
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Auto-refill error:', e)
        } finally {
            refilling = false
        }
    }
    registerModule(autoRefill)

    // -- Chest Stealer (Complete Implementation) --
    const chestStealer = new Module('cheststealer', 'Chest Stealer', 'Player', 'Steal items from chests', { 
        delay: 100,
        takeAll: true,
        filter: []
    })
    let chestWindow = null
    let stealing = false
    
    chestStealer.onToggle = (enabled) => {
        if (enabled && window.bot) {
            // Listen for window open events
            window.bot.on('windowOpen', (window) => {
                if (window.type === 'chest' || window.type === 'generic_9x3' || window.type === 'generic_9x6') {
                    chestWindow = window
                    stealing = true
                    stealFromChest(window.bot, window)
                }
            })
            
            window.bot.on('windowClose', () => {
                chestWindow = null
                stealing = false
            })
        }
    }
    
    const stealFromChest = async (bot, window) => {
        if (!chestStealer.enabled || !stealing) return
        
        // Get all items in chest (slots 0 to window.inventoryStart-1)
        const chestSlots = window.inventoryStart || 54
        for (let slot = 0; slot < chestSlots; slot++) {
            const item = window.slots[slot]
            if (!item || item.name === 'air') continue
            
            // Check filter
            if (chestStealer.settings.filter.length > 0) {
                const matches = chestStealer.settings.filter.some(f => item.name.includes(f))
                if (!matches) continue
            }
            
            // Click to take item
            try {
                await new Promise(resolve => setTimeout(resolve, chestStealer.settings.delay))
                bot.clickWindow(slot, 0, 0) // Left click
                
                if (!chestStealer.settings.takeAll) break // Take one item only
            } catch (e) {
                // Ignore errors
            }
        }
    }
    
    registerModule(chestStealer)

    // -- Packet Mine --
    const packetMine = new Module('packetmine', 'Packet Mine', 'Player', 'Mine blocks without holding mouse button', {
        enabled: false,
        showProgress: true,
        autoSwitch: false // Auto switch to next block
    })

    let miningBlock = null
    let miningStartTime = null
    let miningProgress = 0
    let miningInterval = null

    packetMine.onToggle = (enabled) => {
        if (!window.anticlient) window.anticlient = { mining: {} }
        if (!window.anticlient.mining) window.anticlient.mining = {}

        if (!enabled) {
            // Clear mining state
            if (miningBlock && window.bot) {
                try {
                    window.bot._client.write('block_dig', {
                        status: 1, // cancel digging
                        location: miningBlock.position,
                        face: 1
                    })
                } catch (e) {}
            }
            miningBlock = null
            miningStartTime = null
            miningProgress = 0
            window.anticlient.mining.active = false
            window.anticlient.mining.block = null
            window.anticlient.mining.progress = 0

            if (miningInterval) {
                clearInterval(miningInterval)
                miningInterval = null
            }
        } else {
            // Listen for left click to start mining
            if (!miningInterval) {
                miningInterval = setInterval(() => {
                    if (!window.bot) return

                    // Check if left mouse button is pressed (start mining)
                    const mouseState = window.bot.controlState?.leftClick
                    if (mouseState && !miningBlock) {
                        const block = window.bot.blockAtCursor(5)
                        if (block && window.bot.canDigBlock(block)) {
                            startMining(block)
                        }
                    }
                }, 50)
            }
        }
    }

    const startMining = (block) => {
        if (!window.bot || !window.bot._client) return

        miningBlock = block
        miningStartTime = Date.now()
        miningProgress = 0

        const log = window.anticlientLogger?.module('PacketMine')
        if (log) log.info('Started mining block at', block.position)

        // Send start digging packet
        try {
            window.bot._client.write('block_dig', {
                status: 0, // start digging
                location: block.position,
                face: 1 // top face
            })

            // Swing arm
            window.bot.swingArm()
        } catch (e) {
            if (log) log.error('Failed to send start digging packet:', e)
        }
    }

    packetMine.onTick = (bot) => {
        if (!bot || !bot._client) return

        // If currently mining a block
        if (miningBlock) {
            // Check if block still exists
            const currentBlock = bot.blockAt(miningBlock.position)
            if (!currentBlock || currentBlock.type === 0) {
                // Block was broken
                const log = window.anticlientLogger?.module('PacketMine')
                if (log) log.debug('Block broken successfully')

                miningBlock = null
                miningStartTime = null
                miningProgress = 0

                if (window.anticlient && window.anticlient.mining) {
                    window.anticlient.mining.active = false
                    window.anticlient.mining.block = null
                    window.anticlient.mining.progress = 0
                }
                return
            }

            // Calculate mining progress
            const digTime = bot.digTime(miningBlock)
            const elapsed = Date.now() - miningStartTime
            miningProgress = Math.min(elapsed / digTime, 1.0)

            // Update global state for visual overlay
            if (window.anticlient && window.anticlient.mining) {
                window.anticlient.mining.active = true
                window.anticlient.mining.block = {
                    x: miningBlock.position.x,
                    y: miningBlock.position.y,
                    z: miningBlock.position.z
                }
                window.anticlient.mining.progress = miningProgress
            }

            // If mining is complete, send finish packet
            if (miningProgress >= 1.0) {
                const log = window.anticlientLogger?.module('PacketMine')
                if (log) log.debug('Mining complete, sending finish packet')

                try {
                    bot._client.write('block_dig', {
                        status: 2, // finish digging
                        location: miningBlock.position,
                        face: 1
                    })
                } catch (e) {
                    if (log) log.error('Failed to send finish digging packet:', e)
                }

                // Don't reset immediately, wait for block to actually break
            }
        }
    }

    registerModule(packetMine)

    // -- Anti-AFK --
    const antiAfk = new Module('antiafk', 'Anti-AFK', 'Player', 'Walks in random patterns to bypass AFK detection', {
        enabled: false,
        area: 3, // 3x3 area
        walkSpeed: 0.5, // seconds between movements
        jumpChance: 0.1, // 10% chance to jump
        rotateChance: 0.3 // 30% chance to rotate view
    })

    let afkInterval = null
    let afkStartPosition = null
    let currentAfkAction = null

    antiAfk.onToggle = (enabled) => {
        const log = window.anticlientLogger?.module('AntiAFK')
        
        if (enabled) {
            if (!window.bot || !window.bot.entity) {
                if (log) log.warning('Bot not available, waiting...')
                // Try again in a moment
                setTimeout(() => {
                    if (antiAfk.enabled) antiAfk.toggle()
                }, 1000)
                return
            }

            // Store starting position
            afkStartPosition = window.bot.entity.position.clone()
            if (log) log.info(`Anti-AFK enabled at position ${afkStartPosition.x.toFixed(1)}, ${afkStartPosition.y.toFixed(1)}, ${afkStartPosition.z.toFixed(1)}`)

            // Start random movement loop
            afkInterval = setInterval(() => {
                if (!window.bot || !window.bot.entity || !afkStartPosition) return

                const bot = window.bot

                // Stop any current movement
                bot.setControlState('forward', false)
                bot.setControlState('back', false)
                bot.setControlState('left', false)
                bot.setControlState('right', false)
                bot.setControlState('jump', false)

                // Check if we're too far from start position
                const currentPos = bot.entity.position
                const distance = currentPos.distanceTo(afkStartPosition)
                const maxDistance = antiAfk.settings.area / 2

                // If too far, move back towards start
                if (distance > maxDistance) {
                    const direction = afkStartPosition.clone().subtract(currentPos).normalize()
                    const yaw = Math.atan2(-direction.x, -direction.z)
                    bot.look(yaw, 0, true)
                    bot.setControlState('forward', true)
                    
                    if (log && log.level <= 0) log.debug('Too far, returning to start position')
                    
                    setTimeout(() => {
                        bot.setControlState('forward', false)
                    }, 500)
                    return
                }

                // Random action: walk, jump, or rotate
                const actions = ['walk', 'rotate', 'jump', 'idle']
                const randomAction = actions[Math.floor(Math.random() * actions.length)]

                switch (randomAction) {
                    case 'walk':
                        // Random direction (forward, back, left, right)
                        const directions = ['forward', 'back', 'left', 'right']
                        const randomDir = directions[Math.floor(Math.random() * directions.length)]
                        
                        bot.setControlState(randomDir, true)
                        if (log && log.level <= 0) log.debug(`Walking ${randomDir}`)
                        
                        setTimeout(() => {
                            bot.setControlState(randomDir, false)
                        }, Math.random() * 1000 + 500)
                        break

                    case 'rotate':
                        // Random rotation
                        const randomYaw = bot.entity.yaw + (Math.random() * Math.PI - Math.PI / 2)
                        const randomPitch = (Math.random() * 0.5 - 0.25)
                        bot.look(randomYaw, randomPitch, true)
                        if (log && log.level <= 0) log.debug('Rotating view')
                        break

                    case 'jump':
                        if (bot.entity.onGround) {
                            bot.setControlState('jump', true)
                            if (log && log.level <= 0) log.debug('Jumping')
                            setTimeout(() => {
                                bot.setControlState('jump', false)
                            }, 100)
                        }
                        break

                    case 'idle':
                        // Do nothing for this tick
                        if (log && log.level <= 0) log.debug('Idle')
                        break
                }

            }, antiAfk.settings.walkSpeed * 1000)

            if (log) log.info('Anti-AFK movement started')

        } else {
            // Stop movement
            if (afkInterval) {
                clearInterval(afkInterval)
                afkInterval = null
            }

            if (window.bot) {
                window.bot.setControlState('forward', false)
                window.bot.setControlState('back', false)
                window.bot.setControlState('left', false)
                window.bot.setControlState('right', false)
                window.bot.setControlState('jump', false)
            }

            afkStartPosition = null
            if (log) log.info('Anti-AFK disabled')
        }
    }

    antiAfk.onSettingChanged = (key, newValue) => {
        const log = window.anticlientLogger?.module('AntiAFK')
        if (key === 'walkSpeed' && afkInterval && antiAfk.enabled) {
            // Restart interval with new speed
            if (log) log.info(`Walk speed changed to ${newValue}s`)
            antiAfk.toggle() // disable
            setTimeout(() => antiAfk.toggle(), 100) // re-enable
        }
    }

    registerModule(antiAfk)

    // -- Timer (Game Speed) --
    const timer = new Module('timer', 'Timer', 'Player', 'Speed up or slow down game ticks', {
        speed: 2.0, // 1.0 = normal, 2.0 = 2x speed, 0.5 = half speed
        maxSpeed: 10.0,
        affectMovement: true,
        affectAnimations: true
    })

    let timerInterval = null
    let originalPhysicsInterval = null

    timer.onToggle = (enabled) => {
        const log = window.anticlientLogger?.module('Timer')
        
        if (enabled) {
            const speed = Math.min(timer.settings.speed, timer.settings.maxSpeed)
            
            if (window.bot && window.bot.physics) {
                // Modify physics tick rate
                if (timer.settings.affectMovement) {
                    originalPhysicsInterval = window.bot.physics.tickInterval || 50
                    window.bot.physics.tickInterval = originalPhysicsInterval / speed
                }
            }

            // Accelerate game time
            timerInterval = setInterval(() => {
                if (!window.bot) return
                
                // Speed up ticks by calling physics update multiple times
                const extraTicks = Math.floor(speed) - 1
                for (let i = 0; i < extraTicks; i++) {
                    if (window.bot.physics && timer.settings.affectMovement) {
                        try {
                            window.bot.physics.tick()
                        } catch (e) {
                            // Ignore physics errors
                        }
                    }
                }
            }, 50)

            if (log) log.info(`Timer enabled at ${speed}x speed`)
        } else {
            // Restore normal speed
            if (timerInterval) {
                clearInterval(timerInterval)
                timerInterval = null
            }

            if (originalPhysicsInterval !== null && window.bot && window.bot.physics) {
                window.bot.physics.tickInterval = originalPhysicsInterval
                originalPhysicsInterval = null
            }

            if (log) log.info('Timer disabled - normal speed restored')
        }
    }

    timer.onSettingChanged = (key, newValue) => {
        const log = window.anticlientLogger?.module('Timer')
        
        if (key === 'speed' && timer.enabled) {
            if (log) log.info(`Timer speed changed to ${newValue}x`)
            // Restart timer with new speed
            timer.toggle()
            setTimeout(() => timer.toggle(), 50)
        }
    }

    registerModule(timer)

    // -- Anti Hunger --
    const antiHunger = new Module('antihunger', 'Anti Hunger', 'Player', 'Reduce hunger consumption', {
        mode: 'sprint', // 'sprint' | 'packet' | 'both'
        cancelSprint: true, // Cancel sprint packets
        onGroundSpoof: true // Spoof onGround to reduce hunger
    }, {
        mode: { type: 'dropdown', options: ['sprint', 'packet', 'both'] }
    })

    let originalSprint = null
    let hungerPacketHandler = null

    antiHunger.onToggle = (enabled) => {
        const log = window.anticlientLogger?.module('AntiHunger')
        
        if (enabled) {
            const bot = window.bot
            if (!bot) return

            // Sprint mode: optimize sprinting
            if ((antiHunger.settings.mode === 'sprint' || antiHunger.settings.mode === 'both') && antiHunger.settings.cancelSprint) {
                originalSprint = bot.setSprinting.bind(bot)
                bot.setSprinting = (sprint) => {
                    // Only sprint when actually moving forward
                    if (sprint && !bot.controlState.forward) {
                        return // Don't sprint if not moving forward
                    }
                    originalSprint(sprint)
                }
            }

            // Packet mode: spoof onGround
            if ((antiHunger.settings.mode === 'packet' || antiHunger.settings.mode === 'both') && antiHunger.settings.onGroundSpoof) {
                if (bot._client) {
                    // Intercept position packets
                    const originalWrite = bot._client.write.bind(bot._client)
                    bot._client.write = (name, params) => {
                        if (name === 'position' || name === 'position_look') {
                            // Always set onGround to true to reduce hunger
                            if (params && bot.entity.velocity.y === 0) {
                                params.onGround = true
                            }
                        }
                        return originalWrite(name, params)
                    }
                }
            }

            if (log) log.info(`Anti Hunger enabled (${antiHunger.settings.mode} mode)`)
        } else {
            // Restore original functions
            if (originalSprint && window.bot) {
                window.bot.setSprinting = originalSprint
                originalSprint = null
            }

            if (log) log.info('Anti Hunger disabled')
        }
    }

    registerModule(antiHunger)
}

