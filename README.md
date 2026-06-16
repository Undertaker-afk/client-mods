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

### v2.0.0
- Complete architecture overhaul with fixed-timestep game loop (20 TPS tick + per-frame render)
- Module error isolation with auto-disable for repeat offenders
- Deep settings proxy with validation, persistence, and nested object support
- Shared attack hook chain for Criticals/W-Tap/Killaura
- Protocol version detection and feature gating
- Shared entity cache (computed once per tick)
- Enhanced KillAura: FOV limit, wall check, target sorting, cooldown awareness
- Packet-based velocity/knockback handling
- Fullbright via gamma/viewer light (not per-block)
- Scaffold/Nuker with rotation+raycast for legitimate placement
- Packet Viewer: filtering, pause, export, throttle
- Fake Lag: packet ordering preservation
- Module search/filter in UI
- Script sandbox with safe API
- Panic key (Ctrl+Backslash/Pause) to disable all modules
- XSS sanitization for server-controlled strings
- Debounced localStorage writes
- Elytra/BoatFly speed caps to prevent teleport-back
- Blink position memory cap and death/teleport cleanup
- Freecam proper entity freeze and state restore
- PingSpoof keepalive timeout cap (29s max)
- Stronger ToS/disclaimer warnings
- Network modules never auto-enabled on load
- Removed backup files from repo

### v1.7.0
- Added Freecam module
- Added HUD overlay system
- Enhanced Fake Lag with burst mode monitoring
- Improved ESP distance label scaling
- Fixed tracer line stability
- Collapsible UI sections

## ⚠️ WARNING - Read Before Use

**This client modification software is intended for educational and single-player use only.**

Using this software on multiplayer servers may violate the server's terms of service and can result in:
- Account suspension or permanent ban
- IP bans
- Legal consequences depending on jurisdiction

**By using this software, you accept full responsibility for any consequences.** The authors assume no liability for account actions, bans, or other damages.

**Safety features:**
- Network-modifying modules (Packet Viewer, Fake Lag, Ping Spoof) are NEVER auto-enabled on load
- All modules start disabled by default
- Use the Panic key (Ctrl+Backslash or Pause) to instantly disable all modules

## ⚠️ Disclaimer

This mod is for educational purposes only. Use responsibly and in accordance with server rules and terms of service.

## 📄 License

MIT License - See LICENSE file for details

---

**Made with ❤️ for the Minecraft Web Client community**


hi i want to create my own minecraft launcher, i submitted a request for accepting my oauth, untill that can you develop something that lets me extract an acccess token from my this webapp, so i can test the launcher by setting the token manualy. Is that possiple or do i have to wait the eta of 6 months which i find unreasonalbe. Can you write some info that helps me make a mod to extract my own oauth token after loggin in with my microsoft account (restrict the export to only TNT_Flo_V2)


``` javascript
// ERUDA Console Script - Extract OAuth Token for TNT_Flo_V2  
(function() {  
  // Check if we're authenticated and get stored accounts  
  const storedAccounts = localStorage.getItem('minecraft-web-client:authenticatedAccounts');  
  if (!storedAccounts) {  
    console.error('No authenticated accounts found');  
    return;  
  }  
    
  const accounts = JSON.parse(storedAccounts);  
  const tntFloAccount = accounts.find(acc => acc.username === 'TNT_Flo_V2');  
    
  if (!tntFloAccount) {  
    console.error('TNT_Flo_V2 account not found');  
    return;  
  }  
    
  // Extract and display the OAuth token  
  console.log('=== OAuth Token for TNT_Flo_V2 ===');  
  console.log('Username:', tntFloAccount.username);  
  console.log('Cached Tokens:', tntFloAccount.cachedTokens);  
  console.log('Full Account Data:', tntFloAccount);  
    
  // Make it globally accessible  
  window.extractedOAuthToken = tntFloAccount.cachedTokens;  
  console.log('Token also stored in window.extractedOAuthToken');  
})();
```
