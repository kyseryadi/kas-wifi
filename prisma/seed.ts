import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { AuthProvider, PrismaClient, UserRole } from '../src/generated/prisma/client.js';

const databaseUrlValue = process.env.DATABASE_URL;

if (!databaseUrlValue) {
  throw new Error('DATABASE_URL belum dikonfigurasi.');
}

const databaseUrl = new URL(databaseUrlValue);
const databaseName = databaseUrl.pathname.replace(/^\//, '');

if (!databaseName) {
  throw new Error('Nama database wajib tersedia di DATABASE_URL.');
}

const adapter = new PrismaMariaDb({
  host: databaseUrl.hostname,
  port: databaseUrl.port ? Number(databaseUrl.port) : 3306,
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: databaseName,
  connectionLimit: 1,
});

const prisma = new PrismaClient({ adapter });

const main = async () => {
  const passwordHash = await bcrypt.hash('4dm!n', 12);

  const user = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {
      parentId: 0,
      name: 'Administrator',
      passwordHash,
      role: UserRole.OWNER,
      authProvider: AuthProvider.EMAIL,
      isActive: true,
    },
    create: {
      parentId: 0,
      name: 'Administrator',
      email: 'admin@gmail.com',
      passwordHash,
      role: UserRole.OWNER,
      authProvider: AuthProvider.EMAIL,
      isActive: true,
    },
  });

  console.log(`Seed user berhasil: ${user.email} (${user.role})`);
};

main()
  .catch((error) => {
    console.error('Seed user gagal:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
