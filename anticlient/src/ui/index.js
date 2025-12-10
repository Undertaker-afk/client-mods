
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
    style.textContent = `
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
    }
    .ac-window.expanded {
        width: 950px;
    }
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
    .ac-title {
        font-weight: bold;
        color: #b388ff;
        font-size: 1.1em;
        letter-spacing: 1px;
    }
    .ac-body {
        display: flex;
        flex: 1;
        overflow: hidden;
    }
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
    .ac-tab:hover {
        background-color: #20202a;
        color: #fff;
    }
    .ac-tab.active {
        color: #b388ff;
        border-left: 3px solid #b388ff;
        background-color: #1e1e24;
    }
    .ac-content {
        padding: 15px;
        flex: 1; 
        overflow-y: auto;
        background-color: #0f0f13;
        min-width: 0; /* Fix flex child overflow */
    }
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
    .ac-module.enabled {
        border-left: 3px solid #00e676;
    }
    .ac-module-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
    }
    .ac-module-name {
        font-weight: bold;
    }
    .ac-module-settings {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #333;
        display: none;
    }
    .ac-module-settings.open {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .ac-setting-row { 
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.9em;
    }
    .ac-input-number {
        background: #000;
        border: 1px solid #444;
        color: white;
        width: 50px;
        padding: 2px;
        border-radius: 2px;
    }
    .ac-checkbox {
       accent-color: #7c4dff;
    }
    .ac-preview-panel {
        width: 300px;
        background-color: #111;
        border-left: 1px solid #333;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 10px;
        flex-shrink: 0;
    }
    .ac-preview-title {
        margin-bottom: 10px;
        color: #aaa;
        font-size: 0.9em;
    }
    /* Scrollbar */
    .ac-content::-webkit-scrollbar { width: 8px; }
    .ac-content::-webkit-scrollbar-track { background: #0f0f13; }
    .ac-content::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
    `
    document.head.appendChild(style)

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

            // Bind Button
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

            modEl.appendChild(settingsDiv)
            contentContainer.appendChild(modEl)
        })
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
