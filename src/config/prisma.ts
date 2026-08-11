import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from './env.js';

const databaseUrl = new URL(env.databaseUrl);
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
  connectionLimit: env.databaseConnectionLimit,
});

export const prisma = new PrismaClient({ adapter });
