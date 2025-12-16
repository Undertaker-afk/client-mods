// Anticlient Dev - Utilities Module
// ==================================
// Shared utility functions for testing and debugging.
// These are available via window.acDev after the mod loads.

/**
 * Wait until window.world (WorldRendererThree) is available
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<object>} - The world renderer instance
 */
export function waitForWorld(timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const start = Date.now()
        const check = () => {
            const world = window.world
            if (world && world.sectionObjects && world.scene && world.material) {
                resolve(world)
                return
            }
            if (Date.now() - start > timeoutMs) {
                reject(new Error('Timed out waiting for window.world'))
                return
            }
            setTimeout(check, 100)
        }
        check()
    })
}

/**
 * Wait until window.bot is available
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<object>} - The bot instance
 */
export function waitForBot(timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const start = Date.now()
        const check = () => {
            if (window.bot && window.bot.entity) {
                resolve(window.bot)
                return
            }
            if (Date.now() - start > timeoutMs) {
                reject(new Error('Timed out waiting for window.bot'))
                return
            }
            setTimeout(check, 100)
        }
        check()
    })
}

/**
 * Get Minecraft data (block definitions, etc.)
 */
export function getMcData() {
    return window.loadedData || window.mcData || globalThis?.mcData
}

/**
 * Get all state IDs for a block name
 */
export function getBlockStateIds(blockName) {
    const mcData = getMcData()
    if (!mcData?.blocksByName) return []
    const block = mcData.blocksByName[blockName]
    if (!block) return []

    const ids = []
    if (block.minStateId !== undefined && block.maxStateId !== undefined) {
        for (let id = block.minStateId; id <= block.maxStateId; id++) {
            ids.push(id)
        }
    } else if (block.defaultState !== undefined) {
        ids.push(block.defaultState)
    }
    return ids
}

/**
 * Parse hex color string to number
 */
export function parseColor(str) {
    if (typeof str === 'number') return str
    return parseInt(str.replace('#', '0x'), 16)
}

/**
 * Simple logger with prefix
 */
export const logger = {
    log: (...args) => console.log('[AC-Dev]', ...args),
    warn: (...args) => console.warn('[AC-Dev]', ...args),
    error: (...args) => console.error('[AC-Dev]', ...args),
    info: (...args) => console.info('[AC-Dev]', ...args),
    debug: (...args) => console.debug('[AC-Dev]', ...args)
}

/**
 * Dump world renderer info to console
 */
export function dumpWorldInfo() {
    const world = window.world
    if (!world) {
        logger.warn('World not available yet. Call waitForWorld() first.')
        return null
    }

    const info = {
        hasScene: !!world.scene,
        hasMaterial: !!world.material,
        hasCamera: !!world.camera,
        sectionCount: Object.keys(world.sectionObjects || {}).length,
        onRenderCount: (world.onRender || []).length,
        materialType: world.material?.type,
        materialTransparent: world.material?.transparent,
        materialOpacity: world.material?.opacity,
    }

    logger.log('World Info:', info)
    return info
}

/**
 * List all section keys (chunks)
 */
export function listSections() {
    const world = window.world
    if (!world?.sectionObjects) {
        logger.warn('World not available')
        return []
    }
    const keys = Object.keys(world.sectionObjects)
    logger.log(`Found ${keys.length} sections`)
    return keys
}

/**
 * Inspect a specific section
 */
export function inspectSection(key) {
    const world = window.world
    if (!world?.sectionObjects) {
        logger.warn('World not available')
        return null
    }
    const section = world.sectionObjects[key]
    if (!section) {
        logger.warn(`Section ${key} not found`)
        return null
    }

    const info = {
        key,
        type: section.type,
        childCount: section.children?.length || 0,
        visible: section.visible,
        position: section.position ? { x: section.position.x, y: section.position.y, z: section.position.z } : null,
        meshes: []
    }

    section.traverse((child) => {
        if (child.isMesh) {
            info.meshes.push({
                name: child.name,
                materialType: child.material?.type,
                vertexCount: child.geometry?.attributes?.position?.count
            })
        }
    })

    logger.log('Section Info:', info)
    return info
}
