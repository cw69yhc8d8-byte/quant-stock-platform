import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

import { getEffectiveDatabaseUrl, getRuntimeEnvironment } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient | null;
  prismaInitError?: string | null;
};

function createPrismaClient() {
  const runtime = getRuntimeEnvironment();
  const url = getEffectiveDatabaseUrl();

  if (!url) {
    globalForPrisma.prismaInitError =
      runtime.databaseWarning ?? "Database unavailable, using mock fallback";
    return null;
  }

  try {
    const adapter = new PrismaBetterSqlite3({ url });

    globalForPrisma.prismaInitError = null;

    return new PrismaClient({ adapter });
  } catch (error) {
    globalForPrisma.prismaInitError =
      error instanceof Error
        ? error.message
        : "Prisma 初始化失败，已切换到 mock fallback";

    return null;
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
export const prismaInitError = globalForPrisma.prismaInitError ?? null;

export function isDatabaseReady() {
  return prisma !== null;
}

export function getDatabaseFallbackWarning() {
  const runtime = getRuntimeEnvironment();

  return (
    prismaInitError ??
    runtime.databaseWarning ??
    "Database unavailable, using mock fallback"
  );
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaInitError = prismaInitError;
}
