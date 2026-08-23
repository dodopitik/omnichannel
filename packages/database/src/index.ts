import { PrismaClient } from '../generated/client';

// ─── Singleton Prisma Instance ───────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'colorless',
  });
}

export const prisma: PrismaClient =
  global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export * from '../generated/client';
export { PrismaClient } from '../generated/client';
