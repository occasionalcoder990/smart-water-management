import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getZones,
  getZone,
  createZone,
  updateZone,
  deleteZone,
  getZoneCount,
} from '../services/zone.service';
import { ZoneType } from '../models/types';

const router = Router();

// All zone routes require authentication
router.use(authenticate);

/**
 * GET /api/zones
 * Get all zones for the authenticated user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const zones = await getZones(userId);

    res.json({ zones });
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve zones',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * GET /api/zones/:zoneId
 * Get a specific zone by ID
 */
router.get('/:zoneId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { zoneId } = req.params;

    const zone = await getZone(zoneId, userId);

    if (!zone) {
      res.status(404).json({
        error: {
          code: 'ZONE_NOT_FOUND',
          message: 'Zone not found',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    res.json({ zone });
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve zone',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * POST /api/zones
 * Create a new zone
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, type, maxVolume } = req.body;

    if (!name || !type) {
      res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Name and type are required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    const zone = await createZone(userId, name, type as ZoneType, maxVolume);

    res.status(201).json({ zone });
  } catch (error: any) {
    if (error.message.includes('Maximum')) {
      res.status(409).json({
        error: {
          code: 'MAX_ZONES_EXCEEDED',
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
        message: 'Failed to create zone',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * PUT /api/zones/:zoneId
 * Update a zone
 */
router.put('/:zoneId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { zoneId } = req.params;
    const { name, type, maxVolume } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (maxVolume !== undefined) updates.maxVolume = maxVolume;

    const zone = await updateZone(zoneId, userId, updates);

    if (!zone) {
      res.status(404).json({
        error: {
          code: 'ZONE_NOT_FOUND',
          message: 'Zone not found',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    res.json({ zone });
  } catch (error: any) {
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
        message: 'Failed to update zone',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * DELETE /api/zones/:zoneId
 * Delete a zone
 */
router.delete('/:zoneId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { zoneId } = req.params;

    const success = await deleteZone(zoneId, userId);

    if (!success) {
      res.status(404).json({
        error: {
          code: 'ZONE_NOT_FOUND',
          message: 'Zone not found',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    res.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Cannot delete zone with active deployments') {
      res.status(409).json({
        error: {
          code: 'ZONE_HAS_ACTIVE_DEPLOYMENTS',
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
        message: 'Failed to delete zone',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * GET /api/zones/count
 * Get zone count for the authenticated user
 */
router.get('/stats/count', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const count = await getZoneCount(userId);

    res.json({ count, maxZones: 20 });
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get zone count',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

export default router;
