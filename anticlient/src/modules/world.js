
import { Module, registerModule } from '../core/Module.js'

export const loadWorldModules = () => {
    const nuker = new Module('nuker', 'Nuker', 'World', 'Break blocks around you', { range: 4 })
    nuker.onTick = (bot) => {
        if (bot.targetDigBlock) return // Already digging

        // Find a block to break
        const target = bot.findBlock({
            matching: (block) => block.name !== 'air' && block.name !== 'bedrock' && block.hardness < 100, // Filter
            maxDistance: nuker.settings.range
        })

        if (target) {
            bot.dig(target).catch(e => { }) // Ignore errors
        }
    }
    registerModule(nuker)

    const fastPlace = new Module('fastplace', 'Fast Place', 'World', 'Place blocks faster', {})
    registerModule(fastPlace)
}
