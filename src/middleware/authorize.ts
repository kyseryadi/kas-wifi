import type { RequestHandler } from 'express';
import type { UserRole } from '../generated/prisma/enums.js';

export const authorize = (...roles: UserRole[]): RequestHandler =>
  (request, response, next) => {
    if (!request.auth || !roles.includes(request.auth.role)) {
      response.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Anda tidak memiliki akses.' });
      return;
    }

    next();
  };
