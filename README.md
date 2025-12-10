# 🎮 Anticlient - Minecraft Web Client Mods

A comprehensive client-side modification suite for Minecraft Web Client with advanced features including ESP, movement enhancements, combat utilities, and packet manipulation.

## 📦 Installation

1. Load the mod in your Minecraft Web Client
2. Press `Right Shift` to open the Anticlient menu
3. Navigate through categories and enable desired modules

## 🎯 Features Overview

### 🎨 Render Modules
- **ESP (Extra Sensory Perception)** - See players and entities through walls with customizable boxes, tracers, and distance labels
- **Fullbright** - Maximum brightness for better visibility
- **No Render** - Disable rendering of specific elements (fire, water, etc.)
- **Xray** - See ores and blocks through terrain

### 🏃 Movement Modules
- **Flight** - Fly like in creative mode with adjustable speed
- **Speed** - Move faster with strafe and forward modes
- **Spider** - Climb walls like a spider
- **Step** - Automatically step up blocks
- **No Fall** - Prevent fall damage
- **Jesus** - Walk on water
- **Freecam** - Detach camera from player and fly freely
- **Blink** - Record positions and teleport back
- **Inventory Walk** - Move while inventory/GUI is open
- **Portal GUI** - Open inventory while in nether portals

### ⚔️ Combat Modules
- **Killaura** - Automatically attack nearby entities
- **Velocity** - Modify knockback received
- **Criticals** - Force critical hits
- **Auto Totem** - Automatically equip totems

### 📡 Packet Modules
- **Packet Viewer** - Monitor all network packets
- **Fake Lag** - Simulate lag with packet delay and burst mode

### 👤 Player Modules
- **Auto Sprint** - Automatically sprint
- **No Slow** - Remove slowdown effects
- **Fast Break** - Break blocks faster

### 🌍 World Modules
- **Scaffold** - Automatically place blocks beneath you
- **Nuker** - Break blocks around you

## 🎮 HUD Overlays

Enable HUD overlays for real-time stats in the top-right corner:

### 🔮 Blink HUD
Shows when recording backtrack positions:
- Progress bar showing time used
- Position count
- Duration timer
- Visual countdown

**Enable:** Movement → Blink → Show on HUD

### 🌐 Fake Lag HUD
Shows burst mode statistics:
- Next burst countdown with color-coded progress bar
- Total queue size
- Outgoing/Incoming packet counts

**Enable:** Packets → Fake Lag → Show on HUD

## ⌨️ Default Keybinds

| Key | Action |
|-----|--------|
| `Right Shift` | Toggle Anticlient Menu |
| `B` | Blink (Hold to record, release to teleport back) |

*Keybinds can be customized in the module settings*

## 📊 Module Categories

### Combat
Advanced combat utilities including killaura, velocity modification, and auto-totem.

### Movement  
Enhanced movement capabilities like flight, speed, spider climb, and freecam.

### Render
Visual enhancements including ESP, fullbright, xray, and custom rendering options.

### Player
Player-specific utilities like auto-sprint, no-slow, and fast break.

### World
World interaction modules including scaffold and nuker.

### Packets
Network packet manipulation and monitoring tools.

### Client
Client-side utilities and settings.

### Scripting
Custom JavaScript execution environment for advanced users.

## 🎨 ESP Features

The ESP module provides comprehensive entity visualization:

- **3D Boxes** - Colored boxes around entities
- **Tracers** - Lines from player to entities  
- **Distance Labels** - Dynamic distance text (maintains constant screen size)
- **Health Bars** - Visual health indicators
- **Name Tags** - Entity names above boxes

**Customization:**
- Box color (RGB)
- Tracer color (RGB)
- Distance label scaling
- Toggle individual components

## 🌐 Fake Lag System

Advanced packet delay simulation:

**Features:**
- Outgoing/Incoming packet delay (0-5000ms)
- Random jitter (0-500ms)
- Burst mode (queue and release packets)
- Packet filtering (delay specific packets)
- Real-time HUD monitoring

**Use Cases:**
- Test lag compensation
- Simulate network issues
- Movement packet manipulation
- Combat testing

## 🔮 Blink/Backtrack

Record your movement path and teleport back:

1. Enable Blink module
2. Hold `B` to start recording positions
3. Move around (up to 10 seconds)
4. Release `B` to teleport back to start

**Settings:**
- Record interval (ms between recordings)
- Max record time (maximum duration)
- Show on HUD (display stats overlay)

## 📷 Freecam

Detach your camera and explore freely:

**Controls:**
- WASD - Move camera
- Space - Move up
- Shift - Move down  
- Sprint - Fast mode (3x speed)
- Mouse - Look around

**Settings:**
- Base speed
- Fast speed (sprint)
- Slow speed (sneak)
- Movement smoothing

## 🛠️ Development

### File Structure
```
anticlient/
├── src/
│   ├── core/          # Core module system
│   ├── modules/       # Module implementations
│   ├── ui/           # User interface
│   └── entry.js      # Main entry point
├── three.js          # 3D rendering (ESP, tracers)
└── mainUnstable.js   # Compiled bundle
```

### Building
```bash
npx esbuild anticlient/entry.js --bundle --format=esm --outfile=anticlient/mainUnstable.js
```

## 📝 Version History

### v1.7.0
- Added Freecam module
- Added HUD overlay system
- Enhanced Fake Lag with burst mode monitoring
- Improved ESP distance label scaling
- Fixed tracer line stability
- Collapsible UI sections

## ⚠️ Disclaimer

This mod is for educational purposes only. Use responsibly and in accordance with server rules and terms of service.

## 📄 License

MIT License - See LICENSE file for details

---

**Made with ❤️ for the Minecraft Web Client community**

