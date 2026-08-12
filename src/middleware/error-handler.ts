import type { ErrorRequestHandler, RequestHandler } from 'express';
import { MulterError } from 'multer';
import { Prisma } from '../generated/prisma/client.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/app-error.js';

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Endpoint ${request.method} ${request.originalUrl} tidak ditemukan.`,
  });
};

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'Terjadi kesalahan pada server.';
  let details: unknown;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof MulterError) {
    statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = error.code;
    message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Ukuran file Excel maksimal 5 MB.'
      : 'File Excel tidak dapat diproses.';
  } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    statusCode = 409;
    code = 'DUPLICATE_DATA';
    message = 'Data unik tersebut sudah digunakan.';
  }

  logger.error(message, {
    code,
    method: request.method,
    path: request.originalUrl,
    error: error instanceof Error ? error.stack : error,
  });

  response.status(statusCode).json({
    success: false,
    code,
    message,
    ...(details !== undefined ? { errors: details } : {}),
    ...(env.nodeEnv === 'development' && statusCode === 500 && error instanceof Error
      ? { detail: error.message }
      : {}),
  });
};
