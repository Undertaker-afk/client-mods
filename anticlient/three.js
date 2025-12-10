
export const worldReady = (world) => {
    console.log('[Anticlient] Visuals Initialized')

    // Shared State with UI
    window.anticlient = window.anticlient || {}
    // Ensure structure exists
    if (!window.anticlient.visuals) window.anticlient.visuals = { esp: false, tracers: false }

    const meshes = new Map() // ID -> { box, glow, chams, healthBar, distanceLabel }
    const tracerLines = new Map() // ID -> THREE.Line
    const storageMeshes = new Map() // PosString -> THREE.LineSegments
    const blockEspMeshes = new Map() // PosString -> THREE.LineSegments
    let miningOverlay = null // Mining progress overlay

    const material = new THREE.LineBasicMaterial({ color: 0x00ff00, depthTest: false, transparent: true, opacity: 1.0, linewidth: 2 })
    const tracerMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.8, linewidth: 2 })
    const storageMaterial = new THREE.LineBasicMaterial({ color: 0xffa500, depthTest: false, transparent: true, opacity: 1.0, linewidth: 2 })
    const blockEspMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, depthTest: false, transparent: true, opacity: 1.0, linewidth: 2 })

    // Create sprite for text labels
    const createTextSprite = (text, color = '#ffffff') => {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = 256
        canvas.height = 64
        context.font = 'Bold 32px Arial'
        context.fillStyle = color
        context.textAlign = 'center'
        context.fillText(text, 128, 40)

        const texture = new THREE.CanvasTexture(canvas)
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            depthTest: false,
            depthWrite: false,
            sizeAttenuation: true // Enable distance scaling
        })
        const sprite = new THREE.Sprite(spriteMaterial)
        sprite.scale.set(0.5, 0.125, 1) // Smaller base scale since it will scale with distance
        sprite.renderOrder = 999 // Render on top of everything
        return sprite
    }

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
                        // Create ESP components
                        const espGroup = new THREE.Group()

                        // Box dimensions (tighter fit if enabled)
                        const w = settings.tightFit ? 0.6 : 0.8
                        const h = settings.tightFit ? 1.8 : 2.0

                        // Main box (3D or 2D)
                        let box
                        if (settings.boxType === '2D') {
                            // 2D box (just front face)
                            const geometry = new THREE.PlaneGeometry(w, h)
                            const edges = new THREE.EdgesGeometry(geometry)
                            const boxMaterial = material.clone()
                            boxMaterial.depthTest = false
                            boxMaterial.depthWrite = false
                            box = new THREE.LineSegments(edges, boxMaterial)
                        } else {
                            // 3D box
                            const geometry = new THREE.BoxGeometry(w, h, w)
                            const edges = new THREE.EdgesGeometry(geometry)
                            const boxMaterial = material.clone()
                            boxMaterial.depthTest = false
                            boxMaterial.depthWrite = false
                            box = new THREE.LineSegments(edges, boxMaterial)
                        }
                        box.material.linewidth = settings.lineWidth || 2
                        box.frustumCulled = false
                        box.renderOrder = 998 // Render on top
                        espGroup.add(box)

                        // Chams (filled box visible through walls)
                        let chams = null
                        if (settings.chams) {
                            const chamsGeometry = new THREE.BoxGeometry(w, h, w)
                            const chamsMaterial = new THREE.MeshBasicMaterial({
                                color: parseColor(settings.chamsColor || '#ff00ff'),
                                transparent: true,
                                opacity: 0.3,
                                depthTest: false,
                                depthWrite: false
                            })
                            chams = new THREE.Mesh(chamsGeometry, chamsMaterial)
                            chams.frustumCulled = false
                            chams.renderOrder = 997 // Behind box but above world
                            espGroup.add(chams)
                        }

                        // Glow effect
                        let glow = null
                        if (settings.glowEffect) {
                            const glowGeometry = new THREE.BoxGeometry(w * 1.1, h * 1.1, w * 1.1)
                            const glowMaterial = new THREE.MeshBasicMaterial({
                                color: color,
                                transparent: true,
                                opacity: 0.2,
                                depthTest: false,
                                depthWrite: false
                            })
                            glow = new THREE.Mesh(glowGeometry, glowMaterial)
                            glow.frustumCulled = false
                            glow.renderOrder = 996 // Behind chams
                            espGroup.add(glow)
                        }

                        // Health bar
                        let healthBar = null
                        if (settings.showHealth) {
                            const barWidth = w
                            const barHeight = 0.1
                            const barGeometry = new THREE.PlaneGeometry(barWidth, barHeight)
                            const barMaterial = new THREE.MeshBasicMaterial({
                                color: 0x00ff00,
                                transparent: true,
                                opacity: 0.8,
                                depthTest: false,
                                depthWrite: false,
                                side: THREE.DoubleSide
                            })
                            healthBar = new THREE.Mesh(barGeometry, barMaterial)
                            healthBar.position.y = h / 2 + 0.3
                            healthBar.frustumCulled = false
                            healthBar.renderOrder = 999 // On top with text
                            espGroup.add(healthBar)
                        }

                        // Distance label
                        let distanceLabel = null
                        if (settings.showDistance) {
                            distanceLabel = createTextSprite('0m', '#ffffff')
                            distanceLabel.position.y = h / 2 + 0.6
                            distanceLabel.frustumCulled = false
                            espGroup.add(distanceLabel)
                        }

                        world.scene.add(espGroup)
                        meshes.set(id, { group: espGroup, box, chams, glow, healthBar, distanceLabel, w, h })
                    }

                    const espData = meshes.get(id)
                    espData.group.visible = true
                    espData.group.position.set(pos.x, pos.y + espData.h / 2, pos.z)

                    // Update box color and linewidth
                    espData.box.material.color.setHex(color)
                    espData.box.material.linewidth = settings.lineWidth || 2

                    // Update chams
                    if (espData.chams) {
                        espData.chams.visible = settings.chams
                        if (settings.chams) {
                            espData.chams.material.color.setHex(parseColor(settings.chamsColor || '#ff00ff'))
                        }
                    }

                    // Update glow
                    if (espData.glow) {
                        espData.glow.visible = settings.glowEffect
                        if (settings.glowEffect) {
                            espData.glow.material.color.setHex(color)
                        }
                    }

                    // Update health bar
                    if (espData.healthBar && settings.showHealth) {
                        espData.healthBar.visible = true
                        const health = entity.health || 20
                        const maxHealth = entity.maxHealth || 20
                        const healthPercent = health / maxHealth
                        espData.healthBar.scale.x = healthPercent
                        espData.healthBar.position.x = (healthPercent - 1) * espData.w / 2
                        // Color based on health
                        if (healthPercent > 0.6) espData.healthBar.material.color.setHex(0x00ff00)
                        else if (healthPercent > 0.3) espData.healthBar.material.color.setHex(0xffff00)
                        else espData.healthBar.material.color.setHex(0xff0000)

                        // Make health bar face camera
                        if (world.camera) {
                            espData.healthBar.quaternion.copy(world.camera.quaternion)
                        }
                    } else if (espData.healthBar) {
                        espData.healthBar.visible = false
                    }

                    // Update distance label
                    if (espData.distanceLabel && settings.showDistance) {
                        espData.distanceLabel.visible = true
                        const distance = window.bot.entity.position.distanceTo(pos)
                        const canvas = espData.distanceLabel.material.map.image
                        const context = canvas.getContext('2d')
                        context.clearRect(0, 0, canvas.width, canvas.height)
                        context.font = 'Bold 32px Arial'
                        context.fillStyle = '#ffffff'
                        context.textAlign = 'center'
                        context.fillText(`${distance.toFixed(1)}m`, 128, 40)
                        espData.distanceLabel.material.map.needsUpdate = true

                        // Make label face camera
                        if (world.camera) {
                            espData.distanceLabel.quaternion.copy(world.camera.quaternion)
                        }
                    } else if (espData.distanceLabel) {
                        espData.distanceLabel.visible = false
                    }

                    // Make 2D box face camera
                    if (settings.boxType === '2D' && world.camera) {
                        espData.box.quaternion.copy(world.camera.quaternion)
                    }
                } else {
                    if (meshes.has(id)) meshes.get(id).group.visible = false
                }

                // --- Tracers ---
                if (activeTracers) {
                    if (!tracerLines.has(id)) {
                        const points = [new THREE.Vector3(), new THREE.Vector3()]
                        const geometry = new THREE.BufferGeometry().setFromPoints(points)
                        const tracerMat = tracerMaterial.clone()
                        tracerMat.depthTest = false
                        tracerMat.depthWrite = false
                        const line = new THREE.Line(geometry, tracerMat)
                        line.frustumCulled = false
                        line.renderOrder = 995 // Behind ESP elements
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
                    const storageMat = storageMaterial.clone()
                    storageMat.depthTest = false
                    storageMat.depthWrite = false
                    const line = new THREE.LineSegments(edges, storageMat)
                    line.frustumCulled = false
                    line.renderOrder = 994 // Behind tracers
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
                    const blockMat = blockEspMaterial.clone()
                    blockMat.depthTest = false
                    blockMat.depthWrite = false
                    const line = new THREE.LineSegments(edges, blockMat)
                    line.frustumCulled = false
                    line.renderOrder = 993 // Behind storage ESP
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
                    depthWrite: false,
                    side: THREE.DoubleSide
                })
                miningOverlay = new THREE.Mesh(geometry, overlayMaterial)
                miningOverlay.frustumCulled = false
                miningOverlay.renderOrder = 992 // Behind block ESP
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
                    depthWrite: false,
                    transparent: true,
                    opacity: 0.8
                })
                const wireframe = new THREE.LineSegments(edges, wireMaterial)
                wireframe.frustumCulled = false
                wireframe.renderOrder = 992 // Same as parent
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
