import pino from 'pino';

export function createLogger(level: string, nodeEnv: string): pino.Logger {
  return pino({
    level,
    ...(nodeEnv === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : {}),
  });
}
