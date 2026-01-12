
// Three.js Renderer Hook for Projectile Visualization
// This file is loaded separately via threeJsBackend support

export const worldReady = (world) => {
    console.log('[Projectile Visuals] Renderer initialized')

    // Ensure anticlient structure exists
    window.anticlient = window.anticlient || {}
    window.anticlient.visuals = window.anticlient.visuals || {}

    const trajectoryLines = []
    const targetBoxes = new Map() // entityId -> { box, label }
    const historyMarkers = new Map() // entityId -> [marker1, marker2, ...]

    // Materials
    const trajectoryMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000,
        depthTest: false,
        transparent: true,
        opacity: 0.9,
        linewidth: 3
    })

    const targetBoxMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff00,
        depthTest: false,
        transparent: true,
        opacity: 1.0,
        linewidth: 2
    })

    const playerBoxMaterial = new THREE.LineBasicMaterial({
        color: 0xffff00,
        depthTest: false,
        transparent: true,
        opacity: 0.8,
        linewidth: 2
    })

    const historyMarkerMaterial = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0.5,
        depthTest: false
    })

    // Helper: Create text sprite
    const createTextSprite = (text, color = '#ffffff') => {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = 512
        canvas.height = 128
        context.font = 'Bold 40px Arial'
        context.fillStyle = color
        context.textAlign = 'center'
        context.fillText(text, 256, 70)

        const texture = new THREE.CanvasTexture(canvas)
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            depthTest: false,
            depthWrite: false,
            sizeAttenuation: true
        })
        const sprite = new THREE.Sprite(spriteMaterial)
        sprite.scale.set(2, 0.5, 1)
        sprite.renderOrder = 999
        return sprite
    }

    // Helper: Create 3D box edges
    const createBox = (width, height, depth) => {
        const geometry = new THREE.BoxGeometry(width, height, depth)
        const edges = new THREE.EdgesGeometry(geometry)
        return edges
    }

    // Helper: Parse color string to hex
    const parseColor = (str) => {
        return parseInt(str.replace('#', '0x'), 16)
    }

    // ==========================================
    // TRAJECTORY RENDERING
    // ==========================================

    const renderTrajectory = () => {
        const data = window.anticlient.visuals
        if (!data || !data.projectileESP || !data.projectileSettings?.showTrajectory) {
            clearTrajectory()
            return
        }

        const trajectory = data.projectileTrajectory
        if (!trajectory || !trajectory.path || trajectory.path.length < 2) {
            clearTrajectory()
            return
        }

        // Clear old lines
        clearTrajectory()

        // Create line geometry from trajectory points
        const points = []
        for (const point of trajectory.path) {
            points.push(new THREE.Vector3(point.x, point.y, point.z))
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        const material = trajectoryMaterial.clone()
        
        // Update color from settings
        const color = parseColor(data.projectileSettings.trajectoryColor || '#ff0000')
        material.color.setHex(color)

        const line = new THREE.Line(geometry, material)
        line.frustumCulled = false
        line.renderOrder = 995

        world.scene.add(line)
        trajectoryLines.push(line)
    }

    const clearTrajectory = () => {
        for (const line of trajectoryLines) {
            world.scene.remove(line)
            if (line.geometry) line.geometry.dispose()
            if (line.material) line.material.dispose()
        }
        trajectoryLines.length = 0
    }

    // ==========================================
    // TARGET BOX RENDERING
    // ==========================================

    const renderTargetBox = () => {
        const data = window.anticlient.visuals
        if (!data || !data.projectileESP || !data.projectileSettings?.showTargetBox) {
            clearTargetBoxes()
            return
        }

        const target = data.projectileTarget
        if (!target || !target.position) {
            clearTargetBoxes()
            return
        }

        const entityId = target.id

        // Create or update target box
        if (!targetBoxes.has(entityId)) {
            const width = target.width || 0.6
            const height = target.height || 1.8
            
            const edges = createBox(width, height, width)
            const material = targetBoxMaterial.clone()
            const color = parseColor(data.projectileSettings.targetColor || '#00ff00')
            material.color.setHex(color)
            
            const box = new THREE.LineSegments(edges, material)
            box.frustumCulled = false
            box.renderOrder = 996

            // Create label
            let labelText = target.username || target.name || 'Target'
            if (data.projectileSettings.showDistance && window.bot?.entity) {
                const distance = target.position.distanceTo(window.bot.entity.position).toFixed(1)
                labelText += ` [${distance}m]`
            }
            if (data.projectileSettings.showVelocity && target.velocity) {
                const vel = target.velocity
                const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z).toFixed(2)
                labelText += ` (${speed}m/s)`
            }

            const label = createTextSprite(labelText, data.projectileSettings.targetColor || '#00ff00')
            
            world.scene.add(box)
            world.scene.add(label)
            
            targetBoxes.set(entityId, { box, label, edges })
        }

        // Update position
        const boxData = targetBoxes.get(entityId)
        const pos = target.position
        const height = target.height || 1.8
        
        boxData.box.position.set(pos.x, pos.y + height / 2, pos.z)
        boxData.label.position.set(pos.x, pos.y + height + 0.5, pos.z)

        // Update label text
        let labelText = target.username || target.name || 'Target'
        if (data.projectileSettings.showDistance && window.bot?.entity) {
            const distance = target.position.distanceTo(window.bot.entity.position).toFixed(1)
            labelText += ` [${distance}m]`
        }
        if (data.projectileSettings.showVelocity && target.velocity) {
            const vel = target.velocity
            const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z).toFixed(2)
            labelText += ` (${speed}m/s)`
        }

        // Update sprite texture with new text
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = 512
        canvas.height = 128
        context.font = 'Bold 40px Arial'
        context.fillStyle = data.projectileSettings.targetColor || '#00ff00'
        context.textAlign = 'center'
        context.fillText(labelText, 256, 70)
        
        boxData.label.material.map.image = canvas
        boxData.label.material.map.needsUpdate = true
    }

    const clearTargetBoxes = () => {
        for (const [entityId, boxData] of targetBoxes) {
            world.scene.remove(boxData.box)
            world.scene.remove(boxData.label)
            
            if (boxData.edges) boxData.edges.dispose()
            if (boxData.box.material) boxData.box.material.dispose()
            if (boxData.label.material.map) boxData.label.material.map.dispose()
            if (boxData.label.material) boxData.label.material.dispose()
        }
        targetBoxes.clear()
    }

    // ==========================================
    // OTHER PLAYERS ESP
    // ==========================================

    const renderOtherPlayers = () => {
        const data = window.anticlient.visuals
        if (!data || !data.projectileESP || !data.projectileSettings?.showOtherPlayers) {
            return
        }

        if (!window.bot || !window.bot.entities) return

        const targetId = data.projectileTarget?.id

        for (const [id, entity] of Object.entries(window.bot.entities)) {
            if (!entity || !entity.position) continue
            if (entity.type !== 'player') continue
            if (entity === window.bot.entity) continue
            if (entity.id === targetId) continue // Skip target, already rendered

            const entityId = entity.id

            // Create or get player box
            if (!targetBoxes.has(entityId)) {
                const width = entity.width || 0.6
                const height = entity.height || 1.8
                
                const edges = createBox(width, height, width)
                const material = playerBoxMaterial.clone()
                const color = parseColor(data.projectileSettings.otherPlayerColor || '#ffff00')
                material.color.setHex(color)
                
                const box = new THREE.LineSegments(edges, material)
                box.frustumCulled = false
                box.renderOrder = 994

                const labelText = entity.username || 'Player'
                const label = createTextSprite(labelText, data.projectileSettings.otherPlayerColor || '#ffff00')
                
                world.scene.add(box)
                world.scene.add(label)
                
                targetBoxes.set(entityId, { box, label, edges, isOtherPlayer: true })
            }

            // Update position
            const boxData = targetBoxes.get(entityId)
            if (!boxData.isOtherPlayer) continue

            const pos = entity.position
            const height = entity.height || 1.8
            
            boxData.box.position.set(pos.x, pos.y + height / 2, pos.z)
            boxData.label.position.set(pos.x, pos.y + height + 0.5, pos.z)
        }

        // Clean up boxes for entities that no longer exist
        for (const [entityId, boxData] of targetBoxes) {
            if (!boxData.isOtherPlayer) continue

            const entity = window.bot.entities[entityId]
            if (!entity) {
                world.scene.remove(boxData.box)
                world.scene.remove(boxData.label)
                
                if (boxData.edges) boxData.edges.dispose()
                if (boxData.box.material) boxData.box.material.dispose()
                if (boxData.label.material.map) boxData.label.material.map.dispose()
                if (boxData.label.material) boxData.label.material.dispose()
                
                targetBoxes.delete(entityId)
            }
        }
    }

    // ==========================================
    // BACKTRACK HISTORY MARKERS
    // ==========================================

    const renderHistoryMarkers = () => {
        const data = window.anticlient.visuals
        if (!data || !data.projectileESP || !data.targetHistory) {
            clearHistoryMarkers()
            return
        }

        const target = data.projectileTarget
        if (!target) {
            clearHistoryMarkers()
            return
        }

        const history = data.targetHistory.history.get(target.id)
        if (!history || history.length < 2) {
            clearHistoryMarkers()
            return
        }

        clearHistoryMarkers()

        // Show last 10 positions
        const recentHistory = history.slice(-10)
        const markers = []

        for (let i = 0; i < recentHistory.length; i++) {
            const entry = recentHistory[i]
            const pos = entry.pos

            // Create small sphere at historical position
            const geometry = new THREE.SphereGeometry(0.1, 8, 8)
            const material = historyMarkerMaterial.clone()
            
            // Fade older positions
            material.opacity = 0.3 + (i / recentHistory.length) * 0.4
            
            const marker = new THREE.Mesh(geometry, material)
            marker.position.set(pos.x, pos.y + 1.0, pos.z)
            marker.frustumCulled = false
            marker.renderOrder = 993

            world.scene.add(marker)
            markers.push(marker)
        }

        historyMarkers.set(target.id, markers)
    }

    const clearHistoryMarkers = () => {
        for (const [entityId, markers] of historyMarkers) {
            for (const marker of markers) {
                world.scene.remove(marker)
                if (marker.geometry) marker.geometry.dispose()
                if (marker.material) marker.material.dispose()
            }
        }
        historyMarkers.clear()
    }

    // ==========================================
    // MAIN RENDER LOOP
    // ==========================================

    const originalRender = world.updateScene.bind(world)
    world.updateScene = (...args) => {
        // Call original render
        originalRender(...args)

        // Render our custom visuals
        try {
            renderTrajectory()
            renderTargetBox()
            renderOtherPlayers()
            renderHistoryMarkers()
        } catch (e) {
            console.error('[Projectile Visuals] Render error:', e)
        }
    }

    // Cleanup function
    window.anticlient.cleanupProjectileVisuals = () => {
        clearTrajectory()
        clearTargetBoxes()
        clearHistoryMarkers()
    }

    console.log('[Projectile Visuals] Ready')
}
