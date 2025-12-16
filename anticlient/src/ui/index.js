
import { categories, modules } from '../core/Module.js'

export const initUI = () => {
    // Cleanup existing
    const existingRoot = document.getElementById('anticlient-root')
    if (existingRoot) existingRoot.remove()
    const existingStyle = document.getElementById('anticlient-style')
    if (existingStyle) existingStyle.remove()

    const uiRoot = document.createElement('div')
    uiRoot.id = 'anticlient-root'
    uiRoot.style.position = 'fixed'
    uiRoot.style.top = '100px'
    uiRoot.style.left = '100px'
    uiRoot.style.zIndex = '10000'
    uiRoot.style.fontFamily = "'Consolas', 'Monaco', monospace"
    uiRoot.style.userSelect = 'none'
    uiRoot.style.display = 'none'

    const toggleUi = () => {
        const isOpening = uiRoot.style.display === 'none'
        uiRoot.style.display = isOpening ? 'block' : 'none'
        
        // Show/hide mouse cursor by managing activeModalStack
        if (window.activeModalStack && Array.isArray(window.activeModalStack)) {
            if (isOpening) {
                // Push a proper modal object with reactType property
                const modalObject = {
                    reactType: 'AnticlientMenu',
                    id: 'anticlient-menu'
                }
                window.activeModalStack.push(modalObject)
            } else {
                // Remove our modal from the stack - check if it's the last item
                const lastModal = window.activeModalStack[window.activeModalStack.length - 1]
                if (lastModal && lastModal.id === 'anticlient-menu') {
                    window.activeModalStack.pop()
                }
            }
        }
    }

    const keydownHandler = (e) => {
        if (e.code === 'ShiftRight' && !document.activeElement.tagName.match(/INPUT|TEXTAREA/)) {
            toggleUi()
        }
        if (!document.activeElement.tagName.match(/INPUT|TEXTAREA/)) {
            Object.values(modules).forEach(mod => {
                if (mod.bind && e.code === mod.bind && !mod.customKeybind) {
                    mod.toggle()
                }
            })
        }
    }
    window.addEventListener('keydown', keydownHandler)

    const style = document.createElement('style')
    style.id = 'anticlient-style'
    document.head.appendChild(style)

    const themes = {
        Default: `
            .ac-window {
                background-color: #0f0f13;
                border: 2px solid #7c4dff;
                border-radius: 8px;
                box-shadow: 0 0 15px rgba(124, 77, 255, 0.3);
                color: #e0e0e0;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                height: 500px;
                width: 650px;
                transition: width 0.3s ease;
                font-family: 'Consolas', 'Monaco', monospace;
            }
            .ac-window.expanded { width: 950px; }
            .ac-header {
                background-color: #1a1a20;
                padding: 10px 15px;
                border-bottom: 2px solid #7c4dff;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                flex-shrink: 0;
            }
            .ac-title { font-weight: bold; color: #b388ff; font-size: 1.1em; letter-spacing: 1px; }
            .ac-sidebar {
                width: 150px;
                background-color: #15151a;
                display: flex;
                flex-direction: column;
                border-right: 1px solid #333;
                flex-shrink: 0;
            }
            .ac-tab {
                text-align: left;
                padding: 15px 20px;
                cursor: pointer;
                background-color: transparent;
                transition: background-color 0.2s, color 0.2s;
                border-left: 3px solid transparent;
                color: #777;
                font-weight: 500;
            }
            .ac-tab:hover { background-color: #20202a; color: #fff; }
            .ac-tab.active { color: #b388ff; border-left: 3px solid #b388ff; background-color: #1e1e24; }
            .ac-module {
                background-color: #1a1a20;
                margin-bottom: 8px;
                padding: 10px;
                border-radius: 4px;
                display: flex;
                flex-direction: column;
                border-left: 3px solid #333;
                transition: border-left-color 0.2s;
            }
            .ac-module.enabled { border-left: 3px solid #00e676; }
            .ac-setting-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.9em; }
            .ac-input-number, .ac-input-text { background: #000; border: 1px solid #444; color: white; padding: 2px; border-radius: 2px; }
            .ac-checkbox { accent-color: #7c4dff; }
            .ac-preview-panel {
                background-color: #111;
                border-left: 1px solid #333;
            }
        `,
        Arwes: `
            .ac-window {
                background-color: rgba(0, 20, 20, 0.9);
                border: 1px solid #26dafd;
                box-shadow: 0 0 20px rgba(38, 218, 253, 0.2);
                color: #a9fdff;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                height: 500px;
                width: 650px;
                transition: width 0.3s ease;
                font-family: 'Titillium Web', sans-serif;
                clip-path: polygon(
                    0 0, 100% 0, 
                    100% calc(100% - 20px), calc(100% - 20px) 100%, 
                    0 100%
                );
            }
            .ac-window.expanded { width: 950px; }
            .ac-header {
                background-color: rgba(6, 61, 68, 0.6);
                padding: 10px 15px;
                border-bottom: 1px solid #26dafd;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                flex-shrink: 0;
                text-shadow: 0 0 5px rgba(38, 218, 253, 0.5);
            }
            .ac-title { font-weight: bold; color: #26dafd; font-size: 1.2em; letter-spacing: 2px; }
            .ac-sidebar {
                width: 150px;
                background-color: rgba(0, 10, 10, 0.5);
                display: flex;
                flex-direction: column;
                border-right: 1px solid #1b90a8;
                flex-shrink: 0;
            }
            .ac-tab {
                text-align: left;
                padding: 15px 20px;
                cursor: pointer;
                background-color: transparent;
                transition: all 0.2s;
                border-left: 2px solid transparent;
                color: #1b90a8;
                font-weight: 500;
                opacity: 0.7;
            }
            .ac-tab:hover { background-color: rgba(38, 218, 253, 0.1); color: #a9fdff; opacity: 1; text-shadow: 0 0 8px rgba(38, 218, 253, 0.6); }
            .ac-tab.active { color: #26dafd; border-left: 2px solid #26dafd; background-color: rgba(38, 218, 253, 0.15); opacity: 1; box-shadow: 0 0 10px rgba(38, 218, 253, 0.1) inset; }
            .ac-module {
                background-color: rgba(6, 61, 68, 0.3);
                margin-bottom: 8px;
                padding: 10px;
                border: 1px solid rgba(38, 218, 253, 0.3);
                display: flex;
                flex-direction: column;
                transition: all 0.2s;
            }
            .ac-module:hover { border-color: #26dafd; }
            .ac-module.enabled {
                border: 1px solid #26dafd;
                box-shadow: 0 0 10px rgba(38, 218, 253, 0.2) inset; 
                background-color: rgba(38, 218, 253, 0.1);
            }
            .ac-setting-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.9em; color: #a9fdff; }
            .ac-input-number, .ac-input-text { 
                background: rgba(0,0,0,0.5); 
                border: 1px solid #1b90a8; 
                color: #26dafd; 
                padding: 2px; 
                font-family: inherit;
            }
            .ac-checkbox { accent-color: #26dafd; }
            .ac-preview-panel {
                background-color: rgba(0,20,20,0.8);
                border-left: 1px solid #26dafd;
            }
        `
    }

    const applyTheme = (themeName) => {
        style.textContent = themes[themeName] || themes['Default']
        // Also inject common CSS
        style.textContent += `
            .ac-content { padding: 15px; flex: 1; overflow-y: auto; min-width: 0; }
            .ac-body { display: flex; flex: 1; overflow: hidden; }
            .ac-module-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
            .ac-module-name { font-weight: bold; flex: 1; }
            .ac-module-expand { 
                padding: 5px 10px; 
                font-size: 0.9em; 
                color: #888; 
                cursor: pointer; 
                transition: transform 0.2s, color 0.2s;
                user-select: none;
                -webkit-tap-highlight-color: transparent;
                min-width: 30px;
                min-height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .ac-module-expand:hover { color: #fff; }
            .ac-module-expand.open { transform: rotate(180deg); color: #b388ff; }
            .ac-module-settings { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); display: none; }
            .ac-module-settings.open { display: flex; flex-direction: column; gap: 8px; }
            .ac-preview-panel { width: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; flex-shrink: 0; }
            .ac-preview-title { margin-bottom: 10px; color: inherit; opacity: 0.7; font-size: 0.9em; }
            .ac-content::-webkit-scrollbar { width: 8px; }
            .ac-content::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
            .ac-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        `
    }

    // Default Theme
    applyTheme('Default')

    // Expose for updates
    if (!window.anticlient) window.anticlient = {}
    window.anticlient.ui = { setTheme: applyTheme }

    // DOM Construction
    const windowEl = document.createElement('div')
    windowEl.className = 'ac-window'
    uiRoot.appendChild(windowEl)

    const header = document.createElement('div')
    header.className = 'ac-header'
    header.innerHTML = '<span class="ac-title">ANTICLIENT</span> <span style="font-size: 0.8em; color: gray">v1.4</span>'
    windowEl.appendChild(header)

    const bodyEl = document.createElement('div')
    bodyEl.className = 'ac-body'
    windowEl.appendChild(bodyEl)

    const sidebar = document.createElement('div')
    sidebar.className = 'ac-sidebar'
    bodyEl.appendChild(sidebar)

    const contentContainer = document.createElement('div')
    contentContainer.className = 'ac-content'
    bodyEl.appendChild(contentContainer)

    const previewPanel = document.createElement('div')
    previewPanel.className = 'ac-preview-panel'
    previewPanel.style.display = 'none' // default hidden
    previewPanel.innerHTML = '<div class="ac-preview-title">VISUAL PREVIEW</div>'
    const canvas = document.createElement('canvas')
    canvas.width = 280
    canvas.height = 400
    canvas.style.display = 'block'
    previewPanel.appendChild(canvas)
    bodyEl.appendChild(previewPanel)

    document.body.appendChild(uiRoot)

    // Block Selector Modal
    const blockSelectorModal = document.createElement('div')
    blockSelectorModal.id = 'ac-block-selector-modal'
    blockSelectorModal.style.display = 'none'
    blockSelectorModal.style.position = 'fixed'
    blockSelectorModal.style.top = '0'
    blockSelectorModal.style.left = '0'
    blockSelectorModal.style.width = '100%'
    blockSelectorModal.style.height = '100%'
    blockSelectorModal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
    blockSelectorModal.style.zIndex = '20000'
    blockSelectorModal.style.display = 'none'
    blockSelectorModal.style.alignItems = 'center'
    blockSelectorModal.style.justifyContent = 'center'

    const blockSelectorContent = document.createElement('div')
    blockSelectorContent.style.backgroundColor = '#0f0f13'
    blockSelectorContent.style.border = '2px solid #7c4dff'
    blockSelectorContent.style.borderRadius = '8px'
    blockSelectorContent.style.padding = '20px'
    blockSelectorContent.style.maxWidth = '600px'
    blockSelectorContent.style.maxHeight = '80vh'
    blockSelectorContent.style.width = '90%'
    blockSelectorContent.style.display = 'flex'
    blockSelectorContent.style.flexDirection = 'column'
    blockSelectorContent.style.gap = '15px'

    const blockSelectorTitle = document.createElement('div')
    blockSelectorTitle.textContent = 'Select Blocks'
    blockSelectorTitle.style.fontSize = '1.2em'
    blockSelectorTitle.style.fontWeight = 'bold'
    blockSelectorTitle.style.color = '#7c4dff'
    blockSelectorTitle.style.textAlign = 'center'
    blockSelectorContent.appendChild(blockSelectorTitle)

    const blockSearchInput = document.createElement('input')
    blockSearchInput.type = 'text'
    blockSearchInput.placeholder = 'Search blocks...'
    blockSearchInput.style.padding = '8px'
    blockSearchInput.style.backgroundColor = '#1a1a20'
    blockSearchInput.style.color = '#e0e0e0'
    blockSearchInput.style.border = '1px solid #444'
    blockSearchInput.style.borderRadius = '4px'
    blockSearchInput.style.fontSize = '0.9em'
    blockSelectorContent.appendChild(blockSearchInput)

    const blockListContainer = document.createElement('div')
    blockListContainer.style.overflowY = 'auto'
    blockListContainer.style.maxHeight = '400px'
    blockListContainer.style.display = 'flex'
    blockListContainer.style.flexDirection = 'column'
    blockListContainer.style.gap = '5px'
    blockSelectorContent.appendChild(blockListContainer)

    const blockSelectorButtons = document.createElement('div')
    blockSelectorButtons.style.display = 'flex'
    blockSelectorButtons.style.gap = '10px'
    blockSelectorButtons.style.justifyContent = 'flex-end'

    const blockSelectorClose = document.createElement('button')
    blockSelectorClose.textContent = 'Close'
    blockSelectorClose.style.padding = '8px 16px'
    blockSelectorClose.style.backgroundColor = '#333'
    blockSelectorClose.style.color = 'white'
    blockSelectorClose.style.border = 'none'
    blockSelectorClose.style.borderRadius = '4px'
    blockSelectorClose.style.cursor = 'pointer'
    blockSelectorClose.onclick = () => {
        blockSelectorModal.style.display = 'none'
        // Re-render modules to update the block count
        renderModules()
    }
    blockSelectorButtons.appendChild(blockSelectorClose)

    blockSelectorContent.appendChild(blockSelectorButtons)
    blockSelectorModal.appendChild(blockSelectorContent)
    document.body.appendChild(blockSelectorModal)

    // Block selector state
    let currentBlockModule = null

    const openBlockSelector = (module) => {
        currentBlockModule = module
        blockSelectorModal.style.display = 'flex'
        blockSearchInput.value = ''
        renderBlockList()
    }

    const createBlockTextureCanvas = (blockName) => {
        try {
            // Try to get texture from resourcesManager
            const resourcesManager = window.resourcesManager || window.globalThis?.resourcesManager
            if (!resourcesManager?.currentResources?.blocksAtlasJson) {
                return null
            }

            const atlas = resourcesManager.currentResources.blocksAtlasJson
            const atlasImage = resourcesManager.currentResources.blocksAtlasImage

            if (!atlas || !atlasImage) return null

            // Try to find texture for this block
            const textureInfo = atlas.textures[blockName]
            if (!textureInfo) return null

            // Create canvas to draw the texture
            const canvas = document.createElement('canvas')
            const tileSize = atlas.tileSize || 16
            canvas.width = tileSize
            canvas.height = tileSize
            const ctx = canvas.getContext('2d')
            if (!ctx) return null

            // Calculate source coordinates
            const sx = textureInfo.u * atlasImage.width
            const sy = textureInfo.v * atlasImage.height
            const sw = (textureInfo.su || atlas.suSv) * atlasImage.width
            const sh = (textureInfo.sv || atlas.suSv) * atlasImage.height

            // Draw the texture from the atlas
            ctx.drawImage(atlasImage, sx, sy, sw, sh, 0, 0, tileSize, tileSize)

            return canvas
        } catch (err) {
            console.debug('Failed to get texture for block:', blockName, err)
            return null
        }
    }

    const renderBlockList = () => {
        blockListContainer.innerHTML = ''

        if (!window.bot || !window.bot.registry || !window.bot.registry.blocksByName) {
            const errorMsg = document.createElement('div')
            errorMsg.textContent = 'Please connect to a server first to load block data.'
            errorMsg.style.color = '#ff5555'
            errorMsg.style.textAlign = 'center'
            errorMsg.style.padding = '20px'
            blockListContainer.appendChild(errorMsg)
            return
        }

        const searchTerm = blockSearchInput.value.toLowerCase()
        const blockNames = Object.keys(window.bot.registry.blocksByName)
            .filter(name => name.includes(searchTerm))
            .sort()

        if (blockNames.length === 0) {
            const emptyMsg = document.createElement('div')
            emptyMsg.textContent = 'No blocks found.'
            emptyMsg.style.color = '#777'
            emptyMsg.style.textAlign = 'center'
            emptyMsg.style.padding = '20px'
            blockListContainer.appendChild(emptyMsg)
            return
        }

        blockNames.forEach(blockName => {
            const blockItem = document.createElement('div')
            blockItem.style.padding = '8px 12px'
            blockItem.style.backgroundColor = '#1a1a20'
            blockItem.style.borderRadius = '4px'
            blockItem.style.cursor = 'pointer'
            blockItem.style.display = 'flex'
            blockItem.style.alignItems = 'center'
            blockItem.style.gap = '10px'
            blockItem.style.transition = 'background-color 0.2s'

            const checkbox = document.createElement('input')
            checkbox.type = 'checkbox'
            checkbox.checked = currentBlockModule && currentBlockModule.settings.blocks.includes(blockName)
            checkbox.style.cursor = 'pointer'
            checkbox.onclick = (e) => {
                e.stopPropagation()
                toggleBlock(blockName, checkbox.checked)
            }

            // Create container for texture and label
            const contentContainer = document.createElement('div')
            contentContainer.style.display = 'flex'
            contentContainer.style.alignItems = 'center'
            contentContainer.style.gap = '10px'
            contentContainer.style.flex = '1'

            // Try to get block texture
            const textureCanvas = createBlockTextureCanvas(blockName)
            if (textureCanvas) {
                textureCanvas.style.width = '32px'
                textureCanvas.style.height = '32px'
                textureCanvas.style.imageRendering = 'pixelated'
                contentContainer.appendChild(textureCanvas)
            }

            const label = document.createElement('span')
            label.textContent = blockName
            label.style.color = '#e0e0e0'
            label.style.flex = '1'
            contentContainer.appendChild(label)

            blockItem.onclick = () => {
                checkbox.checked = !checkbox.checked
                toggleBlock(blockName, checkbox.checked)
            }

            blockItem.onmouseenter = () => {
                blockItem.style.backgroundColor = '#252530'
            }
            blockItem.onmouseleave = () => {
                blockItem.style.backgroundColor = '#1a1a20'
            }

            blockItem.appendChild(checkbox)
            blockItem.appendChild(contentContainer)
            blockListContainer.appendChild(blockItem)
        })
    }

    const toggleBlock = (blockName, isChecked) => {
        if (!currentBlockModule) return

        if (isChecked) {
            if (!currentBlockModule.settings.blocks.includes(blockName)) {
                currentBlockModule.settings.blocks.push(blockName)
            }
        } else {
            const index = currentBlockModule.settings.blocks.indexOf(blockName)
            if (index > -1) {
                currentBlockModule.settings.blocks.splice(index, 1)
            }
        }
    }

    blockSearchInput.oninput = () => {
        renderBlockList()
    }

    // State & Logic
    let activeTab = 'Movement' // Default

    // 3D Preview Setup
    let previewScene = null
    let previewCamera = null
    let previewRenderer = null
    let previewPlayerWrapper = null
    let previewPlayerObject = null
    let previewESPBox = null
    let previewStorageBox = null
    let previewAnimationId = null

    const init3DPreview = () => {
        if (!window.THREE) {
            console.warn('[Anticlient] THREE.js not available, falling back to 2D preview')
            return false
        }

        try {
            const THREE = window.THREE

            // Create scene
            previewScene = new THREE.Scene()
            previewScene.background = new THREE.Color(0x0f0f13)

            // Create camera
            previewCamera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.1, 100)
            previewCamera.position.set(0, 1.5, 3.5)
            previewCamera.lookAt(0, 1, 0)

            // Create renderer
            previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
            previewRenderer.setSize(canvas.width, canvas.height)
            previewRenderer.setPixelRatio(window.devicePixelRatio)

            // Add lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
            previewScene.add(ambientLight)
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
            directionalLight.position.set(5, 10, 5)
            previewScene.add(directionalLight)

            // Create player model using skinview3d if available
            if (window.skinview3d?.PlayerObject) {
                const PlayerObject = window.skinview3d.PlayerObject
                previewPlayerObject = new PlayerObject()
                previewPlayerObject.position.set(0, 16, 0)

                previewPlayerWrapper = new THREE.Group()
                previewPlayerWrapper.add(previewPlayerObject)
                const scale = 1 / 16
                previewPlayerWrapper.scale.set(scale, scale, scale)
                previewPlayerWrapper.rotation.set(0, Math.PI, 0)
                previewPlayerWrapper.position.set(0, 0, 0)

                previewScene.add(previewPlayerWrapper)
            } else {
                // Fallback: create a simple box to represent the player
                const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6)
                const material = new THREE.MeshStandardMaterial({ color: 0x888888 })
                const playerMesh = new THREE.Mesh(geometry, material)
                playerMesh.position.set(0, 0.9, 0)
                previewScene.add(playerMesh)
                previewPlayerWrapper = playerMesh
            }

            // Create ESP box (wireframe)
            const espGeometry = new THREE.BoxGeometry(0.6, 1.8, 0.6)
            const espEdges = new THREE.EdgesGeometry(espGeometry)
            const espMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 })
            previewESPBox = new THREE.LineSegments(espEdges, espMaterial)
            previewESPBox.position.set(0, 0.9, 0)
            previewESPBox.visible = false
            previewScene.add(previewESPBox)

            // Create storage box example
            const storageGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3)
            const storageEdges = new THREE.EdgesGeometry(storageGeometry)
            const storageMaterial = new THREE.LineBasicMaterial({ color: 0xffa500, linewidth: 2 })
            previewStorageBox = new THREE.LineSegments(storageEdges, storageMaterial)
            previewStorageBox.position.set(1.2, 0.15, 0)
            previewStorageBox.visible = false
            previewScene.add(previewStorageBox)

            return true
        } catch (err) {
            console.error('[Anticlient] Failed to initialize 3D preview:', err)
            return false
        }
    }

    const render3DPreview = () => {
        if (!previewRenderer || !previewScene || !previewCamera) return
        if (activeTab !== 'Render') return

        // Update ESP visibility and color
        const esp = modules['esp']
        if (esp && previewESPBox) {
            previewESPBox.visible = esp.enabled
            if (esp.enabled) {
                const color = esp.settings.playerColor || '#00ffff'
                previewESPBox.material.color.setStyle(color)
            }
        }

        // Update storage ESP visibility and color
        const storageEsp = modules['storageesp']
        if (storageEsp && previewStorageBox) {
            previewStorageBox.visible = storageEsp.enabled
            if (storageEsp.enabled) {
                const color = storageEsp.settings.color || '#FFA500'
                previewStorageBox.material.color.setStyle(color)
            }
        }

        // Rotate player slowly
        if (previewPlayerWrapper) {
            previewPlayerWrapper.rotation.y += 0.01
        }

        previewRenderer.render(previewScene, previewCamera)
    }

    const start3DPreview = () => {
        if (!previewRenderer) {
            if (!init3DPreview()) return
        }

        const animate = () => {
            if (activeTab !== 'Render') {
                previewAnimationId = null
                return
            }
            render3DPreview()
            previewAnimationId = requestAnimationFrame(animate)
        }
        animate()
    }

    const stop3DPreview = () => {
        if (previewAnimationId) {
            cancelAnimationFrame(previewAnimationId)
            previewAnimationId = null
        }
    }

    let previewInterval = null

    const updateLayout = () => {
        if (activeTab === 'Render') {
            windowEl.classList.add('expanded')
            previewPanel.style.display = 'flex'
            // Start 3D preview
            start3DPreview()
        } else {
            windowEl.classList.remove('expanded')
            previewPanel.style.display = 'none'
            // Stop 3D preview
            stop3DPreview()
        }
    }

    const renderModules = () => {
        contentContainer.innerHTML = ''

        // Special handling for Packets tab
        if (activeTab === 'Packets') {
            renderPackets()
            return
        }

        // Special handling for Scripting tab
        if (activeTab === 'Scripting') {
            renderScripting()
            return
        }

        const catMods = categories[activeTab] || []

        if (!catMods.length) {
            const emptyMsg = document.createElement('div')
            emptyMsg.textContent = 'No modules in this category.'
            emptyMsg.style.color = '#555'
            emptyMsg.style.textAlign = 'center'
            emptyMsg.style.marginTop = '20px'
            contentContainer.appendChild(emptyMsg)
            return
        }

        catMods.forEach(mod => {
            const modEl = document.createElement('div')
            modEl.className = 'ac-module' + (mod.enabled ? ' enabled' : '')
            mod.uiElement = modEl

            const header = document.createElement('div')
            header.className = 'ac-module-header'
            
            const moduleName = document.createElement('span')
            moduleName.className = 'ac-module-name'
            moduleName.textContent = mod.name
            moduleName.onclick = (e) => {
                e.stopPropagation()
                mod.toggle()
            }
            // Touch support for toggling
            moduleName.ontouchend = (e) => {
                e.preventDefault()
                e.stopPropagation()
                mod.toggle()
            }
            header.appendChild(moduleName)
            
            const expandBtn = document.createElement('span')
            expandBtn.className = 'ac-module-expand'
            expandBtn.innerHTML = '▼'
            expandBtn.onclick = (e) => {
                e.stopPropagation()
                const settingsEl = modEl.querySelector('.ac-module-settings')
                settingsEl.classList.toggle('open')
                expandBtn.classList.toggle('open')
            }
            // Touch support for expanding
            expandBtn.ontouchend = (e) => {
                e.preventDefault()
                e.stopPropagation()
                const settingsEl = modEl.querySelector('.ac-module-settings')
                settingsEl.classList.toggle('open')
                expandBtn.classList.toggle('open')
            }
            header.appendChild(expandBtn)
            
            // Keep right-click for desktop users
            header.oncontextmenu = (e) => {
                e.preventDefault()
                const settingsEl = modEl.querySelector('.ac-module-settings')
                settingsEl.classList.toggle('open')
                expandBtn.classList.toggle('open')
            }
            modEl.appendChild(header)

            const settingsDiv = document.createElement('div')
            settingsDiv.className = 'ac-module-settings'

            Object.keys(mod.settings).forEach(key => {
                const val = mod.settings[key]

                // Skip rendering 'enabled' setting - it's controlled by clicking the module header
                if (key === 'enabled') {
                    return
                }

                // Skip rendering blocks array directly - we'll add a button for it
                if (key === 'blocks' && Array.isArray(val)) {
                    return
                }

                const row = document.createElement('div')
                row.className = 'ac-setting-row'
                const label = document.createElement('span')
                label.textContent = key
                row.appendChild(label)

                // Check if this setting has dropdown metadata
                const metadata = mod.settingsMetadata?.[key]

                // Special handling for logLevel (dropdown)
                if (key === 'logLevel' && mod.id === 'loggersettings') {
                    const select = document.createElement('select')
                    select.style.background = '#1a1a20'
                    select.style.color = 'white'
                    select.style.border = '1px solid #444'
                    select.style.padding = '4px'
                    select.style.borderRadius = '4px'
                    select.style.cursor = 'pointer'

                    const levels = [
                        { value: 0, label: 'Debug' },
                        { value: 1, label: 'Info' },
                        { value: 2, label: 'Warning' },
                        { value: 3, label: 'Error' },
                        { value: 4, label: 'None' }
                    ]

                    levels.forEach(level => {
                        const option = document.createElement('option')
                        option.value = level.value
                        option.textContent = level.label
                        option.selected = val === level.value
                        select.appendChild(option)
                    })

                    select.onchange = (e) => {
                        mod.settings[key] = parseInt(e.target.value)
                    }

                    row.appendChild(select)
                } else if (metadata?.type === 'dropdown' && metadata.options) {
                    // Generic dropdown support
                    const select = document.createElement('select')
                    select.style.background = '#1a1a20'
                    select.style.color = 'white'
                    select.style.border = '1px solid #444'
                    select.style.padding = '4px'
                    select.style.borderRadius = '4px'
                    select.style.cursor = 'pointer'

                    metadata.options.forEach(option => {
                        const optionEl = document.createElement('option')
                        optionEl.value = option
                        optionEl.textContent = option
                        optionEl.selected = val === option
                        select.appendChild(optionEl)
                    })

                    select.onchange = (e) => {
                        mod.settings[key] = e.target.value
                    }

                    row.appendChild(select)
                } else if (typeof val === 'number') {
                    const input = document.createElement('input')
                    input.type = 'number'
                    input.className = 'ac-input-number'
                    input.value = val
                    input.step = 0.1
                    input.onchange = (e) => mod.settings[key] = parseFloat(e.target.value)
                    row.appendChild(input)
                } else if (typeof val === 'boolean') {
                    const input = document.createElement('input')
                    input.type = 'checkbox'
                    input.className = 'ac-checkbox'
                    input.checked = val
                    input.onchange = (e) => mod.settings[key] = e.target.checked
                    row.appendChild(input)
                } else if (typeof val === 'string' && val.startsWith('#')) {
                    const input = document.createElement('input')
                    input.type = 'color'
                    input.style.background = 'none'
                    input.style.border = 'none'
                    input.style.width = '30px'
                    input.style.height = '30px'
                    input.value = val
                    input.onchange = (e) => mod.settings[key] = e.target.value
                    row.appendChild(input)
                } else {
                    const input = document.createElement('input')
                    input.value = val
                    input.style.background = 'black'
                    input.style.color = 'white'
                    input.style.border = '1px solid #444'
                    input.onchange = (e) => mod.settings[key] = e.target.value
                    row.appendChild(input)
                }
                settingsDiv.appendChild(row)
            })

            // Add "Config Blocks" button if module has blocks setting
            if (mod.settings.blocks && Array.isArray(mod.settings.blocks)) {
                const blocksRow = document.createElement('div')
                blocksRow.className = 'ac-setting-row'
                const blocksLabel = document.createElement('span')
                blocksLabel.textContent = 'blocks'
                blocksRow.appendChild(blocksLabel)

                const configBtn = document.createElement('button')
                configBtn.textContent = `Config Blocks (${mod.settings.blocks.length})`
                configBtn.style.background = '#7c4dff'
                configBtn.style.color = 'white'
                configBtn.style.border = 'none'
                configBtn.style.cursor = 'pointer'
                configBtn.style.padding = '4px 12px'
                configBtn.style.borderRadius = '4px'
                configBtn.style.fontSize = '0.85em'
                configBtn.onclick = () => {
                    openBlockSelector(mod)
                }
                blocksRow.appendChild(configBtn)
                settingsDiv.appendChild(blocksRow)
            }

            // Special handling for Settings module: Add Update and Unload buttons, skip Bind
            if (mod.id === 'client_settings') {
                // Update button
                if (mod.actions && mod.actions.update) {
                    const updateRow = document.createElement('div')
                    updateRow.className = 'ac-setting-row'
                    const updateLabel = document.createElement('span')
                    updateLabel.textContent = 'Update'
                    updateRow.appendChild(updateLabel)
                    const updateBtn = document.createElement('button')
                    updateBtn.style.background = '#333'
                    updateBtn.style.color = 'white'
                    updateBtn.style.border = '1px solid #444'
                    updateBtn.style.cursor = 'pointer'
                    updateBtn.style.padding = '4px 12px'
                    updateBtn.textContent = 'Update'
                    updateBtn.onclick = async () => {
                        updateBtn.disabled = true
                        updateBtn.textContent = 'Updating...'
                        try {
                            await mod.actions.update()
                        } catch (error) {
                            console.error('Update failed:', error)
                        } finally {
                            updateBtn.disabled = false
                            updateBtn.textContent = 'Update'
                        }
                    }
                    updateRow.appendChild(updateBtn)
                    settingsDiv.appendChild(updateRow)
                }

                // Unload button
                if (mod.actions && mod.actions.unload) {
                    const unloadRow = document.createElement('div')
                    unloadRow.className = 'ac-setting-row'
                    const unloadLabel = document.createElement('span')
                    unloadLabel.textContent = 'Unload'
                    unloadRow.appendChild(unloadLabel)
                    const unloadBtn = document.createElement('button')
                    unloadBtn.style.background = '#333'
                    unloadBtn.style.color = 'white'
                    unloadBtn.style.border = '1px solid #444'
                    unloadBtn.style.cursor = 'pointer'
                    unloadBtn.style.padding = '4px 12px'
                    unloadBtn.textContent = 'Unload'
                    unloadBtn.onclick = async () => {
                        unloadBtn.disabled = true
                        unloadBtn.textContent = 'Unloading...'
                        try {
                            await mod.actions.unload()
                        } catch (error) {
                            console.error('Unload failed:', error)
                            unloadBtn.disabled = false
                            unloadBtn.textContent = 'Unload'
                        }
                    }
                    unloadRow.appendChild(unloadBtn)
                    settingsDiv.appendChild(unloadRow)
                }
            } else {
                // Bind Button (for non-Settings modules)
                const bindRow = document.createElement('div')
                bindRow.className = 'ac-setting-row'
                const bindLabel = document.createElement('span')
                bindLabel.textContent = 'Bind'
                bindRow.appendChild(bindLabel)

                const bindBtn = document.createElement('button')
                bindBtn.style.background = '#333'
                bindBtn.style.color = 'white'
                bindBtn.style.border = '1px solid #444'
                bindBtn.style.cursor = 'pointer'
                bindBtn.textContent = mod.bind || 'None'
                bindBtn.onclick = () => {
                    bindBtn.textContent = 'Press Key...'
                    const handler = (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (e.code === 'Escape') {
                            mod.bind = null
                            bindBtn.textContent = 'None'
                        } else {
                            mod.bind = e.code
                            bindBtn.textContent = e.code
                        }
                        window.removeEventListener('keydown', handler, { capture: true })
                    }
                    window.addEventListener('keydown', handler, { capture: true })
                }
                bindRow.appendChild(bindBtn)
                settingsDiv.appendChild(bindRow)
            }

            modEl.appendChild(settingsDiv)
            contentContainer.appendChild(modEl)
        })
    }

    const renderScripting = () => {
        contentContainer.style.padding = '15px'

        // Title
        const title = document.createElement('div')
        title.textContent = 'Scripting & Custom Packets'
        title.style.fontSize = '1.2em'
        title.style.fontWeight = 'bold'
        title.style.color = '#b388ff'
        title.style.marginBottom = '15px'
        contentContainer.appendChild(title)

        // Tabs for Script Editor and Packet Sender
        const tabsContainer = document.createElement('div')
        tabsContainer.style.display = 'flex'
        tabsContainer.style.gap = '10px'
        tabsContainer.style.marginBottom = '15px'
        tabsContainer.style.borderBottom = '1px solid #333'

        let activeScriptTab = 'editor'

        const editorTab = document.createElement('div')
        editorTab.textContent = 'Script Editor'
        editorTab.style.padding = '8px 16px'
        editorTab.style.cursor = 'pointer'
        editorTab.style.borderBottom = '2px solid #b388ff'
        editorTab.style.color = '#b388ff'

        const packetTab = document.createElement('div')
        packetTab.textContent = 'Packet Sender'
        packetTab.style.padding = '8px 16px'
        packetTab.style.cursor = 'pointer'
        packetTab.style.borderBottom = '2px solid transparent'
        packetTab.style.color = '#777'

        const switchTab = (tab) => {
            activeScriptTab = tab
            if (tab === 'editor') {
                editorTab.style.borderBottom = '2px solid #b388ff'
                editorTab.style.color = '#b388ff'
                packetTab.style.borderBottom = '2px solid transparent'
                packetTab.style.color = '#777'
                editorSection.style.display = 'block'
                packetSection.style.display = 'none'
            } else {
                editorTab.style.borderBottom = '2px solid transparent'
                editorTab.style.color = '#777'
                packetTab.style.borderBottom = '2px solid #b388ff'
                packetTab.style.color = '#b388ff'
                editorSection.style.display = 'none'
                packetSection.style.display = 'block'
            }
        }

        editorTab.onclick = () => switchTab('editor')
        packetTab.onclick = () => switchTab('packet')

        tabsContainer.appendChild(editorTab)
        tabsContainer.appendChild(packetTab)
        contentContainer.appendChild(tabsContainer)

        // Script Editor Section
        const editorSection = document.createElement('div')

        const editorLabel = document.createElement('div')
        editorLabel.textContent = 'JavaScript Code (has access to window.bot):'
        editorLabel.style.color = '#e0e0e0'
        editorLabel.style.marginBottom = '8px'
        editorSection.appendChild(editorLabel)

        const codeEditor = document.createElement('textarea')
        codeEditor.style.width = '100%'
        codeEditor.style.height = '250px'
        codeEditor.style.background = '#000'
        codeEditor.style.color = '#0f0'
        codeEditor.style.border = '1px solid #444'
        codeEditor.style.padding = '10px'
        codeEditor.style.fontFamily = "'Consolas', 'Monaco', monospace"
        codeEditor.style.fontSize = '12px'
        codeEditor.style.resize = 'vertical'
        codeEditor.style.borderRadius = '4px'
        codeEditor.placeholder = '// Example:\n// bot.chat("Hello from script!")\n// console.log(bot.entity.position)'
        codeEditor.value = localStorage.getItem('anticlient_script') || ''
        codeEditor.oninput = () => {
            localStorage.setItem('anticlient_script', codeEditor.value)
        }
        editorSection.appendChild(codeEditor)

        const editorButtons = document.createElement('div')
        editorButtons.style.display = 'flex'
        editorButtons.style.gap = '10px'
        editorButtons.style.marginTop = '10px'

        const runBtn = document.createElement('button')
        runBtn.textContent = 'Run Script'
        runBtn.style.padding = '8px 16px'
        runBtn.style.background = '#2e7d32'
        runBtn.style.color = 'white'
        runBtn.style.border = 'none'
        runBtn.style.cursor = 'pointer'
        runBtn.style.borderRadius = '4px'
        runBtn.style.fontWeight = 'bold'
        runBtn.onclick = () => {
            try {
                // Use Function constructor instead of eval to avoid bundler issues
                // This creates a function with access to global scope
                const fn = new Function('bot', 'window', codeEditor.value)
                const result = fn(window.bot, window)
                console.log('Script result:', result)
                alert('Script executed successfully! Check console for output.')
            } catch (err) {
                console.error('Script error:', err)
                alert('Script error: ' + err.message)
            }
        }
        editorButtons.appendChild(runBtn)

        const clearBtn = document.createElement('button')
        clearBtn.textContent = 'Clear'
        clearBtn.style.padding = '8px 16px'
        clearBtn.style.background = '#333'
        clearBtn.style.color = 'white'
        clearBtn.style.border = 'none'
        clearBtn.style.cursor = 'pointer'
        clearBtn.style.borderRadius = '4px'
        clearBtn.onclick = () => {
            codeEditor.value = ''
            localStorage.removeItem('anticlient_script')
        }
        editorButtons.appendChild(clearBtn)

        const apiBtn = document.createElement('button')
        apiBtn.textContent = 'API Docs'
        apiBtn.style.padding = '8px 16px'
        apiBtn.style.background = '#1976d2'
        apiBtn.style.color = 'white'
        apiBtn.style.border = 'none'
        apiBtn.style.cursor = 'pointer'
        apiBtn.style.borderRadius = '4px'
        apiBtn.onclick = () => {
            window.open('https://github.com/PrismarineJS/mineflayer/blob/master/docs/api.md', '_blank')
        }
        editorButtons.appendChild(apiBtn)

        editorSection.appendChild(editorButtons)
        contentContainer.appendChild(editorSection)

        // Packet Sender Section
        const packetSection = document.createElement('div')
        packetSection.style.display = 'none'

        const packetLabel = document.createElement('div')
        packetLabel.textContent = 'Packet Name:'
        packetLabel.style.color = '#e0e0e0'
        packetLabel.style.marginBottom = '8px'
        packetSection.appendChild(packetLabel)

        const packetNameInput = document.createElement('input')
        packetNameInput.type = 'text'
        packetNameInput.placeholder = 'e.g., chat, position, arm_animation'
        packetNameInput.style.width = '100%'
        packetNameInput.style.background = '#000'
        packetNameInput.style.color = 'white'
        packetNameInput.style.border = '1px solid #444'
        packetNameInput.style.padding = '8px'
        packetNameInput.style.borderRadius = '4px'
        packetNameInput.style.marginBottom = '15px'
        packetNameInput.style.fontFamily = "'Consolas', 'Monaco', monospace"
        packetSection.appendChild(packetNameInput)

        const dataLabel = document.createElement('div')
        dataLabel.textContent = 'Packet Data (JSON):'
        dataLabel.style.color = '#e0e0e0'
        dataLabel.style.marginBottom = '8px'
        packetSection.appendChild(dataLabel)

        const packetDataInput = document.createElement('textarea')
        packetDataInput.style.width = '100%'
        packetDataInput.style.height = '200px'
        packetDataInput.style.background = '#000'
        packetDataInput.style.color = '#0f0'
        packetDataInput.style.border = '1px solid #444'
        packetDataInput.style.padding = '10px'
        packetDataInput.style.fontFamily = "'Consolas', 'Monaco', monospace"
        packetDataInput.style.fontSize = '12px'
        packetDataInput.style.resize = 'vertical'
        packetDataInput.style.borderRadius = '4px'
        packetDataInput.placeholder = '{\n  "message": "Hello World"\n}'
        packetDataInput.value = localStorage.getItem('anticlient_packet_data') || ''
        packetDataInput.oninput = () => {
            localStorage.setItem('anticlient_packet_data', packetDataInput.value)
        }
        packetSection.appendChild(packetDataInput)

        const packetButtons = document.createElement('div')
        packetButtons.style.display = 'flex'
        packetButtons.style.gap = '10px'
        packetButtons.style.marginTop = '10px'

        const sendBtn = document.createElement('button')
        sendBtn.textContent = 'Send Packet'
        sendBtn.style.padding = '8px 16px'
        sendBtn.style.background = '#1976d2'
        sendBtn.style.color = 'white'
        sendBtn.style.border = 'none'
        sendBtn.style.cursor = 'pointer'
        sendBtn.style.borderRadius = '4px'
        sendBtn.style.fontWeight = 'bold'
        sendBtn.onclick = () => {
            if (!window.bot || !window.bot._client) {
                alert('Bot not connected!')
                return
            }

            const packetName = packetNameInput.value.trim()
            if (!packetName) {
                alert('Please enter a packet name!')
                return
            }

            try {
                const packetData = packetDataInput.value.trim() ? JSON.parse(packetDataInput.value) : {}
                window.bot._client.write(packetName, packetData)
                console.log('Sent packet:', packetName, packetData)
                alert('Packet sent successfully!')
            } catch (err) {
                console.error('Packet send error:', err)
                alert('Error: ' + err.message)
            }
        }
        packetButtons.appendChild(sendBtn)

        const clearPacketBtn = document.createElement('button')
        clearPacketBtn.textContent = 'Clear'
        clearPacketBtn.style.padding = '8px 16px'
        clearPacketBtn.style.background = '#333'
        clearPacketBtn.style.color = 'white'
        clearPacketBtn.style.border = 'none'
        clearPacketBtn.style.cursor = 'pointer'
        clearPacketBtn.style.borderRadius = '4px'
        clearPacketBtn.onclick = () => {
            packetNameInput.value = ''
            packetDataInput.value = ''
            localStorage.removeItem('anticlient_packet_data')
        }
        packetButtons.appendChild(clearPacketBtn)

        // Common packet templates button
        const templatesBtn = document.createElement('button')
        templatesBtn.textContent = 'Templates'
        templatesBtn.style.padding = '8px 16px'
        templatesBtn.style.background = '#7c4dff'
        templatesBtn.style.color = 'white'
        templatesBtn.style.border = 'none'
        templatesBtn.style.cursor = 'pointer'
        templatesBtn.style.borderRadius = '4px'
        templatesBtn.onclick = () => {
            const templates = {
                'chat': '{\n  "message": "Hello World"\n}',
                'position': '{\n  "x": 0,\n  "y": 64,\n  "z": 0,\n  "onGround": true\n}',
                'arm_animation': '{}',
                'entity_action': '{\n  "entityId": 0,\n  "actionId": 0,\n  "jumpBoost": 0\n}'
            }

            const templateName = prompt('Choose template:\n- chat\n- position\n- arm_animation\n- entity_action')
            if (templateName && templates[templateName]) {
                packetNameInput.value = templateName
                packetDataInput.value = templates[templateName]
            }
        }
        packetButtons.appendChild(templatesBtn)

        packetSection.appendChild(packetButtons)
        contentContainer.appendChild(packetSection)
    }

    const renderPackets = () => {
        // Clear container first to avoid duplicates
        contentContainer.innerHTML = ''

        // --- Fake Lag Module ---
        const fakeLag = modules['fakelag']
        if (fakeLag) {
            const fakeLagSection = document.createElement('div')
            fakeLagSection.style.marginBottom = '15px'
            fakeLagSection.style.padding = '12px'
            fakeLagSection.style.backgroundColor = '#1a1a20'
            fakeLagSection.style.borderRadius = '6px'
            fakeLagSection.style.border = '1px solid #333'

            // Track collapsed state
            let isCollapsed = localStorage.getItem('fakeLagCollapsed') === 'true'

            const fakeLagHeader = document.createElement('div')
            fakeLagHeader.style.display = 'flex'
            fakeLagHeader.style.justifyContent = 'space-between'
            fakeLagHeader.style.alignItems = 'center'
            fakeLagHeader.style.marginBottom = '10px'
            fakeLagHeader.style.cursor = 'pointer'
            fakeLagHeader.style.userSelect = 'none'

            const titleContainer = document.createElement('div')
            titleContainer.style.display = 'flex'
            titleContainer.style.alignItems = 'center'
            titleContainer.style.gap = '8px'

            const collapseIcon = document.createElement('span')
            collapseIcon.textContent = isCollapsed ? '▶' : '▼'
            collapseIcon.style.color = '#888'
            collapseIcon.style.fontSize = '12px'
            collapseIcon.style.transition = 'transform 0.2s'
            titleContainer.appendChild(collapseIcon)

            const fakeLagTitle = document.createElement('h3')
            fakeLagTitle.textContent = '🌐 Fake Lag / Packet Delay'
            fakeLagTitle.style.margin = '0'
            fakeLagTitle.style.color = '#00ffff'
            fakeLagTitle.style.fontSize = '16px'
            titleContainer.appendChild(fakeLagTitle)
            fakeLagHeader.appendChild(titleContainer)

            const fakeLagToggle = document.createElement('button')
            fakeLagToggle.textContent = fakeLag.enabled ? 'Disable' : 'Enable'
            fakeLagToggle.style.padding = '6px 16px'
            fakeLagToggle.style.background = fakeLag.enabled ? '#d32f2f' : '#2e7d32'
            fakeLagToggle.style.color = 'white'
            fakeLagToggle.style.border = 'none'
            fakeLagToggle.style.cursor = 'pointer'
            fakeLagToggle.style.borderRadius = '4px'
            fakeLagToggle.style.fontWeight = 'bold'
            fakeLagToggle.onclick = () => {
                fakeLag.toggle()
                fakeLagToggle.textContent = fakeLag.enabled ? 'Disable' : 'Enable'
                fakeLagToggle.style.background = fakeLag.enabled ? '#d32f2f' : '#2e7d32'
            }
            fakeLagHeader.appendChild(fakeLagToggle)
            fakeLagSection.appendChild(fakeLagHeader)

            // Content container (collapsible)
            const contentDiv = document.createElement('div')
            contentDiv.style.overflow = 'hidden'
            contentDiv.style.transition = 'max-height 0.3s ease-out, opacity 0.3s ease-out'
            contentDiv.style.opacity = isCollapsed ? '0' : '1'
            contentDiv.style.maxHeight = isCollapsed ? '0px' : '1000px'

            // Collapse toggle handler
            fakeLagHeader.onclick = (e) => {
                // Don't collapse when clicking the enable/disable button
                if (e.target === fakeLagToggle) return

                isCollapsed = !isCollapsed
                localStorage.setItem('fakeLagCollapsed', isCollapsed)

                collapseIcon.textContent = isCollapsed ? '▶' : '▼'
                contentDiv.style.maxHeight = isCollapsed ? '0px' : '1000px'
                contentDiv.style.opacity = isCollapsed ? '0' : '1'
            }

            // Settings grid
            const settingsGrid = document.createElement('div')
            settingsGrid.style.display = 'grid'
            settingsGrid.style.gridTemplateColumns = '1fr 1fr'
            settingsGrid.style.gap = '10px'

            // Helper to create setting row
            const createSetting = (label, type, key, options = {}) => {
                const row = document.createElement('div')
                row.style.display = 'flex'
                row.style.flexDirection = 'column'
                row.style.gap = '4px'

                const labelEl = document.createElement('label')
                labelEl.textContent = label
                labelEl.style.color = '#aaa'
                labelEl.style.fontSize = '12px'
                row.appendChild(labelEl)

                if (type === 'number') {
                    const input = document.createElement('input')
                    input.type = 'number'
                    input.value = fakeLag.settings[key]
                    input.min = options.min || 0
                    input.max = options.max || 10000
                    input.style.background = '#000'
                    input.style.color = 'white'
                    input.style.border = '1px solid #444'
                    input.style.padding = '6px'
                    input.style.borderRadius = '4px'
                    input.oninput = (e) => {
                        fakeLag.settings[key] = parseInt(e.target.value) || 0
                    }
                    row.appendChild(input)
                } else if (type === 'checkbox') {
                    const checkbox = document.createElement('input')
                    checkbox.type = 'checkbox'
                    checkbox.checked = fakeLag.settings[key]
                    checkbox.style.width = '20px'
                    checkbox.style.height = '20px'
                    checkbox.style.cursor = 'pointer'
                    checkbox.onchange = (e) => {
                        fakeLag.settings[key] = e.target.checked
                    }
                    row.appendChild(checkbox)
                } else if (type === 'text') {
                    const input = document.createElement('input')
                    input.type = 'text'
                    input.value = fakeLag.settings[key]
                    input.placeholder = options.placeholder || ''
                    input.style.background = '#000'
                    input.style.color = 'white'
                    input.style.border = '1px solid #444'
                    input.style.padding = '6px'
                    input.style.borderRadius = '4px'
                    input.oninput = (e) => {
                        fakeLag.settings[key] = e.target.value
                    }
                    row.appendChild(input)
                }

                return row
            }

            settingsGrid.appendChild(createSetting('Outgoing Delay (ms)', 'number', 'outgoingDelay', { max: 5000 }))
            settingsGrid.appendChild(createSetting('Incoming Delay (ms)', 'number', 'incomingDelay', { max: 5000 }))
            settingsGrid.appendChild(createSetting('Delay Outgoing', 'checkbox', 'delayOutgoing'))
            settingsGrid.appendChild(createSetting('Delay Incoming', 'checkbox', 'delayIncoming'))
            settingsGrid.appendChild(createSetting('Random Jitter (ms)', 'number', 'randomJitter', { max: 500 }))
            settingsGrid.appendChild(createSetting('Burst Interval (ms)', 'number', 'burstInterval', { max: 10000 }))
            settingsGrid.appendChild(createSetting('Burst Mode', 'checkbox', 'burstMode'))
            settingsGrid.appendChild(createSetting('Show on HUD', 'checkbox', 'onHUD'))

            const filterRow = createSetting('Packet Filter (comma separated)', 'text', 'packetFilter', { placeholder: 'position,look,chat' })
            filterRow.style.gridColumn = '1 / -1'
            settingsGrid.appendChild(filterRow)

            contentDiv.appendChild(settingsGrid)

            // Burst Mode Status Display
            if (fakeLag.settings.burstMode && fakeLag.enabled) {
                const burstStatus = document.createElement('div')
                burstStatus.id = 'burst-status'
                burstStatus.style.marginTop = '12px'
                burstStatus.style.padding = '10px'
                burstStatus.style.backgroundColor = '#0a0a0f'
                burstStatus.style.borderRadius = '4px'
                burstStatus.style.border = '1px solid #444'
                burstStatus.style.display = 'grid'
                burstStatus.style.gridTemplateColumns = '1fr 1fr'
                burstStatus.style.gap = '8px'
                burstStatus.style.fontSize = '13px'

                const createStatusItem = (label, value, color = '#00ff00') => {
                    const item = document.createElement('div')
                    item.style.display = 'flex'
                    item.style.flexDirection = 'column'
                    item.style.gap = '2px'

                    const labelEl = document.createElement('span')
                    labelEl.textContent = label
                    labelEl.style.color = '#888'
                    labelEl.style.fontSize = '11px'
                    item.appendChild(labelEl)

                    const valueEl = document.createElement('span')
                    valueEl.textContent = value
                    valueEl.style.color = color
                    valueEl.style.fontWeight = 'bold'
                    valueEl.style.fontSize = '16px'
                    valueEl.className = 'burst-value'
                    item.appendChild(valueEl)

                    return item
                }

                burstStatus.appendChild(createStatusItem('Next Burst In', '0ms', '#ffaa00'))
                burstStatus.appendChild(createStatusItem('Queue Size', '0', '#00ffff'))
                burstStatus.appendChild(createStatusItem('Outgoing Queue', '0', '#00ff00'))
                burstStatus.appendChild(createStatusItem('Incoming Queue', '0', '#ff00ff'))

                contentDiv.appendChild(burstStatus)

                // Update burst status every 50ms
                const updateBurstStatus = () => {
                    if (!fakeLag.enabled || !fakeLag.settings.burstMode) {
                        const existingStatus = document.getElementById('burst-status')
                        if (existingStatus) existingStatus.remove()
                        return
                    }

                    const queueInfo = fakeLag.getQueueInfo()
                    const values = burstStatus.querySelectorAll('.burst-value')

                    if (values[0]) values[0].textContent = `${Math.round(queueInfo.nextBurstIn)}ms`
                    if (values[1]) values[1].textContent = queueInfo.totalCount
                    if (values[2]) values[2].textContent = queueInfo.outgoingCount
                    if (values[3]) values[3].textContent = queueInfo.incomingCount

                    // Color coding for countdown
                    if (values[0]) {
                        const timeLeft = queueInfo.nextBurstIn
                        const interval = queueInfo.burstInterval
                        const percentage = timeLeft / interval

                        if (percentage < 0.2) values[0].style.color = '#ff0000'
                        else if (percentage < 0.5) values[0].style.color = '#ffaa00'
                        else values[0].style.color = '#00ff00'
                    }

                    setTimeout(updateBurstStatus, 50)
                }
                updateBurstStatus()
            }

            // Add content div to section
            fakeLagSection.appendChild(contentDiv)
            contentContainer.appendChild(fakeLagSection)
        }

        // --- Packet Viewer ---
        const packetViewer = modules['packetviewer']
        if (!packetViewer) {
            const emptyMsg = document.createElement('div')
            emptyMsg.textContent = 'Packet Viewer module not found.'
            emptyMsg.style.color = '#555'
            emptyMsg.style.textAlign = 'center'
            emptyMsg.style.marginTop = '20px'
            contentContainer.appendChild(emptyMsg)
            return
        }

        // Packet Viewer Controls
        const controlsDiv = document.createElement('div')
        controlsDiv.style.marginBottom = '10px'
        controlsDiv.style.padding = '10px'
        controlsDiv.style.backgroundColor = '#1a1a20'
        controlsDiv.style.borderRadius = '4px'
        controlsDiv.style.display = 'flex'
        controlsDiv.style.gap = '10px'
        controlsDiv.style.alignItems = 'center'
        controlsDiv.style.flexWrap = 'wrap'

        // Enable/Disable toggle
        const toggleBtn = document.createElement('button')
        toggleBtn.textContent = packetViewer.enabled ? 'Disable' : 'Enable'
        toggleBtn.style.padding = '4px 12px'
        toggleBtn.style.background = packetViewer.enabled ? '#d32f2f' : '#2e7d32'
        toggleBtn.style.color = 'white'
        toggleBtn.style.border = 'none'
        toggleBtn.style.cursor = 'pointer'
        toggleBtn.style.borderRadius = '2px'
        toggleBtn.onclick = () => {
            packetViewer.toggle()
            toggleBtn.textContent = packetViewer.enabled ? 'Disable' : 'Enable'
            toggleBtn.style.background = packetViewer.enabled ? '#d32f2f' : '#2e7d32'
        }
        controlsDiv.appendChild(toggleBtn)

        // Filter input
        const filterLabel = document.createElement('span')
        filterLabel.textContent = 'Filter:'
        filterLabel.style.color = '#e0e0e0'
        controlsDiv.appendChild(filterLabel)

        const filterInput = document.createElement('input')
        filterInput.type = 'text'
        filterInput.placeholder = 'Packet name...'
        filterInput.value = packetViewer.settings.filter || ''
        filterInput.style.background = '#000'
        filterInput.style.color = 'white'
        filterInput.style.border = '1px solid #444'
        filterInput.style.padding = '4px 8px'
        filterInput.style.borderRadius = '2px'
        filterInput.style.width = '150px'
        filterInput.oninput = (e) => {
            packetViewer.settings.filter = e.target.value
        }
        controlsDiv.appendChild(filterInput)

        // Direction selector
        const directionLabel = document.createElement('span')
        directionLabel.textContent = 'Direction:'
        directionLabel.style.color = '#e0e0e0'
        controlsDiv.appendChild(directionLabel)

        const directionSelect = document.createElement('select')
        directionSelect.style.background = '#000'
        directionSelect.style.color = 'white'
        directionSelect.style.border = '1px solid #444'
        directionSelect.style.padding = '4px 8px'
        directionSelect.style.borderRadius = '2px'
        directionSelect.innerHTML = '<option value="both">Both</option><option value="incoming">Incoming</option><option value="outgoing">Outgoing</option>'
        directionSelect.value = packetViewer.settings.direction || 'both'
        directionSelect.onchange = (e) => {
            packetViewer.settings.direction = e.target.value
        }
        controlsDiv.appendChild(directionSelect)

        // Clear button
        const clearBtn = document.createElement('button')
        clearBtn.textContent = 'Clear'
        clearBtn.style.padding = '4px 12px'
        clearBtn.style.background = '#333'
        clearBtn.style.color = 'white'
        clearBtn.style.border = '1px solid #444'
        clearBtn.style.cursor = 'pointer'
        clearBtn.style.borderRadius = '2px'
        clearBtn.onclick = () => {
            packetViewer.packets = []
            renderPackets()
        }
        controlsDiv.appendChild(clearBtn)

        contentContainer.appendChild(controlsDiv)

        // Packet list
        const packetList = document.createElement('div')
        packetList.style.maxHeight = '400px'
        packetList.style.overflowY = 'auto'
        packetList.style.display = 'flex'
        packetList.style.flexDirection = 'column'
        packetList.style.gap = '5px'

        if (!packetViewer.packets || packetViewer.packets.length === 0) {
            const emptyMsg = document.createElement('div')
            emptyMsg.textContent = 'No packets captured. Enable packet viewer to start capturing.'
            emptyMsg.style.color = '#555'
            emptyMsg.style.textAlign = 'center'
            emptyMsg.style.marginTop = '20px'
            packetList.appendChild(emptyMsg)
        } else {
            // Show only the last 100 packets for performance
            const packetsToShow = packetViewer.packets.slice(0, 100)
            packetsToShow.forEach(packet => {
                const packetEl = document.createElement('div')
                packetEl.style.backgroundColor = '#1a1a20'
                packetEl.style.padding = '8px'
                packetEl.style.borderRadius = '4px'
                packetEl.style.borderLeft = `3px solid ${packet.direction === 'incoming' ? '#4caf50' : '#2196f3'}`
                packetEl.style.fontSize = '0.85em'
                packetEl.style.cursor = 'pointer'

                const header = document.createElement('div')
                header.style.display = 'flex'
                header.style.justifyContent = 'space-between'
                header.style.marginBottom = '5px'
                header.style.color = packet.direction === 'incoming' ? '#4caf50' : '#2196f3'
                header.style.fontWeight = 'bold'

                const nameSpan = document.createElement('span')
                nameSpan.textContent = packet.name
                header.appendChild(nameSpan)

                const timeSpan = document.createElement('span')
                timeSpan.textContent = new Date(packet.timestamp).toLocaleTimeString()
                timeSpan.style.color = '#777'
                timeSpan.style.fontSize = '0.9em'
                header.appendChild(timeSpan)

                packetEl.appendChild(header)

                const dataPre = document.createElement('pre')
                dataPre.style.margin = '0'
                dataPre.style.color = '#ccc'
                dataPre.style.fontSize = '0.8em'
                dataPre.style.maxHeight = '100px'
                dataPre.style.overflow = 'auto'
                dataPre.style.whiteSpace = 'pre-wrap'
                dataPre.style.wordBreak = 'break-all'
                dataPre.textContent = packet.data.length > 500 ? packet.data.substring(0, 500) + '...' : packet.data
                packetEl.appendChild(dataPre)

                let expanded = false
                packetEl.onclick = () => {
                    expanded = !expanded
                    if (expanded) {
                        dataPre.textContent = packet.data
                        dataPre.style.maxHeight = '300px'
                    } else {
                        dataPre.textContent = packet.data.length > 500 ? packet.data.substring(0, 500) + '...' : packet.data
                        dataPre.style.maxHeight = '100px'
                    }
                }

                packetList.appendChild(packetEl)
            })
        }

        contentContainer.appendChild(packetList)

        // Store update function
        if (!window.anticlient) window.anticlient = {}
        if (!window.anticlient.ui) window.anticlient.ui = {}
        window.anticlient.ui.updatePacketViewer = renderPackets
    }

    const renderTabs = () => {
        sidebar.innerHTML = ''
        Object.keys(categories).forEach(cat => {
            const tab = document.createElement('div')
            tab.className = 'ac-tab' + (cat === activeTab ? ' active' : '')
            tab.textContent = cat
            tab.onclick = () => {
                activeTab = cat
                updateLayout()
                renderTabs()
                renderModules()
            }
            sidebar.appendChild(tab)
        })
    }

    // Initialize Layout
    updateLayout()
    renderTabs()
    renderModules()

    // Drag Logic
    let isDragging = false
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    header.addEventListener("mousedown", dragStart);
    window.addEventListener("mouseup", dragEnd);
    window.addEventListener("mousemove", drag);

    function dragStart(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        if (e.target === header || e.target.closest('.ac-header')) {
            isDragging = true;
        }
    }
    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }
    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            setTranslate(currentX, currentY, uiRoot);
        }
    }
    function setTranslate(xPos, yPos, el) {
        el.style.transform = "translate3d(" + xPos + "px, " + yPos + "px, 0)";
    }

    // --- Blink Backtrack UI Indicator ---
    const blinkIndicator = document.createElement('div')
    blinkIndicator.id = 'blink-indicator'
    blinkIndicator.style.position = 'fixed'
    blinkIndicator.style.top = '50%'
    blinkIndicator.style.left = '50%'
    blinkIndicator.style.transform = 'translate(-50%, 100px)'
    blinkIndicator.style.padding = '15px 30px'
    blinkIndicator.style.background = 'rgba(124, 77, 255, 0.9)'
    blinkIndicator.style.border = '2px solid #7c4dff'
    blinkIndicator.style.borderRadius = '8px'
    blinkIndicator.style.color = 'white'
    blinkIndicator.style.fontFamily = "'Consolas', 'Monaco', monospace"
    blinkIndicator.style.fontSize = '16px'
    blinkIndicator.style.fontWeight = 'bold'
    blinkIndicator.style.zIndex = '99999'
    blinkIndicator.style.display = 'none'
    blinkIndicator.style.textAlign = 'center'
    blinkIndicator.style.boxShadow = '0 0 20px rgba(124, 77, 255, 0.6)'
    blinkIndicator.innerHTML = `
        <div style="margin-bottom: 5px;">🔮 RECORDING BACKTRACK</div>
        <div id="blink-stats" style="font-size: 14px; opacity: 0.9;">
            Positions: <span id="blink-positions">0</span> |
            Time: <span id="blink-time">0.0</span>s
        </div>
        <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">Release B to teleport back</div>
    `
    document.body.appendChild(blinkIndicator)

    // Update blink indicator
    const blinkUpdateInterval = setInterval(() => {
        const modules = window.anticlient?.modules || {}
        const blink = modules['blink']

        // Only show center indicator if onHUD is disabled
        const showCenterIndicator = !blink?.settings?.onHUD

        if (window.anticlient?.blinkUI?.active && showCenterIndicator) {
            blinkIndicator.style.display = 'block'
            const positions = window.anticlient.blinkUI.positions || 0
            const duration = (window.anticlient.blinkUI.duration || 0) / 1000
            document.getElementById('blink-positions').textContent = positions
            document.getElementById('blink-time').textContent = duration.toFixed(1)
        } else {
            blinkIndicator.style.display = 'none'
        }
    }, 50)

    // --- HUD Overlay System ---
    const hudContainer = document.createElement('div')
    hudContainer.id = 'anticlient-hud'
    hudContainer.style.position = 'fixed'
    hudContainer.style.top = '10px'
    hudContainer.style.right = '10px'
    hudContainer.style.zIndex = '9998'
    hudContainer.style.pointerEvents = 'none'
    hudContainer.style.display = 'flex'
    hudContainer.style.flexDirection = 'column'
    hudContainer.style.gap = '10px'
    hudContainer.style.fontFamily = 'monospace'
    hudContainer.style.fontSize = '12px'
    document.body.appendChild(hudContainer)

    // Update HUD every 50ms
    const hudUpdateInterval = setInterval(() => {
        hudContainer.innerHTML = ''

        const modules = window.anticlient?.modules || {}
        const fakeLag = modules['fakelag']
        const blink = modules['blink']

        // Blink HUD
        if (blink && blink.enabled && blink.settings.onHUD && window.anticlient?.blinkUI?.active) {
            const blinkUI = window.anticlient.blinkUI

            const panel = document.createElement('div')
            panel.style.background = 'rgba(124, 77, 255, 0.85)'
            panel.style.border = '2px solid #7c4dff'
            panel.style.borderRadius = '6px'
            panel.style.padding = '10px 14px'
            panel.style.minWidth = '220px'
            panel.style.backdropFilter = 'blur(4px)'
            panel.style.boxShadow = '0 0 20px rgba(124, 77, 255, 0.6)'

            const title = document.createElement('div')
            title.textContent = '🔮 RECORDING BACKTRACK'
            title.style.color = 'white'
            title.style.fontWeight = 'bold'
            title.style.marginBottom = '8px'
            title.style.fontSize = '14px'
            title.style.textShadow = '0 0 5px rgba(255, 255, 255, 0.5)'
            title.style.textAlign = 'center'
            panel.appendChild(title)

            // Progress bar for time
            const maxTime = blink.settings.maxRecordTime
            const currentTime = blinkUI.duration || 0
            const timePercentage = (currentTime / maxTime) * 100

            const progressContainer = document.createElement('div')
            progressContainer.style.width = '100%'
            progressContainer.style.height = '8px'
            progressContainer.style.background = '#1a1a1a'
            progressContainer.style.borderRadius = '4px'
            progressContainer.style.overflow = 'hidden'
            progressContainer.style.marginBottom = '8px'
            progressContainer.style.border = '1px solid rgba(255, 255, 255, 0.3)'

            const progressBar = document.createElement('div')
            progressBar.style.width = `${timePercentage}%`
            progressBar.style.height = '100%'
            progressBar.style.transition = 'width 0.05s linear, background 0.2s'

            // Color based on time used
            if (timePercentage > 80) {
                progressBar.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)'
                progressBar.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.8)'
            } else if (timePercentage > 50) {
                progressBar.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc44)'
                progressBar.style.boxShadow = '0 0 8px rgba(255, 170, 0, 0.8)'
            } else {
                progressBar.style.background = 'linear-gradient(90deg, #00ff00, #44ff44)'
                progressBar.style.boxShadow = '0 0 8px rgba(0, 255, 0, 0.8)'
            }

            progressContainer.appendChild(progressBar)
            panel.appendChild(progressContainer)

            // Stats grid
            const stats = document.createElement('div')
            stats.style.display = 'grid'
            stats.style.gridTemplateColumns = '1fr 1fr'
            stats.style.gap = '8px'
            stats.style.fontSize = '11px'
            stats.style.borderTop = '1px solid rgba(255, 255, 255, 0.3)'
            stats.style.paddingTop = '8px'

            const createStat = (label, value, color = '#fff') => {
                const stat = document.createElement('div')
                stat.style.textAlign = 'center'

                const valueEl = document.createElement('div')
                valueEl.textContent = value
                valueEl.style.color = color
                valueEl.style.fontWeight = 'bold'
                valueEl.style.fontSize = '18px'
                valueEl.style.marginBottom = '2px'
                valueEl.style.textShadow = `0 0 5px ${color}`
                stat.appendChild(valueEl)

                const labelEl = document.createElement('div')
                labelEl.textContent = label
                labelEl.style.color = 'rgba(255, 255, 255, 0.8)'
                labelEl.style.fontSize = '9px'
                labelEl.style.textTransform = 'uppercase'
                stat.appendChild(labelEl)

                return stat
            }

            const positions = blinkUI.positions || 0
            const duration = ((blinkUI.duration || 0) / 1000).toFixed(1)

            stats.appendChild(createStat('Positions', positions, '#ffffff'))
            stats.appendChild(createStat('Time', `${duration}s`, '#ffffff'))

            panel.appendChild(stats)

            // Hint
            const hint = document.createElement('div')
            hint.textContent = 'Release B to teleport back'
            hint.style.color = 'rgba(255, 255, 255, 0.7)'
            hint.style.fontSize = '10px'
            hint.style.textAlign = 'center'
            hint.style.marginTop = '8px'
            panel.appendChild(hint)

            hudContainer.appendChild(panel)
        }

        // Fake Lag HUD
        if (fakeLag && fakeLag.enabled && fakeLag.settings.onHUD && fakeLag.settings.burstMode) {
            const queueInfo = fakeLag.getQueueInfo()

            const panel = document.createElement('div')
            panel.style.background = 'rgba(0, 0, 0, 0.8)'
            panel.style.border = '2px solid #00ffff'
            panel.style.borderRadius = '6px'
            panel.style.padding = '10px 14px'
            panel.style.minWidth = '220px'
            panel.style.backdropFilter = 'blur(4px)'
            panel.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)'

            const title = document.createElement('div')
            title.textContent = '🌐 Fake Lag'
            title.style.color = '#00ffff'
            title.style.fontWeight = 'bold'
            title.style.marginBottom = '8px'
            title.style.fontSize = '14px'
            title.style.textShadow = '0 0 5px rgba(0, 255, 255, 0.5)'
            panel.appendChild(title)

            // Progress bar for countdown
            const progressLabel = document.createElement('div')
            progressLabel.textContent = 'Next Burst'
            progressLabel.style.color = '#aaa'
            progressLabel.style.fontSize = '10px'
            progressLabel.style.marginBottom = '4px'
            panel.appendChild(progressLabel)

            const progressContainer = document.createElement('div')
            progressContainer.style.width = '100%'
            progressContainer.style.height = '8px'
            progressContainer.style.background = '#1a1a1a'
            progressContainer.style.borderRadius = '4px'
            progressContainer.style.overflow = 'hidden'
            progressContainer.style.marginBottom = '8px'
            progressContainer.style.border = '1px solid #333'

            const progressBar = document.createElement('div')
            const percentage = (queueInfo.nextBurstIn / queueInfo.burstInterval) * 100
            progressBar.style.width = `${percentage}%`
            progressBar.style.height = '100%'
            progressBar.style.transition = 'width 0.05s linear, background 0.2s'

            // Color based on time remaining
            if (percentage < 20) {
                progressBar.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)'
                progressBar.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.6)'
            } else if (percentage < 50) {
                progressBar.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc44)'
                progressBar.style.boxShadow = '0 0 8px rgba(255, 170, 0, 0.6)'
            } else {
                progressBar.style.background = 'linear-gradient(90deg, #00ff00, #44ff44)'
                progressBar.style.boxShadow = '0 0 8px rgba(0, 255, 0, 0.6)'
            }

            progressContainer.appendChild(progressBar)
            panel.appendChild(progressContainer)

            // Time display
            const timeDisplay = document.createElement('div')
            timeDisplay.textContent = `${Math.round(queueInfo.nextBurstIn)}ms`
            timeDisplay.style.color = '#fff'
            timeDisplay.style.fontSize = '16px'
            timeDisplay.style.fontWeight = 'bold'
            timeDisplay.style.textAlign = 'center'
            timeDisplay.style.marginBottom = '8px'
            panel.appendChild(timeDisplay)

            // Stats grid
            const stats = document.createElement('div')
            stats.style.display = 'grid'
            stats.style.gridTemplateColumns = '1fr 1fr 1fr'
            stats.style.gap = '8px'
            stats.style.fontSize = '11px'
            stats.style.borderTop = '1px solid #333'
            stats.style.paddingTop = '8px'

            const createStat = (label, value, color = '#fff') => {
                const stat = document.createElement('div')
                stat.style.textAlign = 'center'

                const valueEl = document.createElement('div')
                valueEl.textContent = value
                valueEl.style.color = color
                valueEl.style.fontWeight = 'bold'
                valueEl.style.fontSize = '16px'
                valueEl.style.marginBottom = '2px'
                stat.appendChild(valueEl)

                const labelEl = document.createElement('div')
                labelEl.textContent = label
                labelEl.style.color = '#888'
                labelEl.style.fontSize = '9px'
                labelEl.style.textTransform = 'uppercase'
                stat.appendChild(labelEl)

                return stat
            }

            stats.appendChild(createStat('Total', queueInfo.totalCount, '#00ffff'))
            stats.appendChild(createStat('Out', queueInfo.outgoingCount, '#00ff00'))
            stats.appendChild(createStat('In', queueInfo.incomingCount, '#ff00ff'))

            panel.appendChild(stats)
            hudContainer.appendChild(panel)
        }
    }, 50)

    // Return cleanup function
    return () => {
        stop3DPreview()
        if (previewRenderer) {
            previewRenderer.dispose()
            previewRenderer = null
        }
        if (previewScene) {
            previewScene.clear()
            previewScene = null
        }
        if (uiRoot && uiRoot.parentNode) uiRoot.parentNode.removeChild(uiRoot)
        if (blockSelectorModal && blockSelectorModal.parentNode) blockSelectorModal.parentNode.removeChild(blockSelectorModal)
        if (blinkIndicator && blinkIndicator.parentNode) blinkIndicator.parentNode.removeChild(blinkIndicator)
        if (hudContainer && hudContainer.parentNode) hudContainer.parentNode.removeChild(hudContainer)
        if (style && style.parentNode) style.parentNode.removeChild(style)
        if (previewInterval) clearInterval(previewInterval)
        if (blinkUpdateInterval) clearInterval(blinkUpdateInterval)
        if (hudUpdateInterval) clearInterval(hudUpdateInterval)
        window.removeEventListener('keydown', keydownHandler)
        window.removeEventListener("mouseup", dragEnd)
        window.removeEventListener("mousemove", drag)
    }
}
