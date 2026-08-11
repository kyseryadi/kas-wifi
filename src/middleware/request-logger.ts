import type { RequestHandler } from 'express';
import { logger } from '../config/logger.js';

export const requestLogger: RequestHandler = (request, response, next) => {
  const startedAt = Date.now();

  response.on('finish', () => {
    logger.http('HTTP request', {
      method: request.method,
      path: request.originalUrl,
      statusCode: response.statusCode,
      durationMs: Date.now() - startedAt,
      ip: request.ip,
    });
  });

  next();
};
