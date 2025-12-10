//@ts-check
export const panoramaReady = (panorama) => {
    const mobs = [
        'zombie',
        'skeleton',
        'creeper',
        'spider',
        'blaze',
        'enderman',
        'axolotl',
        'dolphin',
        'panda',
        'parrot',
        'pig',
        'piglin',
        'villager',
        'cow',
        'horse'
    ]

    const [panoramaBox, ...rest] = panorama.panoramaGroup.children
    for (let m of rest) m.visible = false

    for (let i = 0; i < 35; i++) {
        const mobName = mobs[Math.floor(Math.random() * mobs.length)]

        const m = new globalThis.EntityMesh('1.16.4', mobName).mesh
        m.position.set(Math.random() * 30 - 15, Math.random() * 20 - 10, Math.random() * 10 - 17)
        m.rotation.set(0, Math.PI + Math.random(), -Math.PI / 4, 'ZYX')
        const v = Math.random() * 0.01
        m.children[0].onBeforeRender = () => {
          m.rotation.y += v
          m.rotation.z = Math.cos(panoramaBox.rotation.y * 3) * Math.PI / 4 - Math.PI / 2
        }
        panorama.panoramaGroup.add(m)
    }
}

export const worldReady = (world) => {
    // do something with world (or globalThis.world)
}
