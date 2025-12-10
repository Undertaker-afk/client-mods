//@ts-check

const MAX_COUNT = 3
const MIN_COUNT = 1

export const server = (server) => {
    console.log('server plugin loaded')
}

export const entity = (entity) => { }

export const player = (player, server) => {
    player.on('dug', (data) => {
        if (!data.dropBlock) return
        const mcData = server.mcData
        const allItemsIds = mcData.itemsArray.map(item => item.id)
        const randomItemId = allItemsIds[Math.floor(Math.random() * allItemsIds.length)]
        const firstDrop = data.drops[0]
        if (!firstDrop) return
        if (data.drops.length > 1) {
            // remove other drops
            data.drops.splice(1, data.drops.length - 1)
        }
        data.drops[0] = {
            ...firstDrop,
            blockDropId: randomItemId,
        }
    })
}
