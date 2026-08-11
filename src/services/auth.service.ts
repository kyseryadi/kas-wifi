import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { AuthProvider, UserRole, type User } from '../generated/prisma/client.js';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';
import { toUserView } from '../utils/user-view.js';

const googleClient = new OAuth2Client();
const SALT_ROUNDS = 12;

interface OwnerRegistration {
  name: string;
  email: string;
  password: string;
}

interface EmailLogin {
  email: string;
  password: string;
}

const createAccessToken = (user: User) => jwt.sign(
  { parentId: user.parentId, role: user.role },
  env.jwtSecret,
  {
    subject: String(user.id),
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  },
);

const authResult = (user: User) => ({
  accessToken: createAccessToken(user),
  tokenType: 'Bearer',
  expiresIn: env.jwtExpiresIn,
  user: toUserView(user),
});

export const registerOwner = async (input: OwnerRegistration) => {
  const normalizedEmail = input.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existingUser) {
    throw new AppError(409, 'Email sudah terdaftar.', 'EMAIL_ALREADY_EXISTS');
  }

  const user = await prisma.user.create({
    data: {
      parentId: 0,
      name: input.name,
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(input.password, SALT_ROUNDS),
      role: UserRole.OWNER,
      authProvider: AuthProvider.EMAIL,
    },
  });

  return authResult(user);
};

export const loginWithEmail = async (input: EmailLogin) => {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });

  if (!user?.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError(401, 'Email atau password salah.', 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new AppError(403, 'Akun sedang dinonaktifkan.', 'ACCOUNT_INACTIVE');
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return authResult(updatedUser);
};

export const loginWithGoogle = async (credential: string) => {
  if (!env.googleClientId) {
    throw new AppError(503, 'Google login belum dikonfigurasi.', 'GOOGLE_AUTH_NOT_CONFIGURED');
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw new AppError(401, 'Token Google tidak valid.', 'INVALID_GOOGLE_TOKEN');
  }

  if (!payload?.sub || !payload.email || !payload.email_verified) {
    throw new AppError(401, 'Akun Google tidak memiliki email terverifikasi.', 'UNVERIFIED_GOOGLE_EMAIL');
  }

  const email = payload.email.toLowerCase();
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: payload.sub }, { email }] },
  });

  if (!user) {
    if (!env.googleAutoRegisterOwner) {
      throw new AppError(403, 'Akun belum terdaftar. Hubungi pemilik.', 'USER_NOT_REGISTERED');
    }

    user = await prisma.user.create({
      data: {
        parentId: 0,
        name: payload.name ?? email.split('@')[0] ?? 'Pengguna Google',
        email,
        googleId: payload.sub,
        avatarUrl: payload.picture,
        role: UserRole.OWNER,
        authProvider: AuthProvider.GOOGLE,
        lastLoginAt: new Date(),
      },
    });
  } else {
    if (!user.isActive) {
      throw new AppError(403, 'Akun sedang dinonaktifkan.', 'ACCOUNT_INACTIVE');
    }

    if (user.googleId && user.googleId !== payload.sub) {
      throw new AppError(409, 'Email sudah terhubung ke akun Google lain.', 'GOOGLE_ACCOUNT_CONFLICT');
    }

    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: payload.sub,
        avatarUrl: payload.picture ?? user.avatarUrl,
        authProvider: user.passwordHash ? AuthProvider.BOTH : AuthProvider.GOOGLE,
        lastLoginAt: new Date(),
      },
    });
  }

  return authResult(user);
};

export const getCurrentUser = async (userId: number) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user?.isActive) {
    throw new AppError(401, 'Akun tidak ditemukan atau tidak aktif.', 'INVALID_ACCOUNT');
  }

  return toUserView(user);
};
