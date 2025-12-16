# Anticlient-Dev

Debug and testing sandbox for Anticlient development. Use this mod to test new features before adding them to the main Anticlient mod.

## Quick Start

1. **Edit test code**: Modify `src/test.js` with your test code
2. **Bundle**: Run the bundle command
3. **Test**: Enable the mod in webclient and check browser console

## Building

```bash
# Bundle the dev mod
npx -y esbuild anticlient-dev/src/entry.js --bundle --format=esm --outfile=anticlient-dev/mainUnstable.js
```

## File Structure

```
anticlient-dev/
├── mainUnstable.js       # Bundled output (DO NOT EDIT DIRECTLY)
├── README.md             # This file
└── src/
    ├── entry.js          # Main entry point (loads utils + test)
    ├── utils.js          # Shared utility functions
    └── test.js           # YOUR TEST CODE GOES HERE
```

## Development Workflow

1. Write your test code in `src/test.js`
2. Bundle: `npx -y esbuild anticlient-dev/src/entry.js --bundle --format=esm --outfile=anticlient-dev/mainUnstable.js`
3. Reload webclient and enable the mod
4. Check console for output, use `window.acDev` API
5. Once working, migrate code to main Anticlient mod

## Console API (`window.acDev`)

After the mod loads, you can use these functions in the browser console:

### Utilities
```javascript
await acDev.waitForWorld()     // Wait for world renderer
await acDev.waitForBot()       // Wait for bot instance
acDev.getMcData()              // Get Minecraft block/item data
acDev.getBlockStateIds('stone') // Get all state IDs for a block
acDev.parseColor('#ff0000')    // Parse hex color to number
```

### Debug / Inspection
```javascript
acDev.dumpWorldInfo()          // Log world renderer info
acDev.listSections()           // List all chunk sections
acDev.inspectSection('0,0,0')  // Inspect a specific section
```

### Xray Testing
```javascript
acDev.testGlassXray({ opacity: 0.3 })  // Make terrain transparent
acDev.restore()                         // Restore original materials
```

### Three.js Objects
```javascript
acDev.addTestBox({ color: 0xff0000, size: 2 })  // Add test box at player
acDev.clearTestObjects()                         // Remove all test objects
```

### Render Callbacks
```javascript
acDev.addRenderCallback('myTest', (world) => {
    // This runs every frame
    console.log('Frame!')
})
acDev.clearRenderCallbacks()  // Remove all callbacks
```

### Test Code Management
```javascript
await acDev.reloadTest()  // Re-run test.js init (after hot reload)
acDev.state               // Access shared state object
acDev.ctx                 // Access test context
```

## Writing Test Code (`src/test.js`)

```javascript
import { logger, waitForWorld } from './utils.js'

export async function init(ctx) {
    logger.log('Test starting...')
    
    const world = await waitForWorld()
    ctx.world = world
    
    // Your test code here
    const THREE = window.THREE
    const box = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    )
    box.position.set(0, 100, 0)
    world.scene.add(box)
    ctx.state.myBox = box
}

export function cleanup(ctx) {
    // Cleanup when mod deactivates
    if (ctx.state.myBox && ctx.world?.scene) {
        ctx.world.scene.remove(ctx.state.myBox)
    }
}
```

## Available in `ctx`

| Property | Description |
|----------|-------------|
| `ctx.state` | Shared state object - store your test objects here |
| `ctx.world` | World renderer (after `waitForWorld()`) |
| `ctx.bot` | Bot instance (after `waitForBot()`) |
| `ctx.THREE` | Three.js library |

## Minimap Features

The current test implements an enhanced minimap with the following features:

### Basic Minimap
- Real-time top-down terrain view
- Player position and direction indicator
- Entity tracking (players, mobs)
- Zoom controls (0.5x, 1x, 2x, 4x)
- Height-based terrain shading
- Compass directions (N, S, E, W)

### Chunk-Based World Map
- Press **M** to open the expanded world map
- Automatically captures 16x16 chunk images as you explore
- Captures nearby chunks every 5 seconds
- Displays all seen chunks stitched together with correct positions
- Shows your current position on the world map
- Visible chunk borders for reference

### Technical Details
- Uses Three.js orthographic camera for chunk capture
- 64x64 pixel resolution per chunk
- Canvas-based rendering for performance
- Chunk caching system to store explored areas
- Height scanning with terrain color mapping

## Tips

- Always clean up objects in `cleanup()` to avoid memory leaks
- Use `ctx.state` to store references to objects you create
- Check `window.world` and `window.bot` availability before using them
- Use `acDev.logger.log()` for consistent logging with prefix
- After editing `test.js`, rebuild and reload the page (or use `acDev.reloadTest()` if supported)
