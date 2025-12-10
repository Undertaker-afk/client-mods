
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
}

