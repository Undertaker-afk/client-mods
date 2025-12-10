
import { Module, registerModule } from '../core/Module.js'

export const loadPacketsModules = () => {
    // -- Packet Viewer --
    const packetViewer = new Module('packetviewer', 'Packet Viewer', 'Packets', 'View all Minecraft network packets', {
        enabled: false,
        maxPackets: 100,
        filter: '',
        direction: 'both' // 'incoming' | 'outgoing' | 'both'
    })
    
    // Store packets
    packetViewer.packets = []
    
    let packetListeners = []
    
    packetViewer.onToggle = (enabled) => {
        // Try to initialize if bot becomes available
        if (enabled && (!window.bot || !window.bot._client)) {
            // Wait for bot to be available
            const checkBot = setInterval(() => {
                if (window.bot && window.bot._client) {
                    clearInterval(checkBot)
                    packetViewer.onToggle(true)
                }
            }, 100)
            setTimeout(() => clearInterval(checkBot), 10000) // Timeout after 10s
            return
        }
        
        if (!window.bot || !window.bot._client) return
        
        if (enabled) {
            packetViewer.packets = []
            
            // Intercept outgoing packets by wrapping write
            const originalWrite = window.bot._client.write.bind(window.bot._client)
            window.bot._client.write = function(name, params) {
                if (packetViewer.enabled && (packetViewer.settings.direction === 'both' || packetViewer.settings.direction === 'outgoing')) {
                    addPacket('outgoing', name, params)
                }
                return originalWrite(name, params)
            }
            packetViewer._originalWrite = originalWrite
            
            // Intercept incoming packets by adding listeners to common events
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
                    if (packetViewer.enabled && (packetViewer.settings.direction === 'both' || packetViewer.settings.direction === 'incoming')) {
                        addPacket('incoming', eventName, args)
                    }
                }
                window.bot._client.on(eventName, listener)
                packetListeners.push({ event: eventName, listener })
            })
        } else {
            // Restore original write
            if (packetViewer._originalWrite) {
                window.bot._client.write = packetViewer._originalWrite
                packetViewer._originalWrite = null
            }
            
            // Remove listeners
            packetListeners.forEach(({ event, listener }) => {
                window.bot._client.removeListener(event, listener)
            })
            packetListeners = []
        }
    }
    
    const addPacket = (direction, name, data) => {
        const packet = {
            direction,
            name,
            data: JSON.stringify(data, null, 2),
            timestamp: Date.now(),
            id: Math.random().toString(36).substr(2, 9)
        }
        
        // Apply filter
        if (packetViewer.settings.filter && packetViewer.settings.filter.trim() !== '') {
            const filter = packetViewer.settings.filter.toLowerCase()
            if (!name.toLowerCase().includes(filter) && !packet.data.toLowerCase().includes(filter)) {
                return
            }
        }
        
        packetViewer.packets.unshift(packet)
        
        // Limit packet count
        if (packetViewer.packets.length > packetViewer.settings.maxPackets) {
            packetViewer.packets.pop()
        }
        
        // Update UI if packet viewer is visible
        if (window.anticlient && window.anticlient.ui && window.anticlient.ui.updatePacketViewer) {
            window.anticlient.ui.updatePacketViewer()
        }
    }
    
    registerModule(packetViewer)

    // -- Fake Lag / Packet Delay --
    const fakeLag = new Module('fakelag', 'Fake Lag', 'Packets', 'Delay outgoing/incoming packets to simulate lag', {
        enabled: false,
        outgoingDelay: 100, // ms
        incomingDelay: 100, // ms
        delayOutgoing: true,
        delayIncoming: false,
        packetFilter: '', // Filter specific packets (comma separated)
        randomJitter: 0, // Random jitter in ms (0-100)
        burstMode: false, // Send all delayed packets at once
        burstInterval: 1000, // ms between bursts
        onHUD: false // Show on HUD overlay
    })

    let outgoingQueue = []
    let incomingQueue = []
    let burstTimer = null
    let incomingListeners = []
    let burstStartTime = 0
    let lastBurstTime = 0

    // Expose queue info for UI
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

            // Store original write function
            const originalWrite = window.bot._client.write.bind(window.bot._client)
            fakeLag._originalWrite = originalWrite

            // Intercept outgoing packets
            window.bot._client.write = function(name, params) {
                if (!fakeLag.enabled || !fakeLag.settings.delayOutgoing) {
                    return originalWrite(name, params)
                }

                // Check if packet matches filter
                if (shouldDelayPacket(name)) {
                    const delay = calculateDelay(fakeLag.settings.outgoingDelay, fakeLag.settings.randomJitter)

                    if (fakeLag.settings.burstMode) {
                        outgoingQueue.push({ name, params, originalWrite })
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

            // Intercept incoming packets using 'packet' event
            if (fakeLag.settings.delayIncoming) {
                // Common packet events to intercept
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
                        if (!fakeLag.enabled || !fakeLag.settings.delayIncoming) {
                            return
                        }

                        if (shouldDelayPacket(eventName)) {
                            const delay = calculateDelay(fakeLag.settings.incomingDelay, fakeLag.settings.randomJitter)

                            if (fakeLag.settings.burstMode) {
                                incomingQueue.push({ event: eventName, args })
                            } else {
                                setTimeout(() => {
                                    if (fakeLag.enabled) {
                                        // Process the delayed packet by calling original handlers
                                        window.bot._client.emit('_delayed_' + eventName, ...args)
                                    }
                                }, delay)
                            }
                        }
                    }

                    // Add listener with high priority (prepend)
                    window.bot._client.prependListener(eventName, delayedListener)
                    incomingListeners.push({ event: eventName, listener: delayedListener })
                })
            }

            // Burst mode timer
            if (fakeLag.settings.burstMode) {
                lastBurstTime = Date.now()
                burstTimer = setInterval(() => {
                    lastBurstTime = Date.now()

                    // Send all queued outgoing packets
                    while (outgoingQueue.length > 0) {
                        const { name, params, originalWrite } = outgoingQueue.shift()
                        if (fakeLag.enabled) {
                            originalWrite(name, params)
                        }
                    }

                    // Process all queued incoming packets
                    while (incomingQueue.length > 0) {
                        const { event, args } = incomingQueue.shift()
                        if (fakeLag.enabled) {
                            window.bot._client.emit('_delayed_' + event, ...args)
                        }
                    }
                }, fakeLag.settings.burstInterval)
            }

        } else {
            // Restore original write
            if (fakeLag._originalWrite) {
                window.bot._client.write = fakeLag._originalWrite
                fakeLag._originalWrite = null
            }

            // Remove incoming packet listeners
            incomingListeners.forEach(({ event, listener }) => {
                window.bot._client.removeListener(event, listener)
            })
            incomingListeners = []

            // Clear burst timer
            if (burstTimer) {
                clearInterval(burstTimer)
                burstTimer = null
            }

            // Flush remaining packets
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

    // Helper to check if packet should be delayed
    const shouldDelayPacket = (packetName) => {
        const filter = fakeLag.settings.packetFilter.trim()
        if (!filter) return true // No filter = delay all

        const filters = filter.split(',').map(f => f.trim().toLowerCase())
        return filters.some(f => packetName.toLowerCase().includes(f))
    }

    // Calculate delay with optional jitter
    const calculateDelay = (baseDelay, jitter) => {
        if (jitter <= 0) return baseDelay
        const randomJitter = Math.random() * jitter * 2 - jitter // -jitter to +jitter
        return Math.max(0, baseDelay + randomJitter)
    }

    registerModule(fakeLag)
}

