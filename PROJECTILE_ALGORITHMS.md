# Projectile Prediction Algorithms - Detailed Technical Explanation

## Overview Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  PROJECTILE AIMBOT SYSTEM                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Target System   │────────▶│ History Tracker  │         │
│  │  - Find closest  │         │ - 30 tick buffer │         │
│  │  - Filter type   │         │ - Velocity calc  │         │
│  └──────────────────┘         └──────────────────┘         │
│           │                             │                    │
│           ▼                             ▼                    │
│  ┌──────────────────────────────────────────────┐          │
│  │      Position Prediction                      │          │
│  │  - Backtrack: pos(t - N)                     │          │
│  │  - Lead: pos(t + M)                          │          │
│  └──────────────────────────────────────────────┘          │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────────────────────────────────┐          │
│  │      Distance Check                           │          │
│  │  < 5 blocks?                                  │          │
│  └──────────────────────────────────────────────┘          │
│           │                                                  │
│      ┌────┴────┐                                            │
│      ▼         ▼                                            │
│  ┌───────┐  ┌────────────────┐                            │
│  │Polynom│  │  Cydhranian    │                            │
│  │ ial   │  │  Algorithm     │                            │
│  └───────┘  └────────────────┘                            │
│      │              │                                       │
│      └──────┬───────┘                                       │
│             ▼                                               │
│  ┌──────────────────────────────────────────────┐          │
│  │      Trajectory Simulation                    │          │
│  │  - Calculate full path                        │          │
│  │  - Apply physics (gravity, drag)              │          │
│  └──────────────────────────────────────────────┘          │
│             │                                               │
│             ▼                                               │
│  ┌──────────────────────────────────────────────┐          │
│  │      Apply Aim Smoothing                      │          │
│  │  yaw' = yaw + (target_yaw - yaw) * (1-s)    │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Algorithm 1: Cydhranian (Long Range)

### Physics Model

The Cydhranian algorithm models projectile motion with air resistance:

```
Position as function of time:
  x(t) = x₀ + v_x * (r^t - 1) / (r - 1)
  y(t) = y₀ + v_y * (r^t - 1) / (r - 1) - g * (r^t - r*t + t - 1) / (r - 1)²
  z(t) = z₀ + v_z * (r^t - 1) / (r - 1)

Where:
  r = drag coefficient (0.99 for most projectiles)
  g = gravity (0.03-0.05 depending on projectile)
  v = initial velocity vector
```

### Core Functions

#### 1. getDirectionByTime(t)

Calculates the **initial direction vector** needed to reach the target at time `t`:

```javascript
getDirectionByTime(trajectoryInfo, enemyPos, playerPos, time) {
  const vA = trajectoryInfo.initialVelocity
  const r = trajectoryInfo.drag
  const g = trajectoryInfo.gravity
  
  const diff = enemyPos - playerPos
  const r_t = r^time
  const denom = vA * (r_t - 1)
  
  return {
    x: diff.x * (r - 1) / denom,
    y: diff.y * (r - 1) / denom + g * (r_t - r*time + time - 1) / (vA * (r-1) * (r_t-1)),
    z: diff.z * (r - 1) / denom
  }
}
```

**Key Insight**: We're solving backwards - given the target position and time, what direction should we shoot?

#### 2. findMinimumByBisect()

Uses **binary search** to find the optimal shooting time where the direction becomes a unit vector:

```javascript
findMinimumByBisect(min, max, errorFunction) {
  left = min
  right = max
  
  while (iterations < 25 && (right - left) > 0.001) {
    mid = (left + right) / 2
    
    // Narrow search based on which side has smaller error
    if (errorFunction(mid) is minimum in [left, mid, right]) {
      // Focus search around mid
    } else if (errorFunction(left) < errorFunction(right)) {
      right = mid
    } else {
      left = mid
    }
  }
  
  return finalTime
}
```

**Error Function**: `|getDirectionByTime(t).length() - 1.0|`
- When error ≈ 0, the direction is a unit vector
- This is the **optimal shooting time**

#### 3. calculateTravelTime()

Main solver that finds how long the projectile takes to reach target:

```javascript
calculateTravelTime(trajectoryInfo, targetPos, playerPos) {
  distance = targetPos.distanceTo(playerPos)
  maxTime = (distance / initialVelocity) * 1.75
  
  { time, error } = findMinimumByBisect(0, maxTime, (t) => {
    direction = getDirectionByTime(t)
    return |direction.length() - 1.0|
  })
  
  if (error > 0.1) return null  // No valid solution
  return time
}
```

**Why 1.75x?** The projectile doesn't travel in a straight line, so we allow up to 75% longer flight time.

#### 4. getVelocityOnImpact()

Calculates the velocity vector when the projectile reaches the target:

```javascript
getVelocityOnImpact(trajectoryInfo, time, initialDir) {
  const r = drag
  const v = initialVelocity
  const g = gravity
  const r_t = r^time
  const ln_r = ln(r)
  
  return {
    x: (initialDir.x * r_t * ln_r * v) / (r - 1),
    y: (initialDir.y * (r-1) * r_t * ln_r * v - g * (r_t * ln_r - r + 1)) / (r - 1)²,
    z: (initialDir.z * r_t * ln_r * v) / (r - 1)
  }
}
```

This is used for **collision detection** - we need to know the angle of impact to check if we'll hit the hitbox.

### Complete Flow Diagram

```
Start
  ↓
Calculate max travel time: t_max = distance / v * 1.75
  ↓
Bisection search for optimal t in [0, t_max]:
  ↓
  ├─ For each candidate time t:
  │    ↓
  │    Calculate direction d = getDirectionByTime(t)
  │    ↓
  │    Compute error = ||d|| - 1.0
  │    ↓
  │    If error < 0.1: Found solution!
  │    Else: Narrow search range
  │
  └─ After 25 iterations or convergence:
       ↓
       If error too large: No solution (impossible shot)
       Else: t is the optimal shooting time
         ↓
         Calculate final direction d = getDirectionByTime(t)
         ↓
         Calculate impact velocity v_impact = getVelocityOnImpact(t, d)
         ↓
         Check if impact angle hits target hitbox
         ↓
         Return direction d
```

### Mathematical Proof (Simplified)

The algorithm is based on solving:

```
Find t such that:
  ||d(t)|| = 1

Where d(t) is the direction satisfying:
  target = source + ∫₀ᵗ v(τ) dτ

And v(τ) evolves as:
  v(τ+Δτ) = v(τ) * r - g*Δτ*ŷ

The closed-form solution involves exponentials and logarithms,
which is why we need numerical methods (bisection) to solve it.
```

## Algorithm 2: Polynomial (Short Range < 5 blocks)

For close range, the Cydhranian algorithm becomes numerically unstable. We use a simpler parabolic approximation:

### Model

```
Assume parabolic trajectory (neglect drag for short distances):
  x(t) = x₀ + v_x * t
  y(t) = y₀ + v_y * t - ½ g t²
  z(t) = z₀ + v_z * t
```

### Solving for Pitch Angle

Given horizontal distance `d` and vertical offset `y`:

```
We want to hit the target at:
  d = v * cos(θ) * t
  y = v * sin(θ) * t - ½ g t²

Eliminate t:
  t = d / (v * cos(θ))
  
Substitute into y equation:
  y = d * tan(θ) - ½ g * d² / (v² * cos²(θ))
  
Using cos²(θ) = 1 / (1 + tan²(θ)):
  y = d * tan(θ) - ½ g * d² * (1 + tan²(θ)) / v²

Rearrange into quadratic:
  (½ g d²) * tan²(θ) - (v² * d) * tan(θ) + (½ g d² + v² * y) = 0

Solve using quadratic formula:
  tan(θ) = [v² ± √(v⁴ - g(g d² + 2 y v²))] / (g d)
```

### Implementation

```javascript
polynomialPredict(trajectoryInfo, targetPos, playerPos) {
  diff = targetPos - playerPos
  d = √(diff.x² + diff.z²)  // horizontal distance
  
  v = initialVelocity
  g = gravity
  y = diff.y
  
  // Check if solution exists
  discriminant = v⁴ - g * (g * d² + 2 * y * v²)
  if (discriminant < 0) return null  // Impossible shot
  
  // Use lower angle (faster trajectory)
  pitch = atan((v² - √discriminant) / (g * d))
  yaw = atan2(diff.z, diff.x)
  
  // Convert angles to direction vector
  direction = {
    x: cos(pitch) * cos(yaw),
    y: sin(pitch),
    z: cos(pitch) * sin(yaw)
  }
  
  return direction
}
```

### When to Use

```javascript
if (distance < 5.0) {
  prediction = polynomialPredict(...)
} else {
  prediction = cydhranianPredict(...)
}
```

**Why the threshold?**
- Close range: Polynomial is fast and stable
- Long range: Drag becomes significant, Cydhranian is accurate

## Target Backtrack System

### Position History

Each entity gets a ring buffer of historical positions:

```javascript
class TargetHistory {
  history = Map<entityId, Array<{
    pos: Vec3,
    vel: Vec3,
    timestamp: number,
    tick: number
  }>>
  
  maxHistoryTicks = 30  // Keep last 1.5 seconds (30 ticks @ 20 TPS)
}
```

### Update Loop

```javascript
onPhysicsTick() {
  currentTick++
  
  for each entity in bot.entities {
    currentPos = entity.position
    
    if (history[entity.id].length > 0) {
      lastEntry = history[entity.id].last
      velocity = currentPos - lastEntry.pos
    }
    
    history[entity.id].push({
      pos: currentPos,
      vel: velocity,
      timestamp: now,
      tick: currentTick
    })
    
    if (history[entity.id].length > maxHistoryTicks) {
      history[entity.id].shift()  // Remove oldest
    }
  }
}
```

### Backtrack (Historical Position)

```javascript
getHistoricalPosition(entityId, ticksAgo) {
  targetTick = currentTick - ticksAgo
  
  // Find entry closest to targetTick
  history = history[entityId]
  closest = history.minBy(entry => |entry.tick - targetTick|)
  
  return closest.pos
}
```

**Use Case**: Compensate for network lag. If your ping is 100ms (2 ticks), use `backtrackTicks = 2` to aim at where the player was 100ms ago, which is where the server thinks they are now.

### Lead Target (Future Position)

```javascript
getPredictedPosition(entityId, ticksAhead) {
  currentPos = history[entityId].last.pos
  
  // Calculate average velocity over last 5 ticks
  avgVel = sum(history[entityId].last(5).map(e => e.vel)) / 5
  
  // Linear extrapolation
  predictedPos = currentPos + avgVel * ticksAhead
  
  return predictedPos
}
```

**Use Case**: Hit moving targets. If the target is moving, predict where they'll be when the projectile arrives.

### Combined Backtrack + Lead

```javascript
finalTargetPos = currentPos

// Step 1: Backtrack to compensate lag
if (backtrackTicks > 0) {
  finalTargetPos = getHistoricalPosition(entityId, backtrackTicks)
}

// Step 2: Predict future position
if (predictTicks > 0) {
  finalTargetPos = getPredictedPosition(entityId, predictTicks)
}

// Step 3: Calculate projectile trajectory to finalTargetPos
prediction = projectileCalculate(finalTargetPos)
```

### Velocity Averaging

```javascript
getAverageVelocity(entityId, ticksToAverage = 5) {
  recentEntries = history[entityId].last(ticksToAverage)
  
  totalVel = Vec3(0, 0, 0)
  for (entry in recentEntries) {
    totalVel += entry.vel
  }
  
  return totalVel / recentEntries.length
}
```

**Why average?** Single-tick velocity is noisy due to network jitter. Averaging smooths it out.

## Trajectory Simulation

For visualization, we simulate the full projectile path:

```javascript
simulateTrajectory(trajectoryInfo, direction, startPos, maxTicks) {
  path = [startPos]
  pos = startPos
  vel = direction * initialVelocity
  
  for (tick = 0; tick < maxTicks; tick++) {
    // Apply gravity
    vel.y -= gravity
    
    // Apply drag
    vel *= drag
    
    // Update position
    pos += vel
    path.push(pos)
    
    // Stop if hit ground
    if (pos.y < 0) break
  }
  
  return path
}
```

This generates a list of 3D points representing the projectile's position each tick.

## Projectile Physics Parameters

### Bow (Full Pull)
```javascript
{
  gravity: 0.05,           // Falls 0.05 blocks/tick²
  initialVelocity: 3.0,    // Starts at 3 blocks/tick
  drag: 0.99,              // Loses 1% speed per tick
  hitboxRadius: 0.5        // Arrow collision radius
}
```

After 20 ticks (1 second):
- Velocity: 3.0 * 0.99²⁰ ≈ 2.44 blocks/tick
- Fall: 0.05 * 20 = 1.0 block
- Distance: ~55 blocks

### Snowball/Egg/Pearl
```javascript
{
  gravity: 0.03,
  initialVelocity: 1.5,
  drag: 0.99,
  hitboxRadius: 0.25
}
```

### Trident
```javascript
{
  gravity: 0.05,
  initialVelocity: 2.5,
  drag: 0.99,
  hitboxRadius: 0.5
}
```

### Potion
```javascript
{
  gravity: 0.05,
  initialVelocity: 0.5,   // Very slow!
  drag: 0.99,
  hitboxRadius: 0.25
}
```

### Fishing Rod Hook
```javascript
{
  gravity: 0.04,
  initialVelocity: 1.0,
  drag: 0.92,              // Higher drag in water
  hitboxRadius: 0.25
}
```

## Performance Optimization

### Bisection Iterations

```javascript
maxIterations = 25
tolerance = 0.001

// Each iteration halves the search space:
// After 10 iterations: search range / 2^10 ≈ range / 1024
// After 25 iterations: search range / 2^25 ≈ range / 33M (sub-millimeter precision)
```

**Trade-off**: More iterations = more accurate but slower. 25 is a good balance.

### History Size

```javascript
maxHistoryTicks = 30  // 1.5 seconds @ 20 TPS

// Memory per entity: 30 * (Vec3 + Vec3 + number + number) ≈ 30 * 40 bytes = 1.2 KB
// For 100 entities: 120 KB total
```

### Rendering Optimization

```javascript
// Only render visible entities
frustumCulled = true

// Render order (low = background, high = foreground)
trajectory: 995
targetBox: 996
otherPlayers: 994
historyMarkers: 993

// Disable depth testing for overlays
depthTest = false
```

## Debug Visualization

### Console Access

```javascript
// Get current target
window.anticlient.visuals.projectileTarget

// Get trajectory data
window.anticlient.visuals.projectileTrajectory
// {
//   path: [Vec3, Vec3, ...],
//   target: Entity,
//   direction: Vec3
// }

// Get history for entity
window.anticlient.visuals.targetHistory.history.get(entityId)

// Get average velocity
window.anticlient.visuals.targetHistory.getAverageVelocity(entityId, 5)
```

### Logging

```javascript
const logger = window.anticlientLogger?.module('Projectile')
logger.debug('Calculating trajectory...')
logger.info('Target acquired: ' + target.username)
logger.warn('No valid trajectory found')
logger.error('Failed to calculate direction')
```

## Common Issues & Solutions

### Issue: Shots miss by a constant offset

**Cause**: Incorrect eyeHeight or entity height offset
**Solution**: Adjust the height offset in target position calculation:
```javascript
targetPos = entity.position.offset(0, entity.height * 0.85, 0)
// Try different multipliers: 0.5, 0.85, 1.0
```

### Issue: Shots consistently behind moving targets

**Cause**: Not enough prediction
**Solution**: Increase `predictTicks`:
```javascript
predictTicks: 10  // From 5
```

### Issue: Shots miss on high-ping servers

**Cause**: Server position is behind client position
**Solution**: Increase `backtrackTicks`:
```javascript
backtrackTicks: 5  // For ~250ms ping
```

### Issue: Aimbot "snaps" to target (looks like cheating)

**Cause**: Smoothness too low
**Solution**: Increase smoothness:
```javascript
smoothness: 0.3  // From 0.1
```

### Issue: Trajectory not rendering

**Cause**: Three.js hook not loaded
**Solution**: Check `mcraft-repo.json` has `threeJsBackend: true`

## Advanced: Custom Projectile Types

Add new projectile types by extending `TrajectoryInfo`:

```javascript
const TrajectoryInfo = {
  // ... existing types ...
  
  CUSTOM_PROJECTILE: {
    gravity: 0.04,
    hitboxRadius: 0.3,
    initialVelocity: 2.0,
    drag: 0.95  // 5% loss per tick (more drag)
  }
}
```

Then use in settings:
```javascript
bowaimbot.settings.projectileType = 'CUSTOM_PROJECTILE'
```

## References

- **Cydhranian Algorithm**: Based on academic research in ballistic trajectory calculation with air resistance
- **Minecraft Physics**: Based on Minecraft Java Edition projectile mechanics
- **Three.js**: 3D rendering library for trajectory visualization

---

**Last Updated**: 2026-01-12
**Version**: 1.0.0
**Author**: Anticlient Development Team
