
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
        uiRoot.style.display = uiRoot.style.display === 'none' ? 'block' : 'none'
    }

    const keydownHandler = (e) => {
        if (e.code === 'ShiftRight' && !document.activeElement.tagName.match(/INPUT|TEXTAREA/)) {
            toggleUi()
        }
        if (!document.activeElement.tagName.match(/INPUT|TEXTAREA/)) {
            Object.values(modules).forEach(mod => {
                if (mod.bind && e.code === mod.bind) {
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
            .ac-module-name { font-weight: bold; }
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
    previewPanel.appendChild(canvas)
    bodyEl.appendChild(previewPanel)

    document.body.appendChild(uiRoot)

    // State & Logic
    let activeTab = 'Movement' // Default

    // Preview Render Loop
    const ctx = canvas.getContext('2d')
    const drawSteve = () => {
        if (activeTab !== 'Render') return

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Background Grid
        ctx.strokeStyle = '#222'
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let x = 0; x < canvas.width; x += 20) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
        for (let y = 0; y < canvas.height; y += 20) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
        ctx.stroke()

        // Get Settings
        const esp = modules['esp']
        const storageEsp = modules['storageesp']

        // Center Point
        const cx = canvas.width / 2
        const cy = canvas.height / 2 + 50

        // Draw Steve (Simple Rects)
        const steveColor = '#555'
        ctx.fillStyle = steveColor

        // Head
        ctx.fillRect(cx - 20, cy - 160, 40, 40)
        // Body
        ctx.fillRect(cx - 20, cy - 120, 40, 60)
        // Arms
        ctx.fillRect(cx - 40, cy - 120, 20, 60)
        ctx.fillRect(cx + 20, cy - 120, 20, 60)
        // Legs
        ctx.fillRect(cx - 20, cy - 60, 20, 60)
        ctx.fillRect(cx, cy - 60, 20, 60)

        // Draw Render Hacks Overlay
        if (esp && esp.enabled) {
            const pc = esp.settings.playerColor || '#00ffff'
            // Box
            ctx.strokeStyle = pc
            ctx.lineWidth = 2

            // 2D ESP Box around Steve
            const top = cy - 170
            const bot = cy
            const left = cx - 50
            const width = 100
            const height = 170

            if (esp.settings.wireframe) {
                ctx.strokeRect(left, top, width, height)
            } else {
                ctx.globalAlpha = 0.2
                ctx.fillStyle = pc
                ctx.fillRect(left, top, width, height)
                ctx.globalAlpha = 1.0
                ctx.strokeRect(left, top, width, height)
            }

            // Nametag
            ctx.fillStyle = 'white'
            ctx.font = '12px monospace'
            ctx.textAlign = 'center'
            ctx.fillText('Steve', cx, top - 10)
        }

        // Draw Storage ESP Example (Just a chest to the side)
        if (storageEsp && storageEsp.enabled) {
            const sc = storageEsp.settings.color || '#FFA500'
            const cxChest = cx + 80
            const cyChest = cy - 20

            // Chest Base
            ctx.fillStyle = '#654321'
            ctx.fillRect(cxChest - 15, cyChest - 15, 30, 30)

            // ESP Box
            ctx.strokeStyle = sc
            ctx.lineWidth = 2
            ctx.strokeRect(cxChest - 15, cyChest - 15, 30, 30)
            ctx.fillStyle = 'white'
            ctx.fillText('Chest', cxChest, cyChest - 20)
        }
    }

    let previewInterval = null

    const updateLayout = () => {
        if (activeTab === 'Render') {
            windowEl.classList.add('expanded')
            previewPanel.style.display = 'flex'
            if (!previewInterval) previewInterval = setInterval(drawSteve, 100)
            // Initial Draw
            requestAnimationFrame(drawSteve)
        } else {
            windowEl.classList.remove('expanded')
            previewPanel.style.display = 'none'
            if (previewInterval) {
                clearInterval(previewInterval)
                previewInterval = null
            }
        }
    }

    const renderModules = () => {
        contentContainer.innerHTML = ''
        
        // Special handling for Packets tab
        if (activeTab === 'Packets') {
            renderPackets()
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
            header.innerHTML = `<span class="ac-module-name">${mod.name}</span> <span style="font-size:0.8em; color: #555">▼</span>`
            header.onclick = () => mod.toggle()
            header.oncontextmenu = (e) => {
                e.preventDefault()
                const settingsEl = modEl.querySelector('.ac-module-settings')
                settingsEl.classList.toggle('open')
            }
            modEl.appendChild(header)

            const settingsDiv = document.createElement('div')
            settingsDiv.className = 'ac-module-settings'

            Object.keys(mod.settings).forEach(key => {
                const row = document.createElement('div')
                row.className = 'ac-setting-row'
                const label = document.createElement('span')
                label.textContent = key
                row.appendChild(label)

                const val = mod.settings[key]
                if (typeof val === 'number') {
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

    const renderPackets = () => {
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
            packetViewer.packets.forEach(packet => {
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

    // Return cleanup function
    return () => {
        if (uiRoot && uiRoot.parentNode) uiRoot.parentNode.removeChild(uiRoot)
        if (style && style.parentNode) style.parentNode.removeChild(style)
        if (previewInterval) clearInterval(previewInterval)
        window.removeEventListener('keydown', keydownHandler)
        window.removeEventListener("mouseup", dragEnd)
        window.removeEventListener("mousemove", drag)
    }
}
