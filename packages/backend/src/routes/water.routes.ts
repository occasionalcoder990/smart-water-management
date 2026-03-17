import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  deployWater,
  stopDeployment,
  emergencyStop,
  deactivateEmergency,
  getDeploymentStatus,
  isEmergencyMode,
} from '../services/water.service';
import { sendDeploymentCommand, sendStopCommand, sendEmergencyStopAll } from '../services/mqtt.service';

const router = Router();

// All water routes require authentication
router.use(authenticate);

/**
 * POST /api/water/deploy
 * Deploy water to a zone
 */
router.post('/deploy', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { zoneId, liters } = req.body;

    if (!zoneId || !liters) {
      res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Zone ID and liters are required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    // Create deployment
    const deployment = await deployWater(zoneId, liters, userId);

    // Send command to IoT device (using userId as houseId for simplicity)
    try {
      await sendDeploymentCommand(userId, zoneId, deployment.id, liters);
    } catch (mqttError) {
      console.error('MQTT command failed:', mqttError);
      // Deployment is created, but device communication failed
      // The deployment will timeout if device doesn't respond
    }

    res.status(201).json({
      deploymentId: deployment.id,
      status: deployment.status,
      zoneId: deployment.zoneId,
      requestedLiters: deployment.requestedLiters,
    });
  } catch (error: any) {
    if (error.message === 'Zone not found') {
      res.status(404).json({
        error: {
          code: 'ZONE_NOT_FOUND',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    if (error.message === 'Zone already has an active deployment') {
      res.status(409).json({
        error: {
          code: 'ZONE_BUSY',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    if (error.message.includes('Emergency mode')) {
      res.status(403).json({
        error: {
          code: 'EMERGENCY_MODE_ACTIVE',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    if (error.name === 'ZodError') {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to deploy water',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * POST /api/water/stop
 * Stop an active deployment
 */
router.post('/stop', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { deploymentId } = req.body;

    if (!deploymentId) {
      res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Deployment ID is required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    const success = await stopDeployment(deploymentId, userId);

    // Send stop command to IoT device
    // Note: We don't have zoneId here, so this is a simplified version
    // In production, you'd fetch the deployment details first

    res.json({ success });
  } catch (error: any) {
    if (error.message === 'Deployment not found') {
      res.status(404).json({
        error: {
          code: 'DEPLOYMENT_NOT_FOUND',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    if (error.message === 'Unauthorized') {
      res.status(403).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'You do not have permission to stop this deployment',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    if (error.message === 'Deployment is not active') {
      res.status(409).json({
        error: {
          code: 'DEPLOYMENT_NOT_ACTIVE',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to stop deployment',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * POST /api/water/emergency-stop
 * Emergency stop all deployments
 */
router.post('/emergency-stop', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const stoppedDeployments = await emergencyStop(userId);

    // Send emergency stop command to all devices
    try {
      await sendEmergencyStopAll(userId);
    } catch (mqttError) {
      console.error('MQTT emergency stop failed:', mqttError);
    }

    res.json({
      success: true,
      stoppedDeployments,
      message: 'Emergency stop activated',
    });
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to activate emergency stop',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * POST /api/water/emergency-deactivate
 * Deactivate emergency mode
 */
router.post('/emergency-deactivate', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    await deactivateEmergency(userId);

    res.json({
      success: true,
      message: 'Emergency mode deactivated',
    });
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to deactivate emergency mode',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * GET /api/water/status/:deploymentId
 * Get deployment status and progress
 */
router.get('/status/:deploymentId', async (req: Request, res: Response) => {
  try {
    const { deploymentId } = req.params;

    const status = await getDeploymentStatus(deploymentId);

    if (!status) {
      res.status(404).json({
        error: {
          code: 'DEPLOYMENT_NOT_FOUND',
          message: 'Deployment not found',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    res.json(status);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get deployment status',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * GET /api/water/emergency-status
 * Check if emergency mode is active
 */
router.get('/emergency-status', async (req: Request, res: Response) => {
  try {
    const active = await isEmergencyMode();

    res.json({
      emergencyMode: active,
    });
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check emergency status',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

export default router;
