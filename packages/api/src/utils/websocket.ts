import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './logger';
import jwt from 'jsonwebtoken';
import { prisma } from './database';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userRole?: string;
  organizationId?: string;
}

interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
}

interface ScanProgressUpdate {
  scanId: string;
  progress: number;
  status: string;
  currentStep?: string;
  issuesFound?: number;
  score?: number;
}

interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  actionUrl?: string;
}

// Store active connections
const activeConnections = new Map<string, AuthenticatedWebSocket[]>();
const connectionScanSubscriptions = new Map<string, Set<string>>();

export function setupWebSocket(wss: WebSocketServer): void {
  logger.info('Setting up WebSocket server');

  wss.on('connection', async (ws: AuthenticatedWebSocket, req) => {
    logger.info('New WebSocket connection attempt');

    try {
      // Extract token from query parameters or headers
      const token = extractTokenFromRequest(req);
      
      if (!token) {
        logger.warn('WebSocket connection rejected: No token provided');
        ws.close(1008, 'Authentication required');
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      if (!decoded || !decoded.userId) {
        logger.warn('WebSocket connection rejected: Invalid token');
        ws.close(1008, 'Invalid authentication token');
        return;
      }

      // Fetch user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true, isActive: true }
      });

      if (!user || !user.isActive) {
        logger.warn('WebSocket connection rejected: User not found or inactive');
        ws.close(1008, 'User not found or inactive');
        return;
      }

      // Attach user info to WebSocket connection
      ws.userId = user.id;
      ws.userRole = user.role;

      // Add to active connections
      if (!activeConnections.has(user.id)) {
        activeConnections.set(user.id, []);
      }
      activeConnections.get(user.id)!.push(ws);

      logger.info(`WebSocket authenticated for user: ${user.id}`);

      // Send welcome message
      sendToUser(user.id, {
        type: 'connection_established',
        data: {
          userId: user.id,
          timestamp: new Date().toISOString(),
        },
      });

      // Handle messages from client
      ws.on('message', async (message: string) => {
        try {
          const parsedMessage: WebSocketMessage = JSON.parse(message);
          await handleWebSocketMessage(ws, parsedMessage);
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
          sendToConnection(ws, {
            type: 'error',
            data: { message: 'Invalid message format' },
          });
        }
      });

      // Handle connection close
      ws.on('close', () => {
        logger.info(`WebSocket connection closed for user: ${user.id}`);
        removeConnection(user.id, ws);
      });

      // Handle connection errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error for user ${user.id}:`, error);
        removeConnection(user.id, ws);
      });

    } catch (error) {
      logger.error('WebSocket authentication error:', error);
      ws.close(1008, 'Authentication failed');
    }
  });

  // Ping/Pong to keep connections alive
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const authenticatedWs = ws as AuthenticatedWebSocket;
      if (authenticatedWs.readyState === WebSocket.OPEN) {
        authenticatedWs.ping();
      }
    });
  }, 30000); // 30 seconds

  wss.on('close', () => {
    clearInterval(pingInterval);
  });
}

function extractTokenFromRequest(req: any): string | null {
  // Try to extract token from query parameters
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const tokenFromQuery = url.searchParams.get('token');
  
  if (tokenFromQuery) {
    return tokenFromQuery;
  }

  // Try to extract token from Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

async function handleWebSocketMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
  const { type, data } = message;

  switch (type) {
    case 'subscribe_scan':
      await handleScanSubscription(ws, data);
      break;
    
    case 'unsubscribe_scan':
      handleScanUnsubscription(ws, data);
      break;
    
    case 'ping':
      sendToConnection(ws, { type: 'pong' });
      break;
    
    case 'get_connection_status':
      sendToConnection(ws, {
        type: 'connection_status',
        data: {
          userId: ws.userId,
          connected: true,
          subscriptions: Array.from(connectionScanSubscriptions.get(ws.userId!) || []),
        },
      });
      break;
    
    default:
      logger.warn(`Unknown WebSocket message type: ${type}`);
  }
}

async function handleScanSubscription(ws: AuthenticatedWebSocket, data: { scanId: string }): Promise<void> {
  try {
    const { scanId } = data;

    if (!ws.userId || !scanId) {
      sendToConnection(ws, {
        type: 'error',
        data: { message: 'Invalid subscription request' },
      });
      return;
    }

    // Verify user has access to this scan
    const scan = await prisma.scan.findFirst({
      where: {
        id: scanId,
        OR: [
          { userId: ws.userId },
          { organization: { members: { some: { userId: ws.userId } } } },
        ],
      },
    });

    if (!scan) {
      sendToConnection(ws, {
        type: 'error',
        data: { message: 'Scan not found or access denied' },
      });
      return;
    }

    // Add subscription
    if (!connectionScanSubscriptions.has(ws.userId)) {
      connectionScanSubscriptions.set(ws.userId, new Set());
    }
    connectionScanSubscriptions.get(ws.userId)!.add(scanId);

    sendToConnection(ws, {
      type: 'scan_subscribed',
      data: { scanId },
    });

    logger.info(`User ${ws.userId} subscribed to scan ${scanId}`);

  } catch (error) {
    logger.error('Error handling scan subscription:', error);
    sendToConnection(ws, {
      type: 'error',
      data: { message: 'Failed to subscribe to scan' },
    });
  }
}

function handleScanUnsubscription(ws: AuthenticatedWebSocket, data: { scanId: string }): void {
  const { scanId } = data;

  if (ws.userId && scanId && connectionScanSubscriptions.has(ws.userId)) {
    connectionScanSubscriptions.get(ws.userId)!.delete(scanId);
    
    sendToConnection(ws, {
      type: 'scan_unsubscribed',
      data: { scanId },
    });

    logger.info(`User ${ws.userId} unsubscribed from scan ${scanId}`);
  }
}

function removeConnection(userId: string, ws: AuthenticatedWebSocket): void {
  // Remove from active connections
  const connections = activeConnections.get(userId);
  if (connections) {
    const index = connections.indexOf(ws);
    if (index > -1) {
      connections.splice(index, 1);
    }
    
    // Clean up empty connection arrays
    if (connections.length === 0) {
      activeConnections.delete(userId);
      connectionScanSubscriptions.delete(userId);
    }
  }
}

function sendToConnection(ws: AuthenticatedWebSocket, message: WebSocketMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({
        ...message,
        timestamp: message.timestamp || new Date().toISOString(),
      }));
    } catch (error) {
      logger.error('Error sending WebSocket message:', error);
    }
  }
}

export function sendToUser(userId: string, message: WebSocketMessage): boolean {
  const connections = activeConnections.get(userId);
  if (!connections || connections.length === 0) {
    return false;
  }

  let sentCount = 0;
  connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      sendToConnection(ws, message);
      sentCount++;
    }
  });

  return sentCount > 0;
}

export function broadcastToScanSubscribers(scanId: string, message: WebSocketMessage): number {
  let sentCount = 0;

  for (const [userId, subscriptions] of connectionScanSubscriptions.entries()) {
    if (subscriptions.has(scanId)) {
      if (sendToUser(userId, message)) {
        sentCount++;
      }
    }
  }

  return sentCount;
}

export function updateScanProgress(update: ScanProgressUpdate): void {
  broadcastToScanSubscribers(update.scanId, {
    type: 'scan_progress',
    data: update,
  });
}

export function notifyScanComplete(scanId: string, results: any): void {
  broadcastToScanSubscribers(scanId, {
    type: 'scan_complete',
    data: {
      scanId,
      results,
      timestamp: new Date().toISOString(),
    },
  });
}

export function notifyScanError(scanId: string, error: string): void {
  broadcastToScanSubscribers(scanId, {
    type: 'scan_error',
    data: {
      scanId,
      error,
      timestamp: new Date().toISOString(),
    },
  });
}

export function sendNotification(userId: string, notification: Omit<NotificationMessage, 'id' | 'timestamp'>): string {
  const fullNotification: NotificationMessage = {
    ...notification,
    id: generateNotificationId(),
    timestamp: new Date().toISOString(),
  };

  sendToUser(userId, {
    type: 'notification',
    data: fullNotification,
  });

  return fullNotification.id;
}

export function sendNotificationToOrganization(organizationId: string, notification: Omit<NotificationMessage, 'id' | 'timestamp'>): void {
  // This would require fetching organization members and sending to each
  // For now, it's a placeholder implementation
  logger.info(`Sending notification to organization ${organizationId}:`, notification);
}

function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Health check for WebSocket server
export function getWebSocketStats(): {
  totalConnections: number;
  activeUsers: number;
  subscriptions: number;
} {
  let totalConnections = 0;
  let subscriptions = 0;

  for (const [userId, connections] of activeConnections.entries()) {
    totalConnections += connections.length;
    const userSubscriptions = connectionScanSubscriptions.get(userId);
    if (userSubscriptions) {
      subscriptions += userSubscriptions.size;
    }
  }

  return {
    totalConnections,
    activeUsers: activeConnections.size,
    subscriptions,
  };
}

// Cleanup utilities
export function cleanupStaleConnections(): void {
  const now = Date.now();
  const staleTimeout = 5 * 60 * 1000; // 5 minutes

  for (const [userId, connections] of activeConnections.entries()) {
    const activeConnectionsForUser: AuthenticatedWebSocket[] = [];
    
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        activeConnectionsForUser.push(ws);
      } else {
        logger.debug(`Removing stale connection for user ${userId}`);
      }
    });

    if (activeConnectionsForUser.length === 0) {
      activeConnections.delete(userId);
      connectionScanSubscriptions.delete(userId);
    } else {
      activeConnections.set(userId, activeConnectionsForUser);
    }
  }
}

export function notifyAllUsers(message: WebSocketMessage): number {
  let sentCount = 0;

  for (const userId of activeConnections.keys()) {
    if (sendToUser(userId, message)) {
      sentCount++;
    }
  }

  return sentCount;
}

// System-wide notifications
export function sendSystemNotification(notification: Omit<NotificationMessage, 'id' | 'timestamp'>): void {
  notifyAllUsers({
    type: 'notification',
    data: {
      ...notification,
      id: generateNotificationId(),
      timestamp: new Date().toISOString(),
    },
  });
}