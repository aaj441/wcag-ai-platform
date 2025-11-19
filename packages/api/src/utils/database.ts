import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  var __prisma: PrismaClient | undefined;
}

// Create Prisma client with proper error handling
export const prisma = globalThis.__prisma || new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug('Query:', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });
}

prisma.$on('error', (e) => {
  logger.error('Prisma error:', e);
});

prisma.$on('info', (e) => {
  logger.info('Prisma info:', e);
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma warning:', e);
});

// Prevent multiple instances in development
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// Database connection test
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    logger.info('Database connection successful');
    
    // Test basic query
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database query test successful');
    
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    return false;
  }
}

// Graceful database shutdown
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
  }
}

// Health check for database
export async function databaseHealthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: any;
}> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;
    
    // Get connection pool stats (if available)
    const connectionStats = await prisma.$queryRaw`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;
    
    return {
      status: 'healthy',
      details: {
        responseTime: `${responseTime}ms`,
        connections: connectionStats[0],
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// Database backup utilities
export async function createDatabaseBackup(): Promise<string> {
  // This would typically use pg_dump or similar tool
  // For now, return a placeholder implementation
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `backup-${timestamp}.sql`;
  
  logger.info(`Database backup requested: ${backupFilename}`);
  
  // In a real implementation, you would:
  // 1. Execute pg_dump command
  // 2. Save to a secure location
  // 3. Return the backup file path
  
  return backupFilename;
}

// Cleanup old sessions and expired tokens
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    
    logger.info(`Cleaned up ${result.count} expired sessions`);
    return result.count;
  } catch (error) {
    logger.error('Error cleaning up expired sessions:', error);
    return 0;
  }
}

// Database statistics
export async function getDatabaseStats(): Promise<any> {
  try {
    const [
      userCount,
      scanCount,
      organizationCount,
      projectCount,
      issueCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.scan.count(),
      prisma.organization.count(),
      prisma.project.count(),
      prisma.issue.count(),
    ]);
    
    return {
      users: userCount,
      scans: scanCount,
      organizations: organizationCount,
      projects: projectCount,
      issues: issueCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Error getting database stats:', error);
    return null;
  }
}

// Initialize database with required indexes and constraints
export async function initializeDatabase(): Promise<void> {
  try {
    logger.info('Initializing database...');
    
    // Add any custom indexes here
    // For example, to improve query performance:
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_scans_user_created_at 
      ON scans(user_id, created_at DESC)
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_issues_scan_severity 
      ON issues(scan_id, severity)
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
      ON audit_logs(created_at DESC)
    `;
    
    logger.info('Database initialization completed');
  } catch (error) {
    logger.error('Error initializing database:', error);
    throw error;
  }
}