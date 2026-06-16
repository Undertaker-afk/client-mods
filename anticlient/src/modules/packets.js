
import { Module, registerModule } from '../core/Module.js'
import { sanitizeHTML } from '../core/sanitizer.js'

export const loadPacketsModules = () => {
    // ---- Packet Viewer (Enhanced) ----
    const packetViewer = new Module('packetviewer', 'Packet Viewer', 'Packets',
        'View all Minecraft network packets',
        { enabled: false, maxPackets: 100, filter: '', direction: 'both', paused: false, throttleMs: 0 },
        { direction: { type: 'dropdown', options: ['both', 'incoming', 'outgoing'] } }
    )

    packetViewer.packets = []
    let packetListeners = []

    packetViewer.clearPackets = () => { packetViewer.packets = [] }
    packetViewer.exportPackets = () => {
        const data = JSON.stringify(packetViewer.packets, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `packets_${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    let lastPacketTime = 0

    packetViewer.onToggle = (enabled) => {
        if (enabled && (!window.bot || !window.bot._client)) {
            const checkBot = setInterval(() => {
                if (window.bot && window.bot._client) {
                    clearInterval(checkBot)
                    packetViewer.onToggle(true)
                }
            }, 100)
            setTimeout(() => clearInterval(checkBot), 10000)
            return
        }

        if (!window.bot || !window.bot._client) return

        if (enabled) {
            packetViewer.packets = []
            lastPacketTime = 0

            const originalWrite = window.bot._client.write.bind(window.bot._client)
            window.bot._client.write = function(name, params) {
                if (packetViewer.enabled && !packetViewer.settings.paused &&
                    (packetViewer.settings.direction === 'both' || packetViewer.settings.direction === 'outgoing')) {
                    addPacket('outgoing', name, params)
                }
                return originalWrite(name, params)
            }
            packetViewer._originalWrite = originalWrite

            const commonEvents = [
                'position', 'look', 'chat', 'entity_velocity', 'entity_metadata',
                'entity_equipment', 'entity_status', 'update_health', 'experience',
                'block_change', 'multi_block_change', 'chunk_data', 'map_chunk',
                'unload_chunk', 'window_items', 'set_slot', 'open_window', 'close_window',
                'player_list_item', 'player_info', 'spawn_entity', 'spawn_entity_living',
                'entity_destroy', 'entity_move', 'entity_look', 'entity_head_rotation',
                'entity_teleport', 'entity_properties', 'entity_effect', 'remove_entity_effect'
            ]

            commonEvents.forEach(eventName => {
                const listener = (...args) => {
                    if (packetViewer.enabled && !packetViewer.settings.paused &&
                        (packetViewer.settings.direction === 'both' || packetViewer.settings.direction === 'incoming')) {
                        addPacket('incoming', eventName, args)
                    }
                }
                window.bot._client.on(eventName, listener)
                packetListeners.push({ event: eventName, listener })
            })
        } else {
            if (packetViewer._originalWrite) {
                window.bot._client.write = packetViewer._originalWrite
                packetViewer._originalWrite = null
            }
            packetListeners.forEach(({ event, listener }) => {
                window.bot._client.removeListener(event, listener)
            })
            packetListeners = []
        }
    }

    const addPacket = (direction, name, data) => {
        // Throttle
        if (packetViewer.settings.throttleMs > 0) {
            const now = Date.now()
            if (now - lastPacketTime < packetViewer.settings.throttleMs) return
            lastPacketTime = now
        }

        const filter = packetViewer.settings.filter
        if (filter && filter.trim() !== '') {
            const f = filter.toLowerCase()
            if (!name.toLowerCase().includes(f)) return
        }

        const packet = {
            direction,
            name: sanitizeHTML(name),
            data: sanitizeHTML(JSON.stringify(data, null, 2)),
            timestamp: Date.now(),
            id: Math.random().toString(36).substr(2, 9)
        }

        packetViewer.packets.unshift(packet)

        if (packetViewer.packets.length > packetViewer.settings.maxPackets) {
            packetViewer.packets.pop()
        }

        if (window.anticlient?.ui?.updatePacketViewer) {
            window.anticlient.ui.updatePacketViewer()
        }
    }

    registerModule(packetViewer)

    // ---- Fake Lag (Enhanced) ----
    const fakeLag = new Module('fakelag', 'Fake Lag', 'Packets',
        'Delay outgoing/incoming packets to simulate lag',
        {
            enabled: false, outgoingDelay: 100, incomingDelay: 100,
            delayOutgoing: true, delayIncoming: false,
            packetFilter: '', randomJitter: 0,
            burstMode: false, burstInterval: 1000,
            onHUD: true, preserveOrder: true
        }
    )

    let outgoingQueue = []
    let incomingQueue = []
    let burstTimer = null
    let incomingListeners = []
    let lastBurstTime = 0

    fakeLag.getQueueInfo = () => ({
        outgoingCount: outgoingQueue.length,
        incomingCount: incomingQueue.length,
        totalCount: outgoingQueue.length + incomingQueue.length,
        nextBurstIn: burstTimer ? Math.max(0, fakeLag.settings.burstInterval - (Date.now() - lastBurstTime)) : 0,
        burstInterval: fakeLag.settings.burstInterval
    })

    fakeLag.onToggle = (enabled) => {
        if (enabled && (!window.bot || !window.bot._client)) {
            const checkBot = setInterval(() => {
                if (window.bot && window.bot._client) {
                    clearInterval(checkBot)
                    fakeLag.onToggle(true)
                }
            }, 100)
            setTimeout(() => clearInterval(checkBot), 10000)
            return
        }

        if (!window.bot || !window.bot._client) return

        if (enabled) {
            outgoingQueue = []
            incomingQueue = []

            const originalWrite = window.bot._client.write.bind(window.bot._client)
            fakeLag._originalWrite = originalWrite

            window.bot._client.write = function(name, params) {
                if (!fakeLag.enabled || !fakeLag.settings.delayOutgoing) {
                    return originalWrite(name, params)
                }

                if (shouldDelayPacket(name)) {
                    const delay = calculateDelay(fakeLag.settings.outgoingDelay, fakeLag.settings.randomJitter)

                    if (fakeLag.settings.burstMode) {
                        outgoingQueue.push({ name, params, originalWrite, sequence: outgoingQueue.length })
                    } else {
                        setTimeout(() => {
                            if (fakeLag.enabled) {
                                originalWrite(name, params)
                            }
                        }, delay)
                    }
                } else {
                    return originalWrite(name, params)
                }
            }

            if (fakeLag.settings.delayIncoming) {
                const commonEvents = [
                    'position', 'look', 'position_look', 'entity_velocity', 'entity_metadata',
                    'entity_equipment', 'entity_status', 'update_health', 'experience',
                    'block_change', 'multi_block_change', 'map_chunk', 'unload_chunk',
                    'window_items', 'set_slot', 'spawn_entity', 'spawn_entity_living',
                    'entity_destroy', 'entity_move', 'entity_look', 'entity_head_rotation',
                    'entity_teleport', 'rel_entity_move', 'entity_move_look'
                ]

                commonEvents.forEach(eventName => {
                    const delayedListener = (...args) => {
                        if (!fakeLag.enabled || !fakeLag.settings.delayIncoming) return

                        if (shouldDelayPacket(eventName)) {
                            const delay = calculateDelay(fakeLag.settings.incomingDelay, fakeLag.settings.randomJitter)

                            if (fakeLag.settings.burstMode) {
                                incomingQueue.push({ event: eventName, args, sequence: incomingQueue.length })
                            } else {
                                setTimeout(() => {
                                    if (fakeLag.enabled) {
                                        window.bot._client.emit('_delayed_' + eventName, ...args)
                                    }
                                }, delay)
                            }
                        }
                    }

                    window.bot._client.prependListener(eventName, delayedListener)
                    incomingListeners.push({ event: eventName, listener: delayedListener })
                })
            }

            if (fakeLag.settings.burstMode) {
                lastBurstTime = Date.now()
                burstTimer = setInterval(() => {
                    lastBurstTime = Date.now()

                    // Preserve packet ordering
                    if (fakeLag.settings.preserveOrder) {
                        outgoingQueue.sort((a, b) => a.sequence - b.sequence)
                        incomingQueue.sort((a, b) => a.sequence - b.sequence)
                    }

                    while (outgoingQueue.length > 0) {
                        const { name, params, originalWrite } = outgoingQueue.shift()
                        if (fakeLag.enabled) {
                            originalWrite(name, params)
                        }
                    }

                    while (incomingQueue.length > 0) {
                        const { event, args } = incomingQueue.shift()
                        if (fakeLag.enabled) {
                            window.bot._client.emit('_delayed_' + event, ...args)
                        }
                    }
                }, fakeLag.settings.burstInterval)
            }

        } else {
            if (fakeLag._originalWrite) {
                window.bot._client.write = fakeLag._originalWrite
                fakeLag._originalWrite = null
            }

            incomingListeners.forEach(({ event, listener }) => {
                window.bot._client.removeListener(event, listener)
            })
            incomingListeners = []

            if (burstTimer) {
                clearInterval(burstTimer)
                burstTimer = null
            }

            // Flush remaining
            while (outgoingQueue.length > 0) {
                const { name, params, originalWrite } = outgoingQueue.shift()
                originalWrite(name, params)
            }
            while (incomingQueue.length > 0) {
                const { event, args } = incomingQueue.shift()
                window.bot._client.emit('_delayed_' + event, ...args)
            }

            outgoingQueue = []
            incomingQueue = []
        }
    }

    const shouldDelayPacket = (packetName) => {
        const filter = fakeLag.settings.packetFilter.trim()
        if (!filter) return true
        const filters = filter.split(',').map(f => f.trim().toLowerCase())
        return filters.some(f => packetName.toLowerCase().includes(f))
    }

    const calculateDelay = (baseDelay, jitter) => {
        if (jitter <= 0) return baseDelay
        const randomJitter = Math.random() * jitter * 2 - jitter
        return Math.max(0, baseDelay + randomJitter)
    }

    registerModule(fakeLag)
}
