import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { AuthProvider, PrismaClient, UserRole } from '../src/generated/prisma/client.js';

const databaseUrlValue = process.env.DATABASE_URL;

if (!databaseUrlValue) {
  throw new Error('DATABASE_URL belum dikonfigurasi.');
}

const adapter = new PrismaPg({
  connectionString: databaseUrlValue,
  max: 1,
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
