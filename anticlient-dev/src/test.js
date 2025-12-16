// Anticlient Dev - Minimap Test
// ==============================
// A simple top-down minimap showing terrain, player position, and entities

import { logger, waitForWorld, waitForBot } from './utils.js'

// Block colors for the minimap (approximate Minecraft colors)
const BLOCK_COLORS = {
    // Air/void
    'air': null,
    'cave_air': null,
    'void_air': null,
    
    // Water
    'water': '#3f76e4',
    'bubble_column': '#3f76e4',
    
    // Lava
    'lava': '#ff6600',
    
    // Grass/plants
    'grass_block': '#7cbd6b',
    'tall_grass': '#7cbd6b',
    'grass': '#7cbd6b',
    'fern': '#7cbd6b',
    
    // Dirt variants
    'dirt': '#8b6b4a',
    'coarse_dirt': '#6d5539',
    'rooted_dirt': '#8b6b4a',
    'mud': '#3c3837',
    'podzol': '#6b5a3e',
    'mycelium': '#6f6369',
    
    // Stone variants
    'stone': '#7d7d7d',
    'cobblestone': '#6a6a6a',
    'mossy_cobblestone': '#5a6a5a',
    'deepslate': '#4a4a4a',
    'granite': '#8b6b5a',
    'diorite': '#c0c0c0',
    'andesite': '#9a9a9a',
    'tuff': '#6b6b5a',
    'calcite': '#e0e0e0',
    'dripstone_block': '#7a6a5a',
    
    // Sand/desert
    'sand': '#e0d4a0',
    'sandstone': '#d4c48c',
    'red_sand': '#c07030',
    'red_sandstone': '#b86030',
    
    // Wood/logs
    'oak_log': '#6b5030',
    'spruce_log': '#3b2810',
    'birch_log': '#d4c8a0',
    'jungle_log': '#5a4020',
    'acacia_log': '#6b4030',
    'dark_oak_log': '#3b2810',
    'mangrove_log': '#5a3020',
    'cherry_log': '#d0708d',
    
    // Leaves
    'oak_leaves': '#4a8b32',
    'spruce_leaves': '#3a6b32',
    'birch_leaves': '#6a9b52',
    'jungle_leaves': '#3a8b22',
    'acacia_leaves': '#5a8b32',
    'dark_oak_leaves': '#3a6b22',
    'mangrove_leaves': '#6a8b52',
    'cherry_leaves': '#e9b1c7',
    'azalea_leaves': '#5a8b42',
    
    // Snow/ice
    'snow': '#f0f0f0',
    'snow_block': '#f0f0f0',
    'powder_snow': '#f8f8f8',
    'ice': '#a0c0ff',
    'packed_ice': '#90b0f0',
    'blue_ice': '#70a0ff',
    
    // Ores (make them stand out)
    'coal_ore': '#303030',
    'iron_ore': '#d4a070',
    'copper_ore': '#c07050',
    'gold_ore': '#ffff00',
    'diamond_ore': '#00ffff',
    'emerald_ore': '#00ff00',
    'lapis_ore': '#3050c0',
    'redstone_ore': '#ff0000',
    'ancient_debris': '#6b4030',
    'nether_gold_ore': '#ffff00',
    'nether_quartz_ore': '#e0d4c0',
    
    // Nether
    'netherrack': '#6b3030',
    'nether_bricks': '#3b2020',
    'soul_sand': '#5a4a3a',
    'soul_soil': '#4a3a2a',
    'basalt': '#4a4a4a',
    'blackstone': '#2a2a2a',
    'glowstone': '#ffcc00',
    'crimson_nylium': '#8b2020',
    'warped_nylium': '#206060',
    
    // End
    'end_stone': '#e0e0a0',
    'end_stone_bricks': '#d0d090',
    'obsidian': '#1a0a20',
    
    // Building blocks
    'bricks': '#9b5040',
    'stone_bricks': '#7a7a7a',
    'mossy_stone_bricks': '#5a7a5a',
    'terracotta': '#9a5a4a',
    'clay': '#a0a0b0',
    'gravel': '#8a8080',
    
    // Path/farmland
    'dirt_path': '#9b8b50',
    'farmland': '#6a5030',
    
    // Default fallback
    '_default': '#808080'
}

// Entity colors
const ENTITY_COLORS = {
    player: '#00ff00',
    self: '#ffffff',
    hostile: '#ff0000',
    passive: '#ffff00',
    other: '#888888'
}

// Hostile mob list
const HOSTILE_MOBS = [
    'zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'witch',
    'slime', 'phantom', 'drowned', 'husk', 'stray', 'blaze', 'ghast',
    'magma_cube', 'wither_skeleton', 'piglin_brute', 'vindicator',
    'evoker', 'ravager', 'pillager', 'vex', 'guardian', 'elder_guardian',
    'shulker', 'warden'
]

/**
 * Get color for a block name
 */
function getBlockColor(blockName) {
    if (!blockName) return null
    
    // Direct match
    if (BLOCK_COLORS[blockName]) return BLOCK_COLORS[blockName]
    
    // Partial matches for variants
    for (const [key, color] of Object.entries(BLOCK_COLORS)) {
        if (blockName.includes(key)) return color
    }
    
    // Default
    return BLOCK_COLORS['_default']
}

/**
 * Get entity color based on type
 */
function getEntityColor(entity, selfId) {
    if (entity.id === selfId) return ENTITY_COLORS.self
    if (entity.type === 'player') return ENTITY_COLORS.player
    if (entity.type === 'mob') {
        const name = entity.name?.toLowerCase() || ''
        if (HOSTILE_MOBS.some(h => name.includes(h))) return ENTITY_COLORS.hostile
        return ENTITY_COLORS.passive
    }
    return ENTITY_COLORS.other
}

/**
 * Create the minimap UI
 */
function createMinimapUI() {
    // Container
    const container = document.createElement('div')
    container.id = 'ac-minimap-container'
    container.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.7);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        padding: 4px;
        user-select: none;
    `
    
    // Header with controls
    const header = document.createElement('div')
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 2px 4px;
        font-family: monospace;
        font-size: 10px;
        color: #fff;
        border-bottom: 1px solid rgba(255,255,255,0.2);
        margin-bottom: 4px;
    `
    header.innerHTML = `
        <span>Minimap</span>
        <span id="ac-minimap-coords" style="color: #aaa;">0, 0, 0</span>
    `
    container.appendChild(header)
    
    // Canvas
    const canvas = document.createElement('canvas')
    canvas.id = 'ac-minimap-canvas'
    canvas.width = 150
    canvas.height = 150
    canvas.style.cssText = `
        display: block;
        border-radius: 4px;
        image-rendering: pixelated;
    `
    container.appendChild(canvas)
    
    // Settings bar
    const settings = document.createElement('div')
    settings.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 8px;
        padding: 4px;
        font-family: monospace;
        font-size: 10px;
        color: #aaa;
        border-top: 1px solid rgba(255,255,255,0.2);
        margin-top: 4px;
    `
    
    // Zoom controls
    settings.innerHTML = `
        <span>Zoom:</span>
        <button id="ac-minimap-zoom-out" style="background:#333;color:#fff;border:none;padding:0 6px;cursor:pointer;border-radius:2px;">-</button>
        <span id="ac-minimap-zoom-level">1x</span>
        <button id="ac-minimap-zoom-in" style="background:#333;color:#fff;border:none;padding:0 6px;cursor:pointer;border-radius:2px;">+</button>
    `
    container.appendChild(settings)
    
    document.body.appendChild(container)
    
    return {
        container,
        canvas,
        ctx: canvas.getContext('2d'),
        coordsEl: document.getElementById('ac-minimap-coords'),
        zoomInBtn: document.getElementById('ac-minimap-zoom-in'),
        zoomOutBtn: document.getElementById('ac-minimap-zoom-out'),
        zoomLevelEl: document.getElementById('ac-minimap-zoom-level')
    }
}

/**
 * Minimap class
 */
class Minimap {
    constructor() {
        this.ui = null
        this.zoom = 1 // blocks per pixel
        this.zoomLevels = [0.5, 1, 2, 4]
        this.zoomIndex = 1
        this.updateInterval = null
        this.heightCache = new Map() // Cache surface heights
        this.colorCache = new Map() // Cache block colors
        this.cacheTimeout = 5000 // Clear cache every 5 seconds
        this.lastCacheClear = Date.now()
        
        // Chunk-based rendering
        this.chunkSize = 16 // Minecraft chunk size
        this.chunkCache = new Map() // Store rendered chunk images
        this.maxChunkCacheSize = 200 // Limit cache to 200 chunks (~12.8MB)
        this.lastChunkCapture = 0
        
        // World map
        this.worldMapOpen = false
        this.worldMapUI = null
    }
    
    init() {
        this.ui = createMinimapUI()
        
        // Zoom controls
        this.ui.zoomInBtn.onclick = () => this.changeZoom(1)
        this.ui.zoomOutBtn.onclick = () => this.changeZoom(-1)
        
        // Set up world map keybind
        this.setupWorldMapKeybind()
        
        // Start update loop
        this.updateInterval = setInterval(() => this.update(), 100) // 10 FPS
        
        logger.log('Minimap initialized')
    }
    
    changeZoom(delta) {
        this.zoomIndex = Math.max(0, Math.min(this.zoomLevels.length - 1, this.zoomIndex + delta))
        this.zoom = this.zoomLevels[this.zoomIndex]
        this.ui.zoomLevelEl.textContent = `${this.zoom}x`
        this.clearCache()
    }
    
    clearCache() {
        this.heightCache.clear()
        this.colorCache.clear()
    }
    
    /**
     * Get the surface block at x, z (highest non-air block)
     */
    getSurfaceBlock(bot, x, z, playerY) {
        const cacheKey = `${x},${z}`
        
        // Check cache
        if (this.heightCache.has(cacheKey)) {
            const cached = this.heightCache.get(cacheKey)
            if (cached.y !== undefined) {
                return cached
            }
        }
        
        // Scan from player height downward, then upward
        const scanRange = 32
        const startY = Math.floor(playerY) + 16
        const endY = Math.max(Math.floor(playerY) - scanRange, -64)
        
        for (let y = startY; y >= endY; y--) {
            try {
                const block = bot.blockAt({ x, y, z })
                if (block && block.name !== 'air' && block.name !== 'cave_air' && block.name !== 'void_air') {
                    const result = { block, y }
                    this.heightCache.set(cacheKey, result)
                    return result
                }
            } catch (e) {
                // Block not loaded
            }
        }
        
        // No surface found
        this.heightCache.set(cacheKey, { block: null, y: undefined })
        return { block: null, y: undefined }
    }
    
    /**
     * Get color for a position
     */
    getColorAt(bot, x, z, playerY) {
        const cacheKey = `${x},${z}`
        
        if (this.colorCache.has(cacheKey)) {
            return this.colorCache.get(cacheKey)
        }
        
        const surface = this.getSurfaceBlock(bot, x, z, playerY)
        const color = surface.block ? getBlockColor(surface.block.name) : null
        
        // Apply height shading
        if (color && surface.y !== undefined) {
            const heightDiff = surface.y - playerY
            const shade = Math.max(0.5, Math.min(1.2, 1 + heightDiff * 0.02))
            const shadedColor = this.shadeColor(color, shade)
            this.colorCache.set(cacheKey, shadedColor)
            return shadedColor
        }
        
        this.colorCache.set(cacheKey, color)
        return color
    }
    
    /**
     * Shade a hex color
     */
    shadeColor(hex, factor) {
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        
        const nr = Math.min(255, Math.max(0, Math.floor(r * factor)))
        const ng = Math.min(255, Math.max(0, Math.floor(g * factor)))
        const nb = Math.min(255, Math.max(0, Math.floor(b * factor)))
        
        return `rgb(${nr},${ng},${nb})`
    }
    
    /**
     * Main update function
     */
    update() {
        const bot = window.bot
        if (!bot || !bot.entity || !bot.entity.position) return
        
        const { canvas, ctx, coordsEl } = this.ui
        const pos = bot.entity.position
        const yaw = bot.entity.yaw
        
        // Update coords display
        coordsEl.textContent = `${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)}`
        
        // Capture nearby chunks periodically (every 5 seconds)
        if (!this.lastChunkCapture || Date.now() - this.lastChunkCapture > 5000) {
            this.captureNearbyChunks()
            this.lastChunkCapture = Date.now()
        }
        
        // Clear cache periodically
        if (Date.now() - this.lastCacheClear > this.cacheTimeout) {
            this.clearCache()
            this.lastCacheClear = Date.now()
        }
        
        // Clear canvas
        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Calculate visible area
        const centerX = Math.floor(pos.x)
        const centerZ = Math.floor(pos.z)
        const halfWidth = Math.floor((canvas.width / 2) * this.zoom)
        const halfHeight = Math.floor((canvas.height / 2) * this.zoom)
        
        // Draw terrain
        const pixelSize = 1 / this.zoom
        
        for (let screenY = 0; screenY < canvas.height; screenY++) {
            for (let screenX = 0; screenX < canvas.width; screenX++) {
                // Convert screen coords to world coords
                // Y on screen = Z in world (top = north)
                const worldX = centerX + Math.floor((screenX - canvas.width / 2) * this.zoom)
                const worldZ = centerZ + Math.floor((screenY - canvas.height / 2) * this.zoom)
                
                const color = this.getColorAt(bot, worldX, worldZ, pos.y)
                
                if (color) {
                    ctx.fillStyle = color
                    ctx.fillRect(screenX, screenY, 1, 1)
                }
            }
        }
        
        // Draw entities
        if (bot.entities) {
            for (const [id, entity] of Object.entries(bot.entities)) {
                if (!entity.position) continue
                if (entity === bot.entity) continue // Skip self, we draw it specially
                
                const ex = entity.position.x
                const ez = entity.position.z
                
                // Check if in view
                const dx = ex - centerX
                const dz = ez - centerZ
                
                if (Math.abs(dx) > halfWidth || Math.abs(dz) > halfHeight) continue
                
                // Convert to screen coords
                const screenX = canvas.width / 2 + dx / this.zoom
                const screenY = canvas.height / 2 + dz / this.zoom
                
                // Draw entity dot
                const color = getEntityColor(entity, bot.entity.id)
                ctx.fillStyle = color
                ctx.beginPath()
                ctx.arc(screenX, screenY, 3, 0, Math.PI * 2)
                ctx.fill()
            }
        }
        
        // Draw player marker (center, with direction)
        const playerScreenX = canvas.width / 2
        const playerScreenY = canvas.height / 2
        
        ctx.save()
        ctx.translate(playerScreenX, playerScreenY)
        ctx.rotate(-yaw + Math.PI) // Rotate to face direction (Minecraft yaw is weird)
        
        // Draw arrow shape
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.moveTo(0, -6)  // Tip
        ctx.lineTo(-4, 4)  // Bottom left
        ctx.lineTo(0, 2)   // Bottom center
        ctx.lineTo(4, 4)   // Bottom right
        ctx.closePath()
        ctx.fill()
        
        // Arrow outline
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 1
        ctx.stroke()
        
        ctx.restore()
        
        // Draw compass directions
        ctx.font = 'bold 10px monospace'
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.fillText('N', canvas.width / 2, 12)
        ctx.fillText('S', canvas.width / 2, canvas.height - 4)
        ctx.textAlign = 'left'
        ctx.fillText('W', 4, canvas.height / 2 + 4)
        ctx.textAlign = 'right'
        ctx.fillText('E', canvas.width - 4, canvas.height / 2 + 4)
    }
    
    /**
     * Set up world map keybind (M key)
     */
    setupWorldMapKeybind() {
        this.worldMapKeyHandler = (e) => {
            if (e.code === 'KeyM' && !document.activeElement.tagName.match(/INPUT|TEXTAREA/)) {
                this.toggleWorldMap()
            }
        }
        window.addEventListener('keydown', this.worldMapKeyHandler)
        logger.log('World map keybind (M) registered')
    }
    
    /**
     * Get chunk coordinates for a world position
     */
    getChunkCoords(x, z) {
        return {
            chunkX: Math.floor(x / this.chunkSize),
            chunkZ: Math.floor(z / this.chunkSize)
        }
    }
    
    /**
     * Get chunk key for caching
     */
    getChunkKey(chunkX, chunkZ) {
        return `${chunkX},${chunkZ}`
    }
    
    /**
     * Capture chunk image at given chunk coordinates
     */
    captureChunkImage(chunkX, chunkZ) {
        const bot = window.bot
        if (!bot || !bot.entity) return null
        
        const chunkKey = this.getChunkKey(chunkX, chunkZ)
        
        // Return cached if available
        if (this.chunkCache.has(chunkKey)) {
            return this.chunkCache.get(chunkKey)
        }
        
        // Check cache size limit and remove oldest chunks if needed
        if (this.chunkCache.size >= this.maxChunkCacheSize) {
            let oldestKey = null
            let oldestTime = Infinity
            
            for (const [key, chunk] of this.chunkCache.entries()) {
                if (chunk.timestamp < oldestTime) {
                    oldestTime = chunk.timestamp
                    oldestKey = key
                }
            }
            
            if (oldestKey) {
                this.chunkCache.delete(oldestKey)
                logger.log(`Removed old chunk from cache: ${oldestKey}`)
            }
        }
        
        // Create canvas for this chunk
        const chunkCanvas = document.createElement('canvas')
        chunkCanvas.width = 64
        chunkCanvas.height = 64
        const ctx = chunkCanvas.getContext('2d')
        
        // Render chunk terrain
        const startX = chunkX * this.chunkSize
        const startZ = chunkZ * this.chunkSize
        const pixelsPerBlock = chunkCanvas.width / this.chunkSize
        
        for (let localZ = 0; localZ < this.chunkSize; localZ++) {
            for (let localX = 0; localX < this.chunkSize; localX++) {
                const worldX = startX + localX
                const worldZ = startZ + localZ
                
                const color = this.getColorAt(bot, worldX, worldZ, bot.entity.position.y)
                
                if (color) {
                    ctx.fillStyle = color
                    ctx.fillRect(
                        localX * pixelsPerBlock, 
                        localZ * pixelsPerBlock, 
                        Math.ceil(pixelsPerBlock), 
                        Math.ceil(pixelsPerBlock)
                    )
                }
            }
        }
        
        // Cache the chunk image
        const chunkImage = {
            canvas: chunkCanvas,
            chunkX: chunkX,
            chunkZ: chunkZ,
            timestamp: Date.now()
        }
        
        this.chunkCache.set(chunkKey, chunkImage)
        logger.log(`Captured chunk: ${chunkKey}`)
        
        return chunkImage
    }
    
    /**
     * Capture chunks around player
     */
    captureNearbyChunks() {
        const bot = window.bot
        if (!bot || !bot.entity || !bot.entity.position) return
        
        const pos = bot.entity.position
        const { chunkX, chunkZ } = this.getChunkCoords(pos.x, pos.z)
        
        // Capture current chunk and adjacent chunks
        const captureRadius = 1
        for (let dz = -captureRadius; dz <= captureRadius; dz++) {
            for (let dx = -captureRadius; dx <= captureRadius; dx++) {
                this.captureChunkImage(chunkX + dx, chunkZ + dz)
            }
        }
    }
    
    /**
     * Create world map UI
     */
    createWorldMapUI() {
        const container = document.createElement('div')
        container.id = 'ac-worldmap-container'
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            z-index: 20000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        `
        
        const header = document.createElement('div')
        header.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            font-family: monospace;
            font-size: 20px;
            text-align: center;
        `
        header.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">World Map</div>
            <div style="font-size: 12px; color: #aaa;">Press M to close | Chunks: <span id="ac-worldmap-chunk-count">0</span></div>
        `
        container.appendChild(header)
        
        const canvas = document.createElement('canvas')
        canvas.id = 'ac-worldmap-canvas'
        canvas.style.cssText = `
            border: 2px solid rgba(255, 255, 255, 0.3);
            image-rendering: pixelated;
            max-width: 90vw;
            max-height: 80vh;
        `
        container.appendChild(canvas)
        
        document.body.appendChild(container)
        
        // Query elements after they're added to DOM
        return {
            container,
            canvas,
            ctx: canvas.getContext('2d'),
            chunkCountEl: document.getElementById('ac-worldmap-chunk-count')
        }
    }
    
    /**
     * Toggle world map
     */
    toggleWorldMap() {
        this.worldMapOpen = !this.worldMapOpen
        
        if (this.worldMapOpen) {
            this.openWorldMap()
        } else {
            this.closeWorldMap()
        }
    }
    
    /**
     * Open world map
     */
    openWorldMap() {
        logger.log('Opening world map...')
        
        // Create UI if it doesn't exist
        if (!this.worldMapUI) {
            this.worldMapUI = this.createWorldMapUI()
        } else {
            this.worldMapUI.container.style.display = 'flex'
        }
        
        // Render world map
        this.renderWorldMap()
    }
    
    /**
     * Close world map
     */
    closeWorldMap() {
        if (this.worldMapUI) {
            this.worldMapUI.container.style.display = 'none'
        }
    }
    
    /**
     * Render world map with all captured chunks
     */
    renderWorldMap() {
        if (!this.worldMapUI) return
        
        const { canvas, ctx, chunkCountEl } = this.worldMapUI
        const bot = window.bot
        
        if (this.chunkCache.size === 0) {
            logger.warn('No chunks captured yet')
            return
        }
        
        // Update chunk count
        chunkCountEl.textContent = this.chunkCache.size
        
        // Find bounds of all captured chunks
        let minChunkX = Infinity, maxChunkX = -Infinity
        let minChunkZ = Infinity, maxChunkZ = -Infinity
        
        for (const [key, chunk] of this.chunkCache.entries()) {
            minChunkX = Math.min(minChunkX, chunk.chunkX)
            maxChunkX = Math.max(maxChunkX, chunk.chunkX)
            minChunkZ = Math.min(minChunkZ, chunk.chunkZ)
            maxChunkZ = Math.max(maxChunkZ, chunk.chunkZ)
        }
        
        // Calculate canvas size
        const chunkWidth = maxChunkX - minChunkX + 1
        const chunkHeight = maxChunkZ - minChunkZ + 1
        const chunkPixelSize = 64
        
        canvas.width = chunkWidth * chunkPixelSize
        canvas.height = chunkHeight * chunkPixelSize
        
        // Clear canvas
        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Draw all chunks
        for (const [key, chunk] of this.chunkCache.entries()) {
            const screenX = (chunk.chunkX - minChunkX) * chunkPixelSize
            const screenZ = (chunk.chunkZ - minChunkZ) * chunkPixelSize
            
            ctx.drawImage(chunk.canvas, screenX, screenZ)
            
            // Draw chunk borders
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
            ctx.lineWidth = 1
            ctx.strokeRect(screenX, screenZ, chunkPixelSize, chunkPixelSize)
        }
        
        // Draw player position if available
        if (bot && bot.entity && bot.entity.position) {
            const pos = bot.entity.position
            const { chunkX, chunkZ } = this.getChunkCoords(pos.x, pos.z)
            
            // Local position within chunk
            const localX = pos.x - (chunkX * this.chunkSize)
            const localZ = pos.z - (chunkZ * this.chunkSize)
            
            // Screen position
            const screenX = ((chunkX - minChunkX) * chunkPixelSize) + (localX * chunkPixelSize / this.chunkSize)
            const screenZ = ((chunkZ - minChunkZ) * chunkPixelSize) + (localZ * chunkPixelSize / this.chunkSize)
            
            // Draw player marker
            ctx.fillStyle = '#ffffff'
            ctx.strokeStyle = '#000000'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(screenX, screenZ, 6, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
            
            // Draw player label
            ctx.font = 'bold 12px monospace'
            ctx.fillStyle = '#ffffff'
            ctx.textAlign = 'center'
            ctx.fillText('YOU', screenX, screenZ - 10)
        }
        
        logger.log(`Rendered world map: ${chunkWidth}x${chunkHeight} chunks`)
    }
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval)
            this.updateInterval = null
        }
        
        if (this.worldMapKeyHandler) {
            window.removeEventListener('keydown', this.worldMapKeyHandler)
            this.worldMapKeyHandler = null
        }
        
        if (this.ui?.container) {
            this.ui.container.remove()
        }
        
        if (this.worldMapUI?.container) {
            this.worldMapUI.container.remove()
            this.worldMapUI = null
        }
        
        this.clearCache()
        this.chunkCache.clear()
        logger.log('Minimap destroyed')
    }
}

// Global minimap instance
let minimap = null

/**
 * Initialize minimap
 */
export async function init(ctx) {
    logger.log('Minimap test initializing...')
    
    try {
        // Wait for bot to be ready
        await waitForBot()
        logger.log('Bot ready, creating minimap...')
        
        // Create minimap
        minimap = new Minimap()
        minimap.init()
        
        // Store in context for cleanup
        ctx.state.minimap = minimap
        
        // Also expose to window for debugging
        window.acMinimap = minimap
        
        logger.log('Minimap ready! Use window.acMinimap to access.')
        
    } catch (err) {
        logger.error('Minimap init failed:', err)
    }
}

/**
 * Cleanup minimap
 */
export function cleanup(ctx) {
    logger.log('Minimap cleaning up...')
    
    if (ctx.state.minimap) {
        ctx.state.minimap.destroy()
        ctx.state.minimap = null
    }
    
    if (window.acMinimap) {
        delete window.acMinimap
    }
}
