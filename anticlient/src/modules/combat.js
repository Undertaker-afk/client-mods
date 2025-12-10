
import { Module, registerModule } from '../core/Module.js'

export const loadCombatModules = () => {
    const killaura = new Module('killaura', 'Kill Aura', 'Combat', 'Automatically attacks entities around you', { range: 4.5, speed: 10 })
    killaura.onTick = (bot) => {
        if (!killaura.lastAttack) killaura.lastAttack = 0
        const now = Date.now()
        if (now - killaura.lastAttack < (1000 / killaura.settings.speed)) return

        const target = bot.nearestEntity(e => (e.type === 'player' || e.type === 'mob') && e.position.distanceTo(bot.entity.position) < killaura.settings.range && e !== bot.entity)
        if (target) {
            bot.lookAt(target.position.offset(0, target.height * 0.85, 0))
            bot.attack(target)
            killaura.lastAttack = now
        }
    }
    registerModule(killaura)
}
