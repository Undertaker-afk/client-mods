
import { Module, registerModule } from '../core/Module.js'

export const loadNetworkModules = () => {
    // -- Wireless Integration --
    const wireless = new Module('wireless', 'Wireless Integration', 'Settings', 'Connect to desktop bridge', {
        enabled: false,
        host: 'localhost',
        port: 8080,
        autoConnect: true,
        shareInventory: true,
        shareViewport: true
    })

    let ws = null
    let reconnectInterval = null
    let updateInterval = null

    wireless.onToggle = (enabled) => {
        if (enabled) {
            connect()
            if (wireless.settings.autoConnect && !reconnectInterval) {
                reconnectInterval = setInterval(() => {
                    if (!ws || ws.readyState === WebSocket.CLOSED) {
                        connect()
                    }
                }, 5000)
            }
            if (!updateInterval) {
                updateInterval = setInterval(sendUpdate, 100) // 10 ticks per second
            }
        } else {
            disconnect()
            if (reconnectInterval) {
                clearInterval(reconnectInterval)
                reconnectInterval = null
            }
            if (updateInterval) {
                clearInterval(updateInterval)
                updateInterval = null
            }
        }
    }

    const connect = () => {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            console.log('[Wireless] Already connected or connecting, skipping...')
            return
        }

        const url = `ws://${wireless.settings.host}:${wireless.settings.port}`
        console.log(`[Wireless] Connecting to ${url}...`)

        try {
            ws = new WebSocket(url)

            ws.onopen = () => {
                console.log('[Wireless] ✓ Connected to Desktop Bridge')
                // Send initial handshake
                ws.send(JSON.stringify({
                    type: 'handshake',
                    client: 'mcraft-anticlient',
                    version: '1.0.0'
                }))
            }

            ws.onclose = (event) => {
                console.log('[Wireless] ✗ Disconnected', event.code, event.reason)
                ws = null
            }

            ws.onerror = (err) => {
                console.error('[Wireless] ✗ WebSocket Error:', err)
                // Don't set ws to null here, onclose will handle it
            }

            ws.onmessage = (msg) => {
                try {
                    const data = JSON.parse(msg.data)
                    handleMessage(data)
                } catch (e) {
                    console.error('[Wireless] Failed to parse message:', e)
                }
            }
        } catch (e) {
            console.error('[Wireless] Connection failed:', e)
        }
    }

    const disconnect = () => {
        if (ws) {
            ws.close()
            ws = null
        }
    }

    const sendUpdate = () => {
        // Safety checks for bot existence and validity
        if (!ws || ws.readyState !== WebSocket.OPEN) return
        if (!window.bot || !window.bot.entity) return

        try {
            const update = {
                type: 'update',
                timestamp: Date.now()
            }

            if (wireless.settings.shareInventory && window.bot.inventory) {
                update.inventory = window.bot.inventory.items().map(item => ({
                    name: item.name,
                    count: item.count,
                    slot: item.slot
                }))
            }

            if (wireless.settings.shareViewport && window.bot.entity && window.bot.entity.position) {
                update.position = window.bot.entity.position
                update.yaw = window.bot.entity.yaw
                update.pitch = window.bot.entity.pitch
                update.health = window.bot.health
                update.food = window.bot.food
            }

            // Only send if we have meaningful data
            if (update.position || update.inventory) {
                ws.send(JSON.stringify(update))
            }
        } catch (e) {
            console.error('[Wireless] Error sending update:', e)
        }
    }

    const handleMessage = (data) => {
        // Handle incoming commands from desktop client
        if (data.type === 'command') {
            if (data.command === 'chat') {
                window.bot.chat(data.message)
            } else if (data.command === 'move') {
                window.bot.setControlState(data.control, data.state)
            } else if (data.command === 'inventory_click') {
                // Basic inventory interaction - toggles holding an item or drops it
                // This is a simplification. Full inventory management is complex.
                // data.slot: slot number to click
                // data.type: 0 for left click, 1 for right click
                if (window.bot.inventory) {
                    try {
                        window.bot.simpleClick.leftClick(data.slot).catch(err => console.error(err))
                    } catch (e) { console.error(e) }
                }
            } else if (data.command === 'drop_slot') {
                 if (window.bot.inventory) {
                    // This requires a more complex interaction sequence usually
                    // For now, let's just try to toss the item if we can select it
                    const item = window.bot.inventory.slots[data.slot]
                    if (item) {
                        window.bot.tossStack(item).catch(err => console.error(err))
                    }
                }
            }
        }
    }

    registerModule(wireless)
}
