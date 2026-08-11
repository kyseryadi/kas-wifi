import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';
import { env } from './env.js';

const logDirectory = path.resolve('logs');

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    const detail = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
    return `${timestamp} ${level}: ${message}${detail}`;
  }),
);

export const logger = winston.createLogger({
  level: env.logLevel,
  format: fileFormat,
  defaultMeta: { service: 'kas-wifi-api' },
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
  ],
});

if (env.nodeEnv !== 'production') {
  fs.mkdirSync(logDirectory, { recursive: true });
  logger.add(new winston.transports.File({ filename: path.join(logDirectory, 'error.log'), level: 'error' }));
  logger.add(new winston.transports.File({ filename: path.join(logDirectory, 'combined.log') }));
}
