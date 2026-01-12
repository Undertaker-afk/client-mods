# Projectile Aimbot - Bow Aimbot mit Target Backtrack

Ein hochpräziser Projektil-Aimbot für Anticlient mit historischer Positionsvorhersage (Backtrack) und Trajektorien-Visualisierung.

## Features

### 🎯 Bow Aimbot
- **Cydhranian Algorithmus**: Hochpräzise Ballistik-Berechnung mit Luftwiderstand
- **Polynomial Fallback**: Optimierte Berechnung für kurze Distanzen (< 5 Blöcke)
- **Target Backtrack**: Zielt auf historische Positionen des Ziels (1-30 Ticks zurück)
- **Lead Target**: Vorhersage zukünftiger Positionen basierend auf Geschwindigkeit
- **Multi-Projektil Support**: Bogen, Schneeball, Perle, Dreizack, Trank, Angel

### 👁️ Projectile ESP
- **3D Zielbox**: Zeigt aktuelle Ziel-Entity mit Bounding Box
- **Trajektorien-Pfad**: Visualisiert den kompletten Projektilflug
- **Andere Spieler**: Zeigt alle Spieler im Sichtfeld
- **Distanz & Geschwindigkeit**: Echtzeit-Anzeige von Entfernung und Bewegung
- **Backtrack-Marker**: Zeigt historische Positionen als Punkte

## Installation

1. **Module gebündelt erstellen**:
   ```bash
   cd /workspaces/client-mods
   npx -y esbuild anticlient/entry.js --bundle --format=esm --outfile=anticlient/mainUnstable.js
   ```

2. **Three.js Renderer hinzufügen**:
   Die Datei `projectile-three.js` muss im `mcraft-repo.json` registriert werden.

3. **Im Webclient installieren**:
   - Mods > Repository hinzufügen
   - Anticlient installieren
   - Seite neu laden

## Verwendung

### Aktivierung
1. Drücke **Rechts-Pfeil** um das GUI zu öffnen
2. Navigiere zu **Combat > Bow Aimbot**
3. Aktiviere das Modul
4. Optional: **Render > Projectile ESP** aktivieren

### Einstellungen

#### Bow Aimbot (`bowaimbot`)
- **projectileType**: Wähle Projektil-Typ
  - `BOW_FULL` - Vollständig gespannter Bogen (3.0 m/s)
  - `BOW_HALF` - Halb gespannter Bogen (1.5 m/s)
  - `SNOWBALL`, `EGG`, `PEARL` - Wurfprojektile (1.5 m/s)
  - `TRIDENT` - Dreizack (2.5 m/s)
  - `POTION` - Wurftrank (0.5 m/s)
  - `FISHING_ROD` - Angel (1.0 m/s)

- **targetType**: Ziel-Auswahl
  - `players` - Nur Spieler
  - `mobs` - Nur Mobs
  - `both` - Beides

- **range**: Maximale Ziel-Distanz (Standard: 50 Blöcke)

- **backtrackTicks**: Ticks zurück in der Geschichte (0-30)
  - `0` = Aktuelle Position
  - `5` = 250ms zurück (empfohlen bei Lag)
  - `10` = 500ms zurück

- **predictTicks**: Ticks voraus für Lead-Target (0-30)
  - `0` = Keine Vorhersage
  - `5-10` = Empfohlen für bewegte Ziele
  - `>15` = Für schnelle Ziele

- **smoothness**: Aim-Glättung (0.0-1.0)
  - `0.0` = Sofort (instant)
  - `0.1` = Leicht geglättet (empfohlen)
  - `0.5` = Stark geglättet

- **leadTarget**: Aktiviert Backtrack + Prediction (true/false)

- **autoShoot**: Automatisches Schießen (noch nicht implementiert)

#### Projectile ESP (`projectileesp`)
- **showTrajectory**: Zeige Projektilpfad (true/false)
- **trajectoryColor**: Farbe des Pfades (z.B. `#ff0000`)
- **showTargetBox**: Zeige Ziel-Box (true/false)
- **targetColor**: Farbe der Ziel-Box (z.B. `#00ff00`)
- **showOtherPlayers**: Zeige andere Spieler (true/false)
- **otherPlayerColor**: Farbe für andere Spieler (z.B. `#ffff00`)
- **showDistance**: Zeige Distanz im Label (true/false)
- **showVelocity**: Zeige Geschwindigkeit im Label (true/false)

## Technische Details

### Algorithmen

#### 1. Cydhranian Projektil-Berechnung

Basiert auf einem akademischen Paper für realistische Ballistik mit Luftwiderstand:

```
Richtungsvektor zur Zeit t:

dir_x = (target_x - source_x) * (r - 1) / (v_A * (r^t - 1))

dir_y = (target_y - source_y) * (r - 1) / (v_A * (r^t - 1)) 
        + g * (r^t - r*t + t - 1) / (v_A * (r - 1) * (r^t - 1))

dir_z = (target_z - source_z) * (r - 1) / (v_A * (r^t - 1))
```

Wobei:
- `v_A` = Startgeschwindigkeit
- `r` = Drag-Faktor (0.99 = 1% Verlust pro Tick)
- `g` = Gravitation
- `t` = Zeit in Ticks

**Bisection Solver**: Findet die Zeit `t`, bei der der Richtungsvektor eine Einheitslänge hat (optimale Schusszeit).

#### 2. Polynomial-Approximation (< 5 Blöcke)

Vereinfachte parabolische Flugbahn für nahe Distanzen:

```
pitch = atan((v² - √(v⁴ - g(g*d² + 2*y*v²))) / (g * d))
yaw = atan2(Δz, Δx)
```

Stabiler bei sehr kurzen Distanzen, wo der Cydhranian-Algorithmus instabil werden kann.

#### 3. Target Backtrack

```javascript
// Speichert Positions-Historie
history[entityId] = [
  { pos, vel, timestamp, tick },
  ...
]

// Holt historische Position
getHistoricalPosition(entityId, ticksAgo)

// Berechnet Durchschnitts-Geschwindigkeit
getAverageVelocity(entityId, ticksToAverage)

// Vorhersage
predictedPos = currentPos + avgVel * ticksAhead
```

**Backtrack**: Kompensiert Netzwerk-Lag durch Zielen auf frühere Positionen
**Prediction**: Lead-Target für bewegte Ziele

### Projektil-Parameter

| Typ | Gravitation | Geschwindigkeit | Drag | Hitbox |
|-----|-------------|-----------------|------|--------|
| BOW_FULL | 0.05 | 3.0 m/s | 0.99 | 0.5 |
| BOW_HALF | 0.05 | 1.5 m/s | 0.99 | 0.5 |
| SNOWBALL | 0.03 | 1.5 m/s | 0.99 | 0.25 |
| PEARL | 0.03 | 1.5 m/s | 0.99 | 0.25 |
| TRIDENT | 0.05 | 2.5 m/s | 0.99 | 0.5 |
| POTION | 0.05 | 0.5 m/s | 0.99 | 0.25 |
| FISHING_ROD | 0.04 | 1.0 m/s | 0.92 | 0.25 |

### Rendering Pipeline

1. **Three.js Hook**: `worldReady(world)` wird aufgerufen
2. **Trajectory Line**: `THREE.Line` mit BufferGeometry für Pfad
3. **Target Boxes**: `THREE.LineSegments` mit EdgesGeometry
4. **History Markers**: `THREE.Mesh` Kugeln für historische Positionen
5. **Labels**: `THREE.Sprite` mit Canvas-Texture für Text

## Beispiel-Konfigurationen

### Bogen PvP (50ms Ping)
```javascript
bowaimbot.settings = {
  projectileType: 'BOW_FULL',
  targetType: 'players',
  range: 50,
  backtrackTicks: 2,
  predictTicks: 8,
  smoothness: 0.05,
  leadTarget: true
}
```

### Bogen PvP (150ms Ping)
```javascript
bowaimbot.settings = {
  projectileType: 'BOW_FULL',
  targetType: 'players',
  range: 50,
  backtrackTicks: 7,
  predictTicks: 12,
  smoothness: 0.1,
  leadTarget: true
}
```

### Schneeball-Fight
```javascript
bowaimbot.settings = {
  projectileType: 'SNOWBALL',
  targetType: 'players',
  range: 30,
  backtrackTicks: 3,
  predictTicks: 5,
  smoothness: 0.0,
  leadTarget: true
}
```

### Mob-Farming mit Bogen
```javascript
bowaimbot.settings = {
  projectileType: 'BOW_FULL',
  targetType: 'mobs',
  range: 40,
  backtrackTicks: 0,
  predictTicks: 5,
  smoothness: 0.2,
  leadTarget: true
}
```

## Debugging

### Console-Befehle
```javascript
// Zugriff auf Module
window.anticlient.modules.bowaimbot.settings
window.anticlient.modules.projectileesp.settings

// Target-Historie inspizieren
window.anticlient.visuals.targetHistory

// Aktuelle Trajektorie
window.anticlient.visuals.projectileTrajectory

// Aktuelles Ziel
window.anticlient.visuals.projectileTarget
```

### Logging
```javascript
// Logger-Level setzen (im GUI: Settings > Logger Settings)
logger.setLevel(0) // 0=Debug, 1=Info, 2=Warn, 3=Error
```

## Performance

- **CPU**: ~1-2% pro aktivem Modul
- **Positions-Historie**: 20-30 Ticks pro Entity (ca. 1-2 KB/Entity)
- **Rendering**: ~0.5ms pro Frame bei 10 Entities
- **Memory**: ~5-10 MB für Historie und Meshes

## Bekannte Limitierungen

1. **Server-seitige Validierung**: Server prüft Trefferwinkel
2. **Chunk-Grenzen**: Entities außerhalb geladener Chunks nicht verfügbar
3. **Netzwerk-Jitter**: Sehr unstabiles Ping kann Backtrack ungenau machen
4. **Client-Desync**: Position kann von Server abweichen

## Entwicklung

### Dateien
- `src/modules/projectile.js` - Haupt-Logik (Aimbot, ESP, Backtrack)
- `projectile-three.js` - Three.js Renderer Hook
- `entry.js` - Lädt projectile.js

### Build-Befehl
```bash
npx -y esbuild anticlient/entry.js --bundle --format=esm --outfile=anticlient/mainUnstable.js
```

### Test-Workflow
1. Code ändern in `src/modules/projectile.js`
2. Bundle erstellen (siehe oben)
3. Webclient neu laden (F5)
4. Module im GUI testen

## Credits

- **Cydhranian Algorithmus**: Basiert auf akademischer Ballistik-Forschung
- **Anticlient Framework**: Modulares System für Minecraft Web Client
- **Three.js**: 3D-Rendering Engine

## License

Teil von Anticlient - siehe Hauptprojekt für Lizenz-Informationen.
