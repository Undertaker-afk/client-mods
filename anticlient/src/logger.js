// Anticlient Logging System

export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARNING: 2,
    ERROR: 3,
    NONE: 4
}

class Logger {
    constructor() {
        this.level = LogLevel.INFO // Default log level
        this.prefix = '[Anticlient]'
        this.colors = {
            DEBUG: '#888888',
            INFO: '#00ffff',
            WARNING: '#ffaa00',
            ERROR: '#ff5555'
        }
    }

    setLevel(level) {
        this.level = level
        this.info(`Log level set to: ${this.getLevelName(level)}`)
    }

    getLevelName(level) {
        const names = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'NONE']
        return names[level] || 'UNKNOWN'
    }

    debug(...args) {
        if (this.level <= LogLevel.DEBUG) {
            console.log(`%c${this.prefix} [DEBUG]`, `color: ${this.colors.DEBUG}`, ...args)
        }
    }

    info(...args) {
        if (this.level <= LogLevel.INFO) {
            console.log(`%c${this.prefix} [INFO]`, `color: ${this.colors.INFO}`, ...args)
        }
    }

    warning(...args) {
        if (this.level <= LogLevel.WARNING) {
            console.warn(`%c${this.prefix} [WARNING]`, `color: ${this.colors.WARNING}`, ...args)
        }
    }

    error(...args) {
        if (this.level <= LogLevel.ERROR) {
            console.error(`%c${this.prefix} [ERROR]`, `color: ${this.colors.ERROR}`, ...args)
        }
    }

    // Module-specific logger
    module(moduleName) {
        return {
            debug: (...args) => this.debug(`[${moduleName}]`, ...args),
            info: (...args) => this.info(`[${moduleName}]`, ...args),
            warning: (...args) => this.warning(`[${moduleName}]`, ...args),
            error: (...args) => this.error(`[${moduleName}]`, ...args)
        }
    }
}

// Global logger instance
export const logger = new Logger()

// Make it available globally
if (typeof window !== 'undefined') {
    window.anticlientLogger = logger
}

