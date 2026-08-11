import type { User } from '../generated/prisma/client.js';

export const toUserView = (user: User) => ({
  id: user.id,
  parentId: user.parentId,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
  role: user.role,
  authProvider: user.authProvider,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
