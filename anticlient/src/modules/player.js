
import { Module, registerModule } from '../core/Module.js'

export const loadPlayerModules = () => {
    const autoEat = new Module('autoeat', 'Auto Eat', 'Player', 'Automatically eats food when hungry', {})
    autoEat.onTick = (bot) => {
        if (bot.food < 16 && !autoEat.eating) {
            const food = bot.inventory.items().find(item => item.name.includes('cooked') || item.name.includes('apple') || item.name.includes('steak'))
            if (food) {
                autoEat.eating = true
                bot.equip(food, 'hand').then(() => bot.consume()).then(() => autoEat.eating = false).catch(() => autoEat.eating = false)
            }
        }
    }
    registerModule(autoEat)

    const chestStealer = new Module('cheststealer', 'Chest Stealer', 'Player', 'Steal items from chests', { delay: 100 })
    chestStealer.onToggle = (enabled) => {
        // Logic usually requires global event listener
    }
    registerModule(chestStealer)
}
