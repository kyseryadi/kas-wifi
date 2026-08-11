import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '../generated/prisma/enums.js';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';

interface AccessTokenPayload extends jwt.JwtPayload {
  sub: string;
  parentId: number;
  role: UserRole;
}

export const authenticate: RequestHandler = (request, response, next) => {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    response.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Token akses diperlukan.' });
    return;
  }

  let payload: AccessTokenPayload;
  try {
    payload = jwt.verify(authorization.slice(7), env.jwtSecret) as AccessTokenPayload;
  } catch {
    response.status(401).json({ success: false, code: 'INVALID_TOKEN', message: 'Token akses tidak valid atau kedaluwarsa.' });
    return;
  }

  const userId = Number(payload.sub);
  if (!Number.isInteger(userId)) {
    response.status(401).json({ success: false, code: 'INVALID_TOKEN', message: 'Token akses tidak valid atau kedaluwarsa.' });
    return;
  }

  void prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, parentId: true, role: true, isActive: true },
  }).then((user) => {
    if (!user?.isActive) {
      response.status(401).json({ success: false, code: 'ACCOUNT_INACTIVE', message: 'Akun tidak ditemukan atau dinonaktifkan.' });
      return;
    }

    request.auth = { userId: user.id, parentId: user.parentId, role: user.role };
    next();
  }).catch(next);
};
