import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from './auth.service';

let io: Server | null = null;

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

/**
 * Initialize Socket.io server
 */
export function initializeWebSocket(httpServer: HTTPServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const payload = verifyToken(token);
      socket.userId = payload.userId;
      socket.username = payload.username;

      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`✓ WebSocket client connected: ${socket.username} (${socket.userId})`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Handle zone subscription
    socket.on('subscribe', (data: { zoneIds: string[] }) => {
      if (data.zoneIds && Array.isArray(data.zoneIds)) {
        data.zoneIds.forEach((zoneId) => {
          socket.join(`zone:${zoneId}`);
        });
        console.log(`User ${socket.username} subscribed to zones:`, data.zoneIds);
      }
    });

    // Handle zone unsubscription
    socket.on('unsubscribe', (data: { zoneIds: string[] }) => {
      if (data.zoneIds && Array.isArray(data.zoneIds)) {
        data.zoneIds.forEach((zoneId) => {
          socket.leave(`zone:${zoneId}`);
        });
        console.log(`User ${socket.username} unsubscribed from zones:`, data.zoneIds);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`✗ WebSocket client disconnected: ${socket.username}`);
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to Smart Water Management System',
      userId: socket.userId,
    });
  });

  console.log('✓ WebSocket server initialized');

  return io;
}

/**
 * Get Socket.io server instance
 */
export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

/**
 * Broadcast deployment progress update
 */
export function broadcastDeploymentProgress(data: {
  deploymentId: string;
  zoneId: string;
  progress: number;
  litersDeployed: number;
  litersRemaining: number;
}): void {
  if (!io) return;

  io.to(`zone:${data.zoneId}`).emit('deployment:progress', data);
}

/**
 * Broadcast deployment completion
 */
export function broadcastDeploymentComplete(data: {
  deploymentId: string;
  zoneId: string;
  totalLiters: number;
}): void {
  if (!io) return;

  io.to(`zone:${data.zoneId}`).emit('deployment:complete', data);
}

/**
 * Broadcast deployment failure
 */
export function broadcastDeploymentFailed(data: {
  deploymentId: string;
  zoneId: string;
  error: string;
}): void {
  if (!io) return;

  io.to(`zone:${data.zoneId}`).emit('deployment:failed', data);
}

/**
 * Broadcast zone status change
 */
export function broadcastZoneStatusChange(data: {
  zoneId: string;
  status: string;
  timestamp: string;
}): void {
  if (!io) return;

  io.to(`zone:${data.zoneId}`).emit('zone:status', data);
}

/**
 * Broadcast emergency stop activation
 */
export function broadcastEmergencyActivated(data: {
  userId: string;
  stoppedDeployments: string[];
  timestamp: string;
}): void {
  if (!io) return;

  io.to(`user:${data.userId}`).emit('emergency:activated', data);
}

/**
 * Broadcast emergency mode deactivation
 */
export function broadcastEmergencyDeactivated(data: {
  userId: string;
  timestamp: string;
}): void {
  if (!io) return;

  io.to(`user:${data.userId}`).emit('emergency:deactivated', data);
}

/**
 * Broadcast new recommendation
 */
export function broadcastNewRecommendation(data: {
  userId: string;
  recommendation: any;
}): void {
  if (!io) return;

  io.to(`user:${data.userId}`).emit('recommendation:new', data.recommendation);
}

/**
 * Broadcast usage update
 */
export function broadcastUsageUpdate(data: {
  userId: string;
  zoneId: string;
  liters: number;
  timestamp: string;
}): void {
  if (!io) return;

  io.to(`user:${data.userId}`).emit('usage:update', data);
}
