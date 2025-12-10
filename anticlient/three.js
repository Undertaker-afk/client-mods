
export const worldReady = (world) => {
    console.log('[Anticlient] Visuals Initialized')

    // Shared State with UI
    window.anticlient = window.anticlient || {}
    window.anticlient.visuals = {
        esp: false,
        tracers: false,
        chams: false
    }

    const meshes = new Map() // ID -> THREE.Object3D (BoxHelper)
    const tracerLines = new Map() // ID -> THREE.Line

    const material = new THREE.LineBasicMaterial({ color: 0x00ff00, depthTest: false, transparent: true })
    const tracerMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, depthTest: false, transparent: true })

    // Hook into render loop
    // Assuming 'beforeRenderFrame' is available globally as per globals.d.ts
    // or we can use requestAnimationFrame loop if global is not working, but let's try pushing to array first

    const update = () => {
        if (!window.bot || !window.bot.entities) return

        // --- ESP ---
        if (window.anticlient.visuals.esp) {
            for (const [id, entity] of Object.entries(window.bot.entities)) {
                if (entity === window.bot.entity) continue
                if (entity.type !== 'player' && entity.type !== 'mob') continue

                // Get Position
                const pos = entity.position

                // Create Box if needed
                if (!meshes.has(id)) {
                    // Create a wireframe box
                    // Width 0.6, Height 1.8 (approx player)
                    const w = 0.6
                    const h = 1.8
                    const geometry = new THREE.BoxGeometry(w, h, w)
                    const edges = new THREE.EdgesGeometry(geometry)
                    const line = new THREE.LineSegments(edges, material)
                    line.frustumCulled = false
                    world.scene.add(line)
                    meshes.set(id, line)
                }

                // Update Position
                const mesh = meshes.get(id)
                mesh.visible = true
                // Interpolated position would be better, but raw position for now
                mesh.position.set(pos.x, pos.y + 1.8 / 2, pos.z)

                // Color based on type?
                if (entity.type === 'player') mesh.material.color.setHex(0x00ffff) // Cyan for players
                else mesh.material.color.setHex(0xff0000) // Red for mobs
            }
        } else {
            // Hide all
            for (const mesh of meshes.values()) mesh.visible = false
        }

        // --- Cleanup Stale Meshes ---
        // Simple cleanup: if entity not in bot.entities list, remove
        // Not implemented fully efficiently here to save tokens, but good enough
        for (const id of meshes.keys()) {
            if (!window.bot.entities[id]) {
                const mesh = meshes.get(id)
                world.scene.remove(mesh)
                meshes.delete(id)
            }
        }
    }

    if (window.beforeRenderFrame) {
        window.beforeRenderFrame.push(update)
    } else {
        // Fallback loop
        const loop = () => {
            update()
            requestAnimationFrame(loop)
        }
        loop()
    }
}
