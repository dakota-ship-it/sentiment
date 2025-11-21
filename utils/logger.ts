/**
 * Logger utility for environment-based logging
 * In production, only errors are logged
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDevelopment = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },

  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },

  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },

  // Log with explicit level
  log: (level: LogLevel, ...args: unknown[]) => {
    switch (level) {
      case 'debug':
        logger.debug(...args);
        break;
      case 'info':
        logger.info(...args);
        break;
      case 'warn':
        logger.warn(...args);
        break;
      case 'error':
        logger.error(...args);
        break;
    }
  }
};
