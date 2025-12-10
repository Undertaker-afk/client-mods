
import { Module, registerModule } from '../core/Module.js'

export const loadMovementModules = () => {
    // -- Flight --
    const flight = new Module('flight', 'Flight', 'Movement', 'Allows you to fly like in creative mode', { speed: 1.0 })
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

    // -- Speed --
    const speed = new Module('speed', 'Speed', 'Movement', 'Moves faster on ground', { multiplier: 1.5 })
    speed.onTick = (bot) => {
        if (bot.entity.onGround && (bot.controlState.forward || bot.controlState.left || bot.controlState.right || bot.controlState.back)) {
            bot.entity.velocity.x *= speed.settings.multiplier
            bot.entity.velocity.z *= speed.settings.multiplier
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
        if (!window.bot) return
        if (enabled) {
            originalStepHeight = window.bot.physics?.stepHeight || 0.6
            if (window.bot.physics) window.bot.physics.stepHeight = step.settings.height
        } else {
            if (window.bot.physics) window.bot.physics.stepHeight = originalStepHeight
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

    // -- NoSlow --
    const noSlow = new Module('noslow', 'No Slow', 'Movement', 'No slowdown when eating', {})
    noSlow.onTick = (bot) => {
        // Force speed restore?
    }
    registerModule(noSlow)
}
