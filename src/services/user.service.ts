import bcrypt from 'bcryptjs';
import { AuthProvider, UserRole } from '../generated/prisma/client.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';
import { toUserView } from '../utils/user-view.js';

interface CreateTeamUserInput {
  name: string;
  email: string;
  password: string;
  role: Exclude<UserRole, 'OWNER'>;
}

interface UpdateTeamUserInput {
  name?: string;
  password?: string;
  role?: Exclude<UserRole, 'OWNER' | 'TECHNICIAN' | 'STAFF'>;
  isActive?: boolean;
}

export const createTeamUser = async (ownerId: number, input: CreateTeamUserInput) => {
  const owner = await prisma.user.findFirst({
    where: { id: ownerId, role: UserRole.OWNER, parentId: 0, isActive: true },
  });

  if (!owner) {
    throw new AppError(403, 'Hanya owner aktif yang dapat menambah user.', 'OWNER_REQUIRED');
  }

  const email = input.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError(409, 'Email sudah terdaftar.', 'EMAIL_ALREADY_EXISTS');
  }

  const user = await prisma.user.create({
    data: {
      parentId: owner.id,
      name: input.name,
      email,
      passwordHash: await bcrypt.hash(input.password, 12),
      role: input.role,
      authProvider: AuthProvider.EMAIL,
    },
  });

  return toUserView(user);
};

export const listTeamUsers = async (ownerId: number) => {
  const users = await prisma.user.findMany({
    where: { parentId: ownerId },
    orderBy: { createdAt: 'desc' },
  });

  return users.map(toUserView);
};

export const updateTeamUser = async (ownerId: number, userId: number, input: UpdateTeamUserInput) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, parentId: ownerId, role: { not: UserRole.OWNER } },
  });

  if (!user) {
    throw new AppError(404, 'User bawahan tidak ditemukan.', 'USER_NOT_FOUND');
  }

  const { password, ...profile } = input;
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...profile,
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    },
  });

  return toUserView(updated);
};

export const deleteTeamUser = async (ownerId: number, userId: number) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, parentId: ownerId, role: { not: UserRole.OWNER } },
    select: { id: true },
  });

  if (!user) {
    throw new AppError(404, 'User bawahan tidak ditemukan.', 'USER_NOT_FOUND');
  }

  await prisma.user.delete({ where: { id: user.id } });
};
