import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { testConnection, initializeSchema } from './database/connection';
import { connectRedis } from './database/redis';
import { connectMQTT } from './services/mqtt.service';
import { initializeWebSocket } from './services/websocket.service';
import {
  errorHandler,
  notFoundHandler,
  requestIdMiddleware,
  requestLogger,
} from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import zoneRoutes from './routes/zone.routes';
import waterRoutes from './routes/water.routes';
import usageRoutes from './routes/usage.routes';
import recommendationRoutes from './routes/recommendation.routes';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database health check endpoint
app.get('/health/db', async (req, res) => {
  const isConnected = await testConnection();
  res.json({
    status: isConnected ? 'ok' : 'error',
    database: isConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/water', waterRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Serve frontend static files in production
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path === '/health' || req.path === '/health/db') {
    return next();
  }
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// 404 handler (only for API routes now)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    const useMockDb = process.env.USE_MOCK_DB === 'true';
    
    if (useMockDb) {
      console.log('⚠ Running in MOCK DATABASE mode');
      console.log('  Real database connection skipped');
    } else {
      // Test database connection
      const isConnected = await testConnection();
      if (!isConnected) {
        console.error('Failed to connect to database. Please check your configuration.');
        console.error('Tip: Set USE_MOCK_DB=true in .env to use mock database for demo');
        process.exit(1);
      }
    }

    // Connect to Redis (optional in mock mode)
    try {
      await connectRedis();
    } catch (redisError) {
      console.warn('⚠ Redis not available. Session management will be limited.');
    }

    // Initialize WebSocket server
    initializeWebSocket(httpServer);

    // Connect to MQTT broker (optional - will log error if unavailable)
    try {
      await connectMQTT();
    } catch (mqttError) {
      console.warn('⚠ MQTT broker not available. IoT features will be limited.');
      console.warn('  To enable IoT features, start an MQTT broker (e.g., Mosquitto)');
    }

    // Initialize schema (optional - comment out if schema already exists)
    // await initializeSchema();

    // Start server
    httpServer.listen(PORT, () => {
      console.log(`✓ Backend server running on port ${PORT}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
      console.log(`✓ Database health: http://localhost:${PORT}/health/db`);
      console.log(`✓ WebSocket server ready`);
      if (useMockDb) {
        console.log(`✓ Using MOCK DATABASE (demo mode)`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
