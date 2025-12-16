// Anticlient Dev - Entry Point
// =============================
// This mod provides utilities for testing new features before adding them to Anticlient.
// 
// Edit src/test.js to write your test code, then bundle with:
//   npx -y esbuild anticlient-dev/src/entry.js --bundle --format=esm --outfile=anticlient-dev/mainUnstable.js

import * as utils from './utils.js'
import * as test from './test.js'

export default (mod) => {
    console.log('[Anticlient-Dev] Debug mod loaded')

    const { logger } = utils

    // Shared state for tests
    const state = {
        world: null,
        bot: null,
        testObjects: [],
        renderCallbacks: [],
        originalMaterials: new Map()
    }

    // Context passed to test code
    const ctx = {
        state,
        world: null,
        bot: null,
        THREE: window.THREE
    }

    // ==========================================
    // BUILT-IN DEBUG TOOLS
    // ==========================================

    /**
     * Test glass xray effect - makes terrain transparent
     */
    async function testGlassXray(options = {}) {
        const { opacity = 0.3, depthWrite = false } = options

        const world = await utils.waitForWorld().catch(err => {
            logger.error('Failed to get world:', err)
            return null
        })
        if (!world) return

        // Store and modify main material
        if (!state.originalMaterials.has('main')) {
            state.originalMaterials.set('main', {
                transparent: world.material.transparent,
                opacity: world.material.opacity,
                depthWrite: world.material.depthWrite
            })
        }

        world.material.transparent = true
        world.material.opacity = opacity
        world.material.depthWrite = depthWrite
        world.material.needsUpdate = true

        // Apply to sections
        for (const [key, section] of Object.entries(world.sectionObjects)) {
            if (!section) continue
            section.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (!child.userData._acDevOrig) {
                        child.userData._acDevOrig = {
                            transparent: child.material.transparent,
                            opacity: child.material.opacity,
                            depthWrite: child.material.depthWrite
                        }
                    }
                    child.material.transparent = true
                    child.material.opacity = opacity
                    child.material.depthWrite = depthWrite
                    child.material.needsUpdate = true
                }
            })
        }

        logger.log(`Glass Xray enabled: opacity=${opacity}`)
    }

    /**
     * Restore original materials
     */
    async function restore() {
        const world = await utils.waitForWorld().catch(() => null)
        if (!world) return

        // Restore main material
        const mainOrig = state.originalMaterials.get('main')
        if (mainOrig) {
            world.material.transparent = mainOrig.transparent
            world.material.opacity = mainOrig.opacity
            world.material.depthWrite = mainOrig.depthWrite
            world.material.needsUpdate = true
            state.originalMaterials.delete('main')
        }

        // Restore sections
        for (const section of Object.values(world.sectionObjects)) {
            if (!section) continue
            section.traverse((child) => {
                if (child.isMesh && child.material && child.userData._acDevOrig) {
                    const orig = child.userData._acDevOrig
                    child.material.transparent = orig.transparent
                    child.material.opacity = orig.opacity
                    child.material.depthWrite = orig.depthWrite
                    child.material.needsUpdate = true
                    delete child.userData._acDevOrig
                }
            })
        }

        logger.log('Materials restored')
    }

    /**
     * Add a test box at player position
     */
    async function addTestBox(options = {}) {
        const { color = 0x00ff00, size = 1, offset = { x: 0, y: 2, z: 0 } } = options

        const world = await utils.waitForWorld().catch(() => null)
        if (!world?.scene || !window.THREE) {
            logger.warn('World or THREE not available')
            return null
        }

        const THREE = window.THREE
        const geometry = new THREE.BoxGeometry(size, size, size)
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.5,
            depthTest: false
        })
        const box = new THREE.Mesh(geometry, material)

        const playerPos = window.bot?.entity?.position
        if (playerPos) {
            box.position.set(playerPos.x + offset.x, playerPos.y + offset.y, playerPos.z + offset.z)
        }

        box.frustumCulled = false
        box.renderOrder = 999
        box.userData._acDevTest = true

        world.scene.add(box)
        state.testObjects.push(box)
        logger.log('Added test box at:', box.position)
        return box
    }

    /**
     * Clear all test objects
     */
    async function clearTestObjects() {
        const world = await utils.waitForWorld().catch(() => null)
        if (!world?.scene) return

        for (const obj of state.testObjects) {
            world.scene.remove(obj)
            if (obj.geometry) obj.geometry.dispose()
            if (obj.material) obj.material.dispose()
        }
        state.testObjects = []
        logger.log('Test objects cleared')
    }

    /**
     * Add a render callback
     */
    async function addRenderCallback(name, fn) {
        const world = await utils.waitForWorld().catch(() => null)
        if (!world?.onRender) {
            logger.warn('world.onRender not available')
            return
        }

        const wrapped = () => {
            try { fn(world) } catch (e) { logger.error(`Callback "${name}" error:`, e) }
        }
        wrapped._name = name
        world.onRender.push(wrapped)
        state.renderCallbacks.push(wrapped)
        logger.log(`Added render callback: ${name}`)
    }

    /**
     * Clear render callbacks
     */
    async function clearRenderCallbacks() {
        const world = await utils.waitForWorld().catch(() => null)
        if (!world?.onRender) return

        for (const cb of state.renderCallbacks) {
            const idx = world.onRender.indexOf(cb)
            if (idx !== -1) world.onRender.splice(idx, 1)
        }
        state.renderCallbacks = []
        logger.log('Render callbacks cleared')
    }

    // ==========================================
    // PUBLIC API
    // ==========================================

    const api = {
        // Utilities (from utils.js)
        ...utils,

        // Built-in tools
        testGlassXray,
        restore,
        addTestBox,
        clearTestObjects,
        addRenderCallback,
        clearRenderCallbacks,

        // Access to state and context
        get state() { return state },
        get ctx() { return ctx },
        get world() { return ctx.world || window.world },
        get bot() { return ctx.bot || window.bot },

        // Re-run test init (useful after editing test.js and hot-reloading)
        async reloadTest() {
            if (test.cleanup) test.cleanup(ctx)
            if (test.init) await test.init(ctx)
        }
    }

    // Expose globally
    window.acDev = api

    // Initialize test code
    if (test.init) {
        test.init(ctx).catch(err => logger.error('Test init error:', err))
    }

    logger.log('Debug API ready! Access via window.acDev')
    logger.log('Edit src/test.js and rebuild to test new features')

    return {
        deactivate: () => {
            // Cleanup test code
            if (test.cleanup) {
                try { test.cleanup(ctx) } catch (e) { logger.error('Test cleanup error:', e) }
            }

            // Cleanup built-in tools
            restore()
            clearTestObjects()
            clearRenderCallbacks()

            delete window.acDev
            logger.log('Anticlient-Dev deactivated')
        }
    }
}
