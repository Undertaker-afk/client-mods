// Anticlient Dev - Test File
// ===========================
// This is where you write test code for new features.
// Edit this file, then run the bundle command to test.
//
// Available utilities from window.acDev:
//   - waitForWorld()     Wait for world renderer
//   - waitForBot()       Wait for bot instance
//   - getMcData()        Get Minecraft block data
//   - getBlockStateIds() Get state IDs for a block
//   - parseColor()       Parse hex color to number
//   - logger.log/warn/error/info/debug
//   - dumpWorldInfo()    Log world renderer info
//   - listSections()     List chunk sections
//   - inspectSection()   Inspect a section
//
// The `ctx` object passed to init/cleanup contains:
//   - state: Shared state object for your test
//   - world: The world renderer (after waitForWorld)
//   - bot: The bot instance (after waitForBot)
//   - THREE: The Three.js library

import { logger, waitForWorld, waitForBot } from './utils.js'

/**
 * Initialize your test code here.
 * This runs when the mod loads.
 * 
 * @param {object} ctx - Context object with utilities
 */
export async function init(ctx) {
    logger.log('Test code initializing...')
    
    // Example: Wait for world and do something
    try {
        const world = await waitForWorld()
        ctx.world = world
        logger.log('World ready!')
        
        // ==========================================
        // YOUR TEST CODE HERE
        // ==========================================
        
        // Example: Log some info
        logger.log('Scene children:', world.scene.children.length)
        logger.log('Material type:', world.material.type)
        
        // Example: Add a test render callback
        // world.onRender.push(() => {
        //     // This runs every frame
        // })
        
        // Example: Create a test box
        // const THREE = window.THREE
        // const geometry = new THREE.BoxGeometry(1, 1, 1)
        // const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 })
        // const box = new THREE.Mesh(geometry, material)
        // box.position.set(0, 100, 0)
        // world.scene.add(box)
        // ctx.state.testBox = box
        
    } catch (err) {
        logger.error('Test init failed:', err)
    }
}

/**
 * Cleanup your test code here.
 * This runs when the mod is deactivated.
 * 
 * @param {object} ctx - Context object with utilities
 */
export function cleanup(ctx) {
    logger.log('Test code cleaning up...')
    
    // ==========================================
    // YOUR CLEANUP CODE HERE
    // ==========================================
    
    // Example: Remove test objects
    // if (ctx.state.testBox && ctx.world?.scene) {
    //     ctx.world.scene.remove(ctx.state.testBox)
    //     ctx.state.testBox.geometry.dispose()
    //     ctx.state.testBox.material.dispose()
    // }
}
