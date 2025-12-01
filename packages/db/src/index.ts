import { PrismaClient } from '@prisma/client'

// PrismaClient singleton to prevent multiple instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Export Prisma types for use in other packages
export * from '@prisma/client'

// Utility functions
export async function disconnectDB() {
  await prisma.$disconnect()
}

export async function connectDB() {
  await prisma.$connect()
}
