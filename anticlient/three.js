
export const worldReady = (world) => {
    console.log('[Anticlient] Visuals Initialized')

    // Shared State with UI
    window.anticlient = window.anticlient || {}
    // Ensure structure exists
    if (!window.anticlient.visuals) window.anticlient.visuals = { esp: false, tracers: false }

    const meshes = new Map() // ID -> THREE.Object3D (BoxHelper)
    const tracerLines = new Map() // ID -> THREE.Line
    const storageMeshes = new Map() // PosString -> THREE.LineSegments
    const blockEspMeshes = new Map() // PosString -> THREE.LineSegments
    let miningOverlay = null // Mining progress overlay

    const material = new THREE.LineBasicMaterial({ color: 0x00ff00, depthTest: false, transparent: true, opacity: 1.0, linewidth: 2 })
    const tracerMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.8, linewidth: 2 })
    const storageMaterial = new THREE.LineBasicMaterial({ color: 0xffa500, depthTest: false, transparent: true, opacity: 1.0, linewidth: 2 })
    const blockEspMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, depthTest: false, transparent: true, opacity: 1.0, linewidth: 2 })

    // Helper to get hex from string
    const parseColor = (str) => parseInt(str.replace('#', '0x'), 16)

    const update = () => {
        if (!window.bot || !window.bot.entities || !window.bot.entity || !window.bot.entity.position) return

        const settings = window.anticlient.visuals.espSettings || { playerColor: '#00ffff', mobColor: '#ff0000' }
        const pColor = parseColor(settings.playerColor)
        const mColor = parseColor(settings.mobColor)

        const center = new THREE.Vector3(0, 0, -1).applyQuaternion(window.bot.entity.quaternion || new THREE.Quaternion()).add(window.bot.entity.position.offset(0, 1.62, 0))

        // Reuse loop for both ESP and Tracers
        const activeEsp = window.anticlient.visuals.esp
        const activeTracers = window.anticlient.visuals.tracers

        if (activeEsp || activeTracers) {
            for (const [id, entity] of Object.entries(window.bot.entities)) {
                if (entity === window.bot.entity) continue
                if (entity.type !== 'player' && entity.type !== 'mob') continue

                const pos = entity.position

                // Color Logic
                let color = (entity.type === 'player') ? pColor : mColor

                // --- ESP ---
                if (activeEsp) {
                    if (!meshes.has(id)) {
                        const w = 0.6
                        const h = 1.8
                        const geometry = new THREE.BoxGeometry(w, h, w)
                        const edges = new THREE.EdgesGeometry(geometry)
                        const line = new THREE.LineSegments(edges, material.clone())
                        line.frustumCulled = false
                        world.scene.add(line)
                        meshes.set(id, line)
                    }
                    const mesh = meshes.get(id)
                    mesh.visible = true
                    mesh.position.set(pos.x, pos.y + 1.8 / 2, pos.z)
                    mesh.material.color.setHex(color)
                } else {
                    if (meshes.has(id)) meshes.get(id).visible = false
                }

                // --- Tracers ---
                if (activeTracers) {
                    if (!tracerLines.has(id)) {
                        const points = [new THREE.Vector3(), new THREE.Vector3()]
                        const geometry = new THREE.BufferGeometry().setFromPoints(points)
                        const line = new THREE.Line(geometry, tracerMaterial.clone())
                        line.frustumCulled = false
                        world.scene.add(line)
                        tracerLines.set(id, line)
                    }
                    const line = tracerLines.get(id)
                    line.visible = true

                    // Start from bot head
                    const headPos = window.bot.entity.position.offset(0, 1.62, 0)

                    // We need to update geometry positions
                    const positions = line.geometry.attributes.position.array
                    positions[0] = headPos.x; positions[1] = headPos.y; positions[2] = headPos.z
                    positions[3] = pos.x; positions[4] = pos.y + 0.9; positions[5] = pos.z // to center of body
                    line.geometry.attributes.position.needsUpdate = true

                    line.material.color.setHex(color)

                } else {
                    if (tracerLines.has(id)) tracerLines.get(id).visible = false
                }
            }

            // Hide tracers not in entity list
            if (!activeTracers) {
                for (const line of tracerLines.values()) line.visible = false
            }
        } else {
            // Hide all ESP and tracers when disabled
            for (const mesh of meshes.values()) mesh.visible = false
            for (const line of tracerLines.values()) line.visible = false
        }

        // --- Storage ESP ---
        const activeStorage = window.anticlient.visuals.storageEsp
        const storageLocs = window.anticlient.visuals.storageLocations || []

        if (activeStorage && storageLocs.length > 0) {
            const storSettings = window.anticlient.visuals.storageEspSettings || { color: '#FFA500' }
            const sColor = parseColor(storSettings.color)

            const currentKeys = new Set()

            for (const vec of storageLocs) {
                const key = `${vec.x},${vec.y},${vec.z}`
                currentKeys.add(key)

                if (!storageMeshes.has(key)) {
                    const geometry = new THREE.BoxGeometry(1, 1, 1)
                    const edges = new THREE.EdgesGeometry(geometry)
                    const line = new THREE.LineSegments(edges, storageMaterial.clone())
                    line.frustumCulled = false
                    // Adjust position to be block center
                    line.position.set(vec.x + 0.5, vec.y + 0.5, vec.z + 0.5)
                    world.scene.add(line)
                    storageMeshes.set(key, line)
                }
                const mesh = storageMeshes.get(key)
                mesh.visible = true
                mesh.material.color.setHex(sColor)
            }

            // Cleanup missing
            for (const [key, mesh] of storageMeshes.entries()) {
                if (!currentKeys.has(key)) {
                    mesh.visible = false
                }
            }
        } else {
            for (const mesh of storageMeshes.values()) mesh.visible = false
        }

        // --- Block ESP (X-Ray) ---
        const activeBlockEsp = window.anticlient.visuals.blockEsp
        const blockEspLocs = window.anticlient.visuals.blockEspLocations || []

        if (activeBlockEsp && blockEspLocs.length > 0) {
            const blockSettings = window.anticlient.visuals.blockEspSettings || { color: '#00ff00' }
            const bColor = parseColor(blockSettings.color)

            const currentKeys = new Set()
            const log = window.anticlientLogger?.module('BlockESP')

            if (log && blockEspLocs.length > 0) {
                log.debug(`Rendering ${blockEspLocs.length} blocks`)
            }

            for (const vec of blockEspLocs) {
                const key = `${vec.x},${vec.y},${vec.z}`
                currentKeys.add(key)

                if (!blockEspMeshes.has(key)) {
                    const geometry = new THREE.BoxGeometry(1, 1, 1)
                    const edges = new THREE.EdgesGeometry(geometry)
                    const line = new THREE.LineSegments(edges, blockEspMaterial.clone())
                    line.frustumCulled = false
                    // Adjust position to be block center
                    line.position.set(vec.x + 0.5, vec.y + 0.5, vec.z + 0.5)
                    world.scene.add(line)
                    blockEspMeshes.set(key, line)

                    if (log) log.debug(`Created ESP mesh for block at ${key}`)
                }
                const mesh = blockEspMeshes.get(key)
                mesh.visible = true
                mesh.material.color.setHex(bColor)
            }

            // Cleanup missing
            for (const [key, mesh] of blockEspMeshes.entries()) {
                if (!currentKeys.has(key)) {
                    mesh.visible = false
                }
            }
        } else {
            for (const mesh of blockEspMeshes.values()) mesh.visible = false
        }

        // --- Mining Progress Overlay ---
        const miningData = window.anticlient.mining
        if (miningData && miningData.active && miningData.block) {
            const { x, y, z } = miningData.block
            const progress = miningData.progress || 0

            // Create mining overlay if it doesn't exist
            if (!miningOverlay) {
                const geometry = new THREE.BoxGeometry(1.01, 1.01, 1.01)
                const overlayMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.3,
                    depthTest: false,
                    side: THREE.DoubleSide
                })
                miningOverlay = new THREE.Mesh(geometry, overlayMaterial)
                miningOverlay.frustumCulled = false
                world.scene.add(miningOverlay)
            }

            // Update position and color based on progress
            miningOverlay.visible = true
            miningOverlay.position.set(x + 0.5, y + 0.5, z + 0.5)

            // Color gradient: red -> yellow -> green
            const color = new THREE.Color()
            if (progress < 0.5) {
                // Red to yellow (0.0 - 0.5)
                color.setRGB(1, progress * 2, 0)
            } else {
                // Yellow to green (0.5 - 1.0)
                color.setRGB(1 - (progress - 0.5) * 2, 1, 0)
            }
            miningOverlay.material.color = color
            miningOverlay.material.opacity = 0.2 + (progress * 0.3)

            // Add wireframe overlay
            if (!miningOverlay.wireframe) {
                const wireGeometry = new THREE.BoxGeometry(1.02, 1.02, 1.02)
                const edges = new THREE.EdgesGeometry(wireGeometry)
                const wireMaterial = new THREE.LineBasicMaterial({
                    color: 0xffffff,
                    depthTest: false,
                    transparent: true,
                    opacity: 0.8
                })
                const wireframe = new THREE.LineSegments(edges, wireMaterial)
                wireframe.frustumCulled = false
                miningOverlay.add(wireframe)
                miningOverlay.wireframe = wireframe
            }

            // Update wireframe color
            if (miningOverlay.wireframe) {
                miningOverlay.wireframe.material.color = color
            }
        } else {
            // Hide mining overlay when not mining
            if (miningOverlay) {
                miningOverlay.visible = false
            }
        }

        // Cleanup entities
        for (const id of meshes.keys()) {
            if (!window.bot.entities[id]) {
                const mesh = meshes.get(id)
                world.scene.remove(mesh)
                meshes.delete(id)
            }
        }
        for (const id of tracerLines.keys()) {
            if (!window.bot.entities[id]) {
                const line = tracerLines.get(id)
                world.scene.remove(line)
                tracerLines.delete(id)
            }
        }
    }

    if (window.beforeRenderFrame) {
        window.beforeRenderFrame.push(update)
    } else {
        const loop = () => {
            update()
            requestAnimationFrame(loop)
        }
        loop()
    }
}
