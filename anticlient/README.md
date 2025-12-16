# Anticlient

A feature-rich hacked client mod for the minecraft-web-client.

## Quick Start

1. **Serve the mods folder**:
   ```bash
   cd mcraft-client-mods-main
   npx serve .
   ```

2. **Add Repository in Client**:
   - Open the Minecraft Web Client
   - Go to **Mods > Manage Repositories > Add Repository**
   - URL: `http://localhost:3000`

3. **Install & Use**:
   - Find "Anticlient" in the mod list and click **Install**
   - Reload the page
   - Press **Right Arrow** to open the menu

## Features

### Combat
- Kill Aura, Reach, Auto Clicker, Criticals, W-Tap, Bow Aimbot

### Movement
- Flight, Speed, No Fall, Jesus (water walk), Spider, Phase, Long Jump, Boat Fly, Safe Walk, Freecam, Blink, Fake Lag

### Render
- ESP, Tracers, Fullbright, Block ESP, Storage ESP, NameTags, Waypoints, Chunk Borders, Light Overlay, Trajectory, HUD Overlay

### World
- Nuker, Fast Break, Fast Place, X-Ray, Auto Mine, Search

### Player
- Auto Totem, Auto Eat, Chest Stealer, Scaffold, No Slow, Auto Armor, Auto Tool, Middle Click Friend

### Client
- Timer, Array List, Click GUI, Ping Spoof

---

## Development

### Building

The mod uses esbuild to bundle all source files into a single output file.

```bash
# Bundle the mod
npx -y esbuild anticlient/entry.js --bundle --format=esm --outfile=anticlient/mainUnstable.js
```

### File Structure

```
anticlient/
├── entry.js              # Main entry point (imports all modules)
├── mainUnstable.js       # Bundled output (DO NOT EDIT DIRECTLY)
├── three.js              # Three.js renderer hooks (ESP, Xray rendering)
├── README.md             # This file
└── src/
    ├── core/
    │   └── Module.js     # Base module class and registry
    ├── modules/
    │   ├── combat.js     # Combat modules
    │   ├── movement.js   # Movement modules
    │   ├── render.js     # Render/visual modules
    │   ├── world.js      # World interaction modules
    │   ├── player.js     # Player automation modules
    │   ├── client.js     # Client utility modules
    │   └── packets.js    # Packet manipulation modules
    ├── ui/
    │   └── index.js      # Click GUI implementation
    └── logger.js         # Logging system
```

### Development Workflow

1. Edit source files in `src/` directory
2. Run the bundle command above
3. Reload the webclient to test changes

### Three.js Renderer Hook

The `three.js` file is loaded separately by the webclient's mod system (when `threeJsBackend: true` in `mcraft-repo.json`). It provides:

- Direct access to `WorldRendererThree` via `worldReady(world)` callback
- ESP rendering (entity boxes, tracers, health bars)
- Block ESP / X-Ray highlight mode rendering
- Material manipulation for X-Ray see-through modes (glass/opacity)

### Configuration

In `mcraft-repo.json`:

```json
{
    "name": "anticlient",
    "version": "1.9.0",
    "scriptMainUnstable": true,
    "threeJsBackend": true
}
```

- `scriptMainUnstable`: Loads `mainUnstable.js` as the main script
- `threeJsBackend`: Loads `three.js` for renderer hooks

---

## Testing New Features

Use the companion **anticlient-dev** mod for testing and debugging before adding features to the main mod. See `anticlient-dev/README.md` for details.
