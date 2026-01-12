
import { Module, registerModule } from '../core/Module.js'

export const loadProjectileModules = () => {
    const logger = window.anticlientLogger?.module('Projectile') || console

    // ============================================
    // TRAJECTORY PHYSICS DATA
    // ============================================
    
    const TrajectoryInfo = {
        BOW_FULL: { gravity: 0.05, hitboxRadius: 0.5, initialVelocity: 3.0, drag: 0.99 },
        BOW_HALF: { gravity: 0.05, hitboxRadius: 0.5, initialVelocity: 1.5, drag: 0.99 },
        SNOWBALL: { gravity: 0.03, hitboxRadius: 0.25, initialVelocity: 1.5, drag: 0.99 },
        EGG: { gravity: 0.03, hitboxRadius: 0.25, initialVelocity: 1.5, drag: 0.99 },
        PEARL: { gravity: 0.03, hitboxRadius: 0.25, initialVelocity: 1.5, drag: 0.99 },
        TRIDENT: { gravity: 0.05, hitboxRadius: 0.5, initialVelocity: 2.5, drag: 0.99 },
        POTION: { gravity: 0.05, hitboxRadius: 0.25, initialVelocity: 0.5, drag: 0.99 },
        FISHING_ROD: { gravity: 0.04, hitboxRadius: 0.25, initialVelocity: 1.0, drag: 0.92 }
    }

    // ============================================
    // VECTOR MATH UTILITIES
    // ============================================

    class Vec3 {
        constructor(x, y, z) {
            this.x = x || 0
            this.y = y || 0
            this.z = z || 0
        }

        add(v) {
            return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z)
        }

        subtract(v) {
            return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z)
        }

        multiply(s) {
            return new Vec3(this.x * s, this.y * s, this.z * s)
        }

        length() {
            return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
        }

        normalize() {
            const len = this.length()
            return len === 0 ? new Vec3(0, 0, 0) : new Vec3(this.x / len, this.y / len, this.z / len)
        }

        distanceTo(v) {
            return this.subtract(v).length()
        }

        clone() {
            return new Vec3(this.x, this.y, this.z)
        }

        offset(dx, dy, dz) {
            return new Vec3(this.x + dx, this.y + dy, this.z + dz)
        }

        static fromMineflayer(mfVec) {
            return new Vec3(mfVec.x, mfVec.y, mfVec.z)
        }

        toMineflayer() {
            return { x: this.x, y: this.y, z: this.z }
        }
    }

    // ============================================
    // CYDHRANIAN PROJECTILE CALCULATOR
    // ============================================

    class ProjectileCalculator {
        /**
         * Calculate direction vector at specific time to reach target
         * Based on Cydhranian algorithm with drag physics
         */
        static getDirectionByTime(trajectoryInfo, enemyPos, playerHeadPos, time) {
            const vA = trajectoryInfo.initialVelocity
            const r = trajectoryInfo.drag
            const g = trajectoryInfo.gravity

            const diff = enemyPos.subtract(playerHeadPos)
            const r_t = Math.pow(r, time)
            const denominator = vA * (r_t - 1)

            if (Math.abs(denominator) < 0.001) return null

            const fResistance = r - 1

            return new Vec3(
                (diff.x * fResistance) / denominator,
                (diff.y * fResistance) / denominator + 
                    (g * (r_t - r * time + time - 1)) / (vA * fResistance * (r_t - 1)),
                (diff.z * fResistance) / denominator
            )
        }

        /**
         * Calculate velocity vector at impact time
         */
        static getVelocityOnImpact(trajectoryInfo, ticksPassed, initialDir) {
            const r = trajectoryInfo.drag
            const vA = trajectoryInfo.initialVelocity
            const g = trajectoryInfo.gravity
            const t = ticksPassed
            const fResistance = r - 1
            const r_t = Math.pow(r, t)
            const ln_r = Math.log(r)

            return new Vec3(
                (initialDir.x * r_t * ln_r * vA) / fResistance,
                (initialDir.y * fResistance * r_t * ln_r * vA - g * (r_t * ln_r - r + 1)) / (fResistance * fResistance),
                (initialDir.z * r_t * ln_r * vA) / fResistance
            )
        }

        /**
         * Bisection search to find optimal shooting time
         */
        static findMinimumByBisect(min, max, fn, maxIterations = 25, tolerance = 0.001) {
            let left = min
            let right = max
            let iterations = 0

            while (iterations < maxIterations && (right - left) > tolerance) {
                const mid = (left + right) / 2
                const midVal = fn(mid)

                const leftVal = fn(left)
                const rightVal = fn(right)

                if (midVal < leftVal && midVal < rightVal) {
                    if (fn(mid - tolerance) < midVal) {
                        left = mid - tolerance
                    } else {
                        right = mid + tolerance
                    }
                } else if (leftVal < rightVal) {
                    right = mid
                } else {
                    left = mid
                }
                iterations++
            }

            const finalT = (left + right) / 2
            return { ticks: finalT, delta: fn(finalT) }
        }

        /**
         * Calculate how long it takes for projectile to reach target
         */
        static calculateTravelTime(trajectoryInfo, targetPos, playerHeadPos, maxTime = 100) {
            const distance = targetPos.distanceTo(playerHeadPos)
            const maxTravelTime = Math.min((distance / trajectoryInfo.initialVelocity) * 1.75, maxTime)

            const { ticks, delta } = this.findMinimumByBisect(0, maxTravelTime, (t) => {
                const direction = this.getDirectionByTime(trajectoryInfo, targetPos, playerHeadPos, t)
                if (!direction) return Infinity
                // Find time where direction becomes unit vector (length = 1)
                return Math.abs(direction.length() - 1.0)
            })

            // Only accept if solution is accurate enough
            if (delta > 0.1) return null
            return ticks
        }

        /**
         * Main prediction function - returns direction and travel time
         */
        static predictDirection(trajectoryInfo, targetPos, playerHeadPos) {
            const travelTime = this.calculateTravelTime(trajectoryInfo, targetPos, playerHeadPos)
            if (travelTime === null) return null

            const direction = this.getDirectionByTime(trajectoryInfo, targetPos, playerHeadPos, travelTime)
            return direction ? { direction: direction.normalize(), travelTime } : null
        }

        /**
         * Simulate full projectile trajectory for visualization
         */
        static simulateTrajectory(trajectoryInfo, direction, playerHeadPos, maxTicks = 200) {
            const path = [playerHeadPos.clone()]
            let pos = playerHeadPos.clone()
            let vel = direction.multiply(trajectoryInfo.initialVelocity)

            for (let i = 0; i < maxTicks; i++) {
                // Apply gravity
                vel.y -= trajectoryInfo.gravity
                // Apply drag
                vel = vel.multiply(trajectoryInfo.drag)
                // Update position
                pos = pos.add(vel)
                
                path.push(pos.clone())

                // Stop if projectile hits ground
                if (pos.y < 0) break
            }

            return path
        }

        /**
         * Simple polynomial fallback for close range (< 5 blocks)
         */
        static polynomialPredict(trajectoryInfo, targetPos, playerHeadPos) {
            const diff = targetPos.subtract(playerHeadPos)
            const horizontalDistance = Math.sqrt(diff.x * diff.x + diff.z * diff.z)
            
            const velocity = trajectoryInfo.initialVelocity
            const gravity = trajectoryInfo.gravity
            const velocity2 = velocity * velocity
            const velocity4 = velocity2 * velocity2
            const y = diff.y

            // Check if solution exists: v^4 - g(g*d^2 + 2*y*v^2) >= 0
            const sqrt = velocity4 - gravity * (gravity * horizontalDistance * horizontalDistance + 2 * y * velocity2)
            
            if (sqrt < 0) return null

            // Calculate pitch angle
            const pitchRad = Math.atan((velocity2 - Math.sqrt(sqrt)) / (gravity * horizontalDistance))
            const yawRad = Math.atan2(diff.z, diff.x)

            // Convert to direction vector
            const direction = new Vec3(
                Math.cos(pitchRad) * Math.cos(yawRad),
                Math.sin(pitchRad),
                Math.cos(pitchRad) * Math.sin(yawRad)
            )

            return { direction: direction.normalize(), travelTime: horizontalDistance / velocity }
        }
    }

    // ============================================
    // TARGET BACKTRACK HISTORY
    // ============================================

    class TargetHistory {
        constructor(maxHistoryTicks = 20) {
            this.history = new Map() // entityId -> [{pos, vel, timestamp, tick}]
            this.maxHistoryTicks = maxHistoryTicks
            this.currentTick = 0
        }

        update(bot) {
            this.currentTick++

            for (const [id, entity] of Object.entries(bot.entities || {})) {
                if (!entity || !entity.position) continue
                if (entity.type !== 'player' && entity.type !== 'mob') continue
                if (entity === bot.entity) continue

                const entityId = parseInt(id)
                
                if (!this.history.has(entityId)) {
                    this.history.set(entityId, [])
                }

                const posHistory = this.history.get(entityId)
                const currentPos = Vec3.fromMineflayer(entity.position)

                // Calculate velocity from last position
                let velocity = new Vec3(0, 0, 0)
                if (posHistory.length > 0) {
                    const lastEntry = posHistory[posHistory.length - 1]
                    velocity = currentPos.subtract(lastEntry.pos)
                }

                // Add current position to history
                posHistory.push({
                    pos: currentPos,
                    vel: velocity,
                    timestamp: Date.now(),
                    tick: this.currentTick
                })

                // Limit history size
                if (posHistory.length > this.maxHistoryTicks) {
                    posHistory.shift()
                }
            }

            // Clean up entities that no longer exist
            const currentIds = new Set(Object.keys(bot.entities).map(id => parseInt(id)))
            for (const entityId of this.history.keys()) {
                if (!currentIds.has(entityId)) {
                    this.history.delete(entityId)
                }
            }
        }

        getHistoricalPosition(entityId, ticksAgo) {
            const posHistory = this.history.get(entityId)
            if (!posHistory || posHistory.length === 0) return null

            const targetTick = this.currentTick - ticksAgo
            
            // Find closest historical position
            let closest = posHistory[posHistory.length - 1]
            let closestDiff = Math.abs(closest.tick - targetTick)

            for (const entry of posHistory) {
                const diff = Math.abs(entry.tick - targetTick)
                if (diff < closestDiff) {
                    closest = entry
                    closestDiff = diff
                }
            }

            return closest.pos
        }

        getAverageVelocity(entityId, ticksToAverage = 5) {
            const posHistory = this.history.get(entityId)
            if (!posHistory || posHistory.length < 2) return new Vec3(0, 0, 0)

            const recentEntries = posHistory.slice(-ticksToAverage)
            let totalVel = new Vec3(0, 0, 0)

            for (const entry of recentEntries) {
                totalVel = totalVel.add(entry.vel)
            }

            return totalVel.multiply(1 / recentEntries.length)
        }

        getPredictedPosition(entityId, ticksAhead) {
            const posHistory = this.history.get(entityId)
            if (!posHistory || posHistory.length === 0) return null

            const currentPos = posHistory[posHistory.length - 1].pos
            const avgVel = this.getAverageVelocity(entityId)

            // Linear extrapolation
            return currentPos.add(avgVel.multiply(ticksAhead))
        }
    }

    // ============================================
    // BOW AIMBOT MODULE
    // ============================================

    const bowAimbot = new Module(
        'bowaimbot',
        'Bow Aimbot',
        'Combat',
        'Automatically aims projectiles at targets with backtrack prediction',
        {
            enabled: true,
            projectileType: 'BOW_FULL',
            targetType: 'players',
            range: 50,
            backtrackTicks: 5,
            predictTicks: 10,
            smoothness: 0.1,
            autoShoot: false,
            leadTarget: true
        },
        {
            projectileType: {
                type: 'dropdown',
                options: ['BOW_FULL', 'BOW_HALF', 'SNOWBALL', 'EGG', 'PEARL', 'TRIDENT', 'POTION', 'FISHING_ROD']
            },
            targetType: {
                type: 'dropdown',
                options: ['players', 'mobs', 'both']
            }
        }
    )

    const targetHistory = new TargetHistory(30)
    let currentTarget = null
    let predictedTrajectory = null

    bowAimbot.onTick = (bot) => {
        if (!bot || !bot.entities || !bot.entity) return

        // Update position history
        targetHistory.update(bot)

        const settings = bowAimbot.settings
        const trajectoryInfo = TrajectoryInfo[settings.projectileType]

        if (!trajectoryInfo) {
            logger.warn(`Unknown projectile type: ${settings.projectileType}`)
            return
        }

        // Find target
        const filter = settings.targetType === 'players' ? (e => e.type === 'player') :
                      settings.targetType === 'mobs' ? (e => e.type === 'mob') :
                      (e => e.type === 'player' || e.type === 'mob')

        currentTarget = bot.nearestEntity(e =>
            filter(e) &&
            e !== bot.entity &&
            e.position.distanceTo(bot.entity.position) < settings.range
        )

        if (!currentTarget) {
            predictedTrajectory = null
            return
        }

        // Get player head position
        const playerHeadPos = Vec3.fromMineflayer(bot.entity.position).offset(0, bot.entity.eyeHeight || 1.62, 0)

        // Get target position with backtrack and prediction
        let targetPos = Vec3.fromMineflayer(currentTarget.position).offset(0, currentTarget.height * 0.85, 0)

        if (settings.leadTarget) {
            // Apply backtrack (aim at historical position)
            if (settings.backtrackTicks > 0) {
                const historicalPos = targetHistory.getHistoricalPosition(currentTarget.id, settings.backtrackTicks)
                if (historicalPos) {
                    targetPos = historicalPos
                }
            }

            // Apply prediction (lead target)
            if (settings.predictTicks > 0) {
                const predictedPos = targetHistory.getPredictedPosition(currentTarget.id, settings.predictTicks)
                if (predictedPos) {
                    targetPos = predictedPos
                }
            }
        }

        // Choose algorithm based on distance
        const distance = targetPos.distanceTo(playerHeadPos)
        let prediction = null

        if (distance < 5.0) {
            // Use polynomial for close range
            prediction = ProjectileCalculator.polynomialPredict(trajectoryInfo, targetPos, playerHeadPos)
        } else {
            // Use Cydhranian for long range
            prediction = ProjectileCalculator.predictDirection(trajectoryInfo, targetPos, playerHeadPos)
        }

        if (!prediction) {
            predictedTrajectory = null
            return
        }

        // Calculate full trajectory for visualization
        predictedTrajectory = {
            path: ProjectileCalculator.simulateTrajectory(
                trajectoryInfo,
                prediction.direction,
                playerHeadPos,
                Math.ceil(prediction.travelTime) + 20
            ),
            target: currentTarget,
            direction: prediction.direction
        }

        // Apply aim with smoothing
        const direction = prediction.direction
        const targetYaw = Math.atan2(-direction.x, -direction.z)
        const targetPitch = Math.asin(direction.y)

        const smooth = settings.smoothness
        const currentYaw = bot.entity.yaw
        const currentPitch = bot.entity.pitch

        const newYaw = currentYaw + (targetYaw - currentYaw) * (1 - smooth)
        const newPitch = currentPitch + (targetPitch - currentPitch) * (1 - smooth)

        bot.look(newYaw, newPitch, false)
    }

    bowAimbot.onToggle = (enabled) => {
        if (!enabled) {
            currentTarget = null
            predictedTrajectory = null
        }
        logger.info(`Bow Aimbot ${enabled ? 'enabled' : 'disabled'}`)
    }

    registerModule(bowAimbot)

    // ============================================
    // PROJECTILE ESP MODULE
    // ============================================

    const projectileESP = new Module(
        'projectileesp',
        'Projectile ESP',
        'Render',
        'Show projectile trajectory and target ESP',
        {
            showTrajectory: true,
            trajectoryColor: '#ff0000',
            showTargetBox: true,
            targetColor: '#00ff00',
            showOtherPlayers: true,
            otherPlayerColor: '#ffff00',
            showDistance: true,
            showVelocity: false
        }
    )

    projectileESP.onTick = (bot) => {
        if (!window.anticlient) window.anticlient = {}
        if (!window.anticlient.visuals) window.anticlient.visuals = {}

        window.anticlient.visuals.projectileESP = projectileESP.enabled
        window.anticlient.visuals.projectileSettings = projectileESP.settings
        window.anticlient.visuals.projectileTrajectory = predictedTrajectory
        window.anticlient.visuals.projectileTarget = currentTarget
        window.anticlient.visuals.targetHistory = targetHistory
    }

    projectileESP.onToggle = (enabled) => {
        if (!window.anticlient) window.anticlient = {}
        if (!window.anticlient.visuals) window.anticlient.visuals = {}
        
        window.anticlient.visuals.projectileESP = enabled
        
        if (!enabled) {
            window.anticlient.visuals.projectileTrajectory = null
            window.anticlient.visuals.projectileTarget = null
        }
        
        logger.info(`Projectile ESP ${enabled ? 'enabled' : 'disabled'}`)
    }

    registerModule(projectileESP)

    logger.info('Projectile modules loaded (Bow Aimbot, Projectile ESP)')
}
