
import { Module, registerModule } from '../core/Module.js'

export const loadPlayerModules = () => {
    // -- Auto-Eat (Enhanced) --
    const autoEat = new Module('autoeat', 'Auto Eat', 'Player', 'Automatically eats food when hungry', {
        healthThreshold: 16,
        saturationThreshold: 10,
        preferGoldenApple: true
    })
    autoEat.onTick = (bot) => {
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
        sortBy: 'type' // 'type' | 'value'
    })
    let sorting = false
    inventorySorter.onTick = async (bot) => {
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
}
