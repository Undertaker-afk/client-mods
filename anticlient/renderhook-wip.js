// WIP direct renderer hook for Anticlient
// ---------------------------------------
// This file is intentionally NOT imported anywhere yet.
// It exposes a small debug / experimentation API on `window.anticlientRenderHook`
// so we can safely play with the Three.js world renderer without breaking anything.
//
// Usage (from devtools console for now):
//   await window.anticlientRenderHook.waitForWorld()
//   window.anticlientRenderHook.enableGlassXray({ hideBlocks: ['stone', 'dirt'], glassBlock: 'glass' })
//   window.anticlientRenderHook.disableGlassXray()
//
// Later we can wire this up from the Anticlient mod itself.

(() => {
    if (typeof window === 'undefined') return

    const hookLog = (...args) => {
        // Lightweight logger, can be swapped to window.anticlientLogger later
        // eslint-disable-next-line no-console
        console.log('[Anticlient RenderHook]', ...args)
    }

    /**
     * Wait until `window.world` is available and looks like a WorldRendererThree.
     * Resolves with the world renderer instance.
     */
    function waitForWorld (timeoutMs = 15000) {
        return new Promise((resolve, reject) => {
            const start = Date.now()

            const check = () => {
                const world = window.world
                if (world && world.sectionObjects && world.scene && world.material) {
                    resolve(world)
                    return
                }
                if (Date.now() - start > timeoutMs) {
                    reject(new Error('Timed out waiting for window.world (WorldRendererThree)'))
                    return
                }
                setTimeout(check, 100)
            }

            check()
        })
    }

    // --- Block helpers ------------------------------------------------------

    function getMcData () {
        return window.loadedData || window.mcData || window.globalThis?.mcData
    }

    function getBlockStateIds (blockName) {
        const mcData = getMcData()
        if (!mcData || !mcData.blocksByName) return []
        const blk = mcData.blocksByName[blockName]
        if (!blk) return []

        const ids = []
        if (blk.minStateId !== undefined && blk.maxStateId !== undefined) {
            for (let id = blk.minStateId; id <= blk.maxStateId; id++) ids.push(id)
        } else if (blk.defaultState !== undefined) {
            ids.push(blk.defaultState)
        }
        return ids
    }

    // --- Glass Xray (WIP, material-level) -----------------------------------

    let originalMaterial = null
    let xrayActive = false

    /**
     * Very early WIP: try to approximate "glass Xray" by tweaking the shared world material.
     * This does NOT yet selectively hide only specific blocks – that will require mesher/geometry work.
     */
    async function enableGlassXray (options = {}) {
        const {
            opacity = 0.15,
            highlightColor = 0x00ff00,
            hideBlocks = ['stone', 'deepslate', 'netherrack', 'dirt', 'grass_block'],
            glassBlock = 'glass',
        } = options

        const world = await waitForWorld().catch(err => {
            hookLog('enableGlassXray failed to get world:', err)
            return null
        })
        if (!world) return

        if (xrayActive) {
            hookLog('Glass Xray already active, updating settings only')
        }

        if (!originalMaterial) {
            originalMaterial = world.material
        }

        // Clone the base material so we can tweak opacity / color safely
        const THREE = window.THREE
        if (!THREE || !world.material) {
            hookLog('THREE or world.material not available')
            return
        }

        const newMat = world.material.clone()
        newMat.transparent = true
        newMat.opacity = opacity
        newMat.depthWrite = false
        // Keep vertex colors but optionally tint a bit towards highlightColor
        // (Real per-block highlighting will need custom attributes / separate materials.)

        world.material = newMat

        // NOTE:
        // - Right now this makes *all* blocks more transparent.
        // - To properly hide only `hideBlocks` and keep ore blocks solid, we’ll
        //   need to integrate with the mesher output (per-face / per-block data).
        const hideIds = hideBlocks.flatMap(getBlockStateIds)
        const glassIds = getBlockStateIds(glassBlock)
        hookLog('Glass Xray enabled (WIP). hideIds:', hideIds.length, 'glassIds:', glassIds.length)

        xrayActive = true
    }

    async function disableGlassXray () {
        const world = await waitForWorld().catch(err => {
            hookLog('disableGlassXray failed to get world:', err)
            return null
        })
        if (!world) return

        if (originalMaterial) {
            world.material = originalMaterial
            originalMaterial = null
        }

        xrayActive = false
        hookLog('Glass Xray disabled')
    }

    // --- Public API ---------------------------------------------------------

    window.anticlientRenderHook = {
        waitForWorld,
        enableGlassXray,
        disableGlassXray,
    }

    hookLog('renderhook-wip loaded; API exposed as window.anticlientRenderHook')
})()


