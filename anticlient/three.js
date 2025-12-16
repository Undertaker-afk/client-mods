
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
    const xrayMeshes = new Map() // PosString -> THREE.LineSegments (for highlight mode)
    let miningOverlay = null // Mining progress overlay

    // Xray state tracking
    let xrayState = {
        active: false,
        mode: 'highlight',
        seeThroughMode: 'glass',
        lastSettings: null,
        originalMaterialProps: null, // Store original material properties
        modifiedSections: new Set() // Track which sections we've modified
    }

    const material = new THREE.LineBasicMaterial({ color: 0x00ff00, depthTest: false, transparent: true, opacity: 1.0, linewidth: 2 })
    const tracerMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.8, linewidth: 2 })
    const storageMaterial = new THREE.LineBasicMaterial({ color: 0xffa500, depthTest: false, transparent: true, opacity: 1.0, linewidth: 2 })
    const blockEspMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, depthTest: false, transparent: true, opacity: 1.0, linewidth: 2 })
    const xrayMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, depthTest: false, transparent: true, opacity: 1.0, linewidth: 3 })

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
            sizeAttenuation: false // Disable automatic scaling - we'll do it manually
        })
        const sprite = new THREE.Sprite(spriteMaterial)
        sprite.scale.set(1, 0.25, 1) // Base scale - will be adjusted per distance
        sprite.renderOrder = 999 // Render on top of everything
        return sprite
    }

    // Helper to get hex from string
    const parseColor = (str) => parseInt(str.replace('#', '0x'), 16)

    // ==========================================
    // XRAY SYSTEM - Direct Renderer Hook
    // ==========================================
    
    /**
     * Xray Highlight Mode - Creates wireframe boxes around target blocks
     * Uses xrayBlocks data from world.js module
     */
    const updateXrayHighlight = () => {
        const xrayData = window.anticlient.visuals
        const active = xrayData?.xray && xrayData?.xraySettings?.mode === 'highlight'
        const xrayBlocks = xrayData?.xrayBlocks || []
        const settings = xrayData?.xraySettings || { color: '#00ff00' }
        const xColor = parseColor(settings.color)

        if (active && xrayBlocks.length > 0) {
            const currentKeys = new Set()
            const log = window.anticlientLogger?.module('XRay-Highlight')

            for (const vec of xrayBlocks) {
                const key = `xray_${vec.x},${vec.y},${vec.z}`
                currentKeys.add(key)

                if (!xrayMeshes.has(key)) {
                    // Create wireframe box
                    const geometry = new THREE.BoxGeometry(1.02, 1.02, 1.02)
                    const edges = new THREE.EdgesGeometry(geometry)
                    const xrayMat = xrayMaterial.clone()
                    xrayMat.color.setHex(xColor)
                    const line = new THREE.LineSegments(edges, xrayMat)
                    line.frustumCulled = false
                    line.renderOrder = 990 // Render on top

                    // Add filled transparent box for better visibility
                    const fillGeometry = new THREE.BoxGeometry(1.01, 1.01, 1.01)
                    const fillMaterial = new THREE.MeshBasicMaterial({
                        color: xColor,
                        transparent: true,
                        opacity: 0.15,
                        depthTest: false,
                        depthWrite: false,
                        side: THREE.DoubleSide
                    })
                    const fillMesh = new THREE.Mesh(fillGeometry, fillMaterial)
                    fillMesh.frustumCulled = false
                    fillMesh.renderOrder = 989

                    // Group them together
                    const group = new THREE.Group()
                    group.add(line)
                    group.add(fillMesh)
                    group.position.set(vec.x + 0.5, vec.y + 0.5, vec.z + 0.5)
                    
                    world.scene.add(group)
                    xrayMeshes.set(key, { group, line, fill: fillMesh })

                    if (log) log.debug(`Created Xray highlight at ${key}`)
                }

                const meshData = xrayMeshes.get(key)
                meshData.group.visible = true
                meshData.line.material.color.setHex(xColor)
                meshData.fill.material.color.setHex(xColor)
            }

            // Hide meshes not in current list
            for (const [key, meshData] of xrayMeshes.entries()) {
                if (!currentKeys.has(key)) {
                    meshData.group.visible = false
                }
            }
        } else {
            // Hide all xray meshes
            for (const meshData of xrayMeshes.values()) {
                meshData.group.visible = false
            }
        }
    }

    /**
     * Xray See-Through Mode - Modifies world material opacity
     * Glass mode: Makes terrain semi-transparent
     * Opacity mode: Uses custom opacity value
     */
    const updateXraySeeThrough = () => {
        const xrayData = window.anticlient.visuals
        const active = xrayData?.xray && xrayData?.xraySettings?.mode === 'seethrough'
        const settings = xrayData?.xraySettings || {}
        const seeThroughMode = settings.seeThroughMode || 'glass'
        const opacity = settings.opacity || 0.3

        // Check if we need to apply or remove see-through effect
        const shouldBeActive = active
        const wasActive = xrayState.active && xrayState.mode === 'seethrough'

        if (shouldBeActive && !wasActive) {
            // Activate see-through mode
            applySeeThroughEffect(seeThroughMode, opacity)
            xrayState.active = true
            xrayState.mode = 'seethrough'
            xrayState.seeThroughMode = seeThroughMode
            
            const log = window.anticlientLogger?.module('XRay-SeeThrough')
            if (log) log.info(`Activated ${seeThroughMode} mode with opacity ${opacity}`)
        } else if (!shouldBeActive && wasActive) {
            // Deactivate see-through mode
            removeSeeThroughEffect()
            xrayState.active = false
            
            const log = window.anticlientLogger?.module('XRay-SeeThrough')
            if (log) log.info('Deactivated see-through mode')
        } else if (shouldBeActive && wasActive) {
            // Update settings if changed
            if (xrayState.seeThroughMode !== seeThroughMode || xrayState.lastSettings?.opacity !== opacity) {
                updateSeeThroughEffect(seeThroughMode, opacity)
                xrayState.seeThroughMode = seeThroughMode
            }
        }

        xrayState.lastSettings = { ...settings }
    }

    /**
     * Apply see-through effect to world material
     */
    const applySeeThroughEffect = (mode, opacity) => {
        // Store original material properties if not stored
        if (!xrayState.originalMaterialProps && world.material) {
            xrayState.originalMaterialProps = {
                transparent: world.material.transparent,
                opacity: world.material.opacity,
                depthWrite: world.material.depthWrite,
                alphaTest: world.material.alphaTest
            }
        }

        // Modify the main world material
        if (world.material) {
            world.material.transparent = true
            world.material.needsUpdate = true

            if (mode === 'glass') {
                world.material.opacity = 0.4
                world.material.depthWrite = false
            } else if (mode === 'opacity') {
                world.material.opacity = opacity
                world.material.depthWrite = opacity > 0.5
            }
        }

        // Also modify section objects for more comprehensive effect
        modifySectionMaterials(mode, opacity)
    }

    /**
     * Remove see-through effect and restore original material
     */
    const removeSeeThroughEffect = () => {
        // Restore main material
        if (world.material && xrayState.originalMaterialProps) {
            world.material.transparent = xrayState.originalMaterialProps.transparent
            world.material.opacity = xrayState.originalMaterialProps.opacity
            world.material.depthWrite = xrayState.originalMaterialProps.depthWrite
            world.material.alphaTest = xrayState.originalMaterialProps.alphaTest
            world.material.needsUpdate = true
        }

        // Restore section materials
        restoreSectionMaterials()
        
        xrayState.originalMaterialProps = null
        xrayState.modifiedSections.clear()
    }

    /**
     * Update see-through effect with new settings
     */
    const updateSeeThroughEffect = (mode, opacity) => {
        if (world.material) {
            if (mode === 'glass') {
                world.material.opacity = 0.4
                world.material.depthWrite = false
            } else if (mode === 'opacity') {
                world.material.opacity = opacity
                world.material.depthWrite = opacity > 0.5
            }
            world.material.needsUpdate = true
        }

        // Update section materials
        updateSectionMaterials(mode, opacity)
    }

    /**
     * Modify section object materials for see-through effect
     */
    const modifySectionMaterials = (mode, opacity) => {
        if (!world.sectionObjects) return

        for (const [key, section] of Object.entries(world.sectionObjects)) {
            if (!section) continue

            section.traverse((child) => {
                if (child.isMesh && child.material) {
                    // Store original properties
                    if (!child.userData.originalMaterial) {
                        child.userData.originalMaterial = {
                            transparent: child.material.transparent,
                            opacity: child.material.opacity,
                            depthWrite: child.material.depthWrite
                        }
                    }

                    // Apply see-through effect
                    child.material.transparent = true
                    if (mode === 'glass') {
                        child.material.opacity = 0.4
                        child.material.depthWrite = false
                    } else {
                        child.material.opacity = opacity
                        child.material.depthWrite = opacity > 0.5
                    }
                    child.material.needsUpdate = true
                }
            })

            xrayState.modifiedSections.add(key)
        }
    }

    /**
     * Restore section materials to original state
     */
    const restoreSectionMaterials = () => {
        if (!world.sectionObjects) return

        for (const key of xrayState.modifiedSections) {
            const section = world.sectionObjects[key]
            if (!section) continue

            section.traverse((child) => {
                if (child.isMesh && child.material && child.userData.originalMaterial) {
                    const orig = child.userData.originalMaterial
                    child.material.transparent = orig.transparent
                    child.material.opacity = orig.opacity
                    child.material.depthWrite = orig.depthWrite
                    child.material.needsUpdate = true
                    delete child.userData.originalMaterial
                }
            })
        }
    }

    /**
     * Update section materials with new settings
     */
    const updateSectionMaterials = (mode, opacity) => {
        if (!world.sectionObjects) return

        for (const key of xrayState.modifiedSections) {
            const section = world.sectionObjects[key]
            if (!section) continue

            section.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (mode === 'glass') {
                        child.material.opacity = 0.4
                        child.material.depthWrite = false
                    } else {
                        child.material.opacity = opacity
                        child.material.depthWrite = opacity > 0.5
                    }
                    child.material.needsUpdate = true
                }
            })
        }
    }

    /**
     * Handle new chunks being loaded - apply xray effect if active
     */
    const onChunkFinished = (chunkKey) => {
        if (xrayState.active && xrayState.mode === 'seethrough') {
            const section = world.sectionObjects[chunkKey]
            if (section && !xrayState.modifiedSections.has(chunkKey)) {
                section.traverse((child) => {
                    if (child.isMesh && child.material) {
                        if (!child.userData.originalMaterial) {
                            child.userData.originalMaterial = {
                                transparent: child.material.transparent,
                                opacity: child.material.opacity,
                                depthWrite: child.material.depthWrite
                            }
                        }

                        child.material.transparent = true
                        if (xrayState.seeThroughMode === 'glass') {
                            child.material.opacity = 0.4
                            child.material.depthWrite = false
                        } else {
                            const opacity = xrayState.lastSettings?.opacity || 0.3
                            child.material.opacity = opacity
                            child.material.depthWrite = opacity > 0.5
                        }
                        child.material.needsUpdate = true
                    }
                })
                xrayState.modifiedSections.add(chunkKey)
            }
        }
    }

    // Listen for chunk finished events to apply xray to new chunks
    if (world.renderUpdateEmitter) {
        world.renderUpdateEmitter.on('chunkFinished', onChunkFinished)
    }

    /**
     * Main Xray update function - handles all modes
     */
    const updateXray = () => {
        const xrayData = window.anticlient.visuals
        const xrayEnabled = xrayData?.xray
        const settings = xrayData?.xraySettings

        if (!xrayEnabled) {
            // Xray disabled - cleanup
            if (xrayState.active) {
                if (xrayState.mode === 'seethrough') {
                    removeSeeThroughEffect()
                }
                xrayState.active = false
            }
            // Hide highlight meshes
            for (const meshData of xrayMeshes.values()) {
                meshData.group.visible = false
            }
            return
        }

        const mode = settings?.mode || 'highlight'

        // Handle mode switching
        if (xrayState.active && xrayState.mode !== mode) {
            // Mode changed - cleanup previous mode
            if (xrayState.mode === 'seethrough') {
                removeSeeThroughEffect()
            }
            xrayState.active = false
        }

        // Update based on current mode
        if (mode === 'highlight') {
            updateXrayHighlight()
            xrayState.active = true
            xrayState.mode = 'highlight'
        } else if (mode === 'seethrough') {
            updateXraySeeThrough()
        }
    }

    // ==========================================
    // END XRAY SYSTEM
    // ==========================================

    const update = () => {
        if (!window.bot || !window.bot.entities || !window.bot.entity || !window.bot.entity.position) return

        const settings = window.anticlient.visuals.espSettings || { playerColor: '#00ffff', mobColor: '#ff0000' }
        const pColor = parseColor(settings.playerColor)
        const mColor = parseColor(settings.mobColor)

        // Calculate camera/eye position for tracers
        const eyePos = window.bot.entity.position.offset(0, 1.62, 0)

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

                        // Scale based on distance to maintain constant screen size (3-5% of screen height)
                        // Formula: scale = distance * targetScreenPercentage * fov_factor
                        const targetScreenPercent = 0.04 // 4% of screen height
                        const fov = world.camera?.fov || 75
                        const fovFactor = Math.tan((fov * Math.PI) / 360) // Convert FOV to radians and get tan
                        const scale = distance * targetScreenPercent * fovFactor * 2
                        espData.distanceLabel.scale.set(scale, scale * 0.25, 1)

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

                    // Update tracer line positions
                    const positions = line.geometry.attributes.position.array
                    // Start from player's eye position
                    positions[0] = eyePos.x
                    positions[1] = eyePos.y
                    positions[2] = eyePos.z
                    // End at entity's center (chest height)
                    positions[3] = pos.x
                    positions[4] = pos.y + 0.9
                    positions[5] = pos.z
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

        // --- X-Ray System ---
        updateXray()

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
