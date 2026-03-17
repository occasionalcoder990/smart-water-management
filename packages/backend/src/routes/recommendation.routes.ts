import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  generateRecommendations,
  getRecommendations,
  acceptRecommendation,
  dismissRecommendation,
} from '../services/recommendation.service';

const router = Router();

// All recommendation routes require authentication
router.use(authenticate);

/**
 * GET /api/recommendations
 * Get active recommendations for the user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const recommendations = await getRecommendations(userId);

    res.json({ recommendations });
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get recommendations',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * POST /api/recommendations/generate
 * Generate new recommendations based on usage patterns
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const recommendations = await generateRecommendations(userId);

    res.status(201).json({
      recommendations,
      count: recommendations.length,
    });
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate recommendations',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * POST /api/recommendations/:id/accept
 * Accept a recommendation and apply suggested settings
 */
router.post('/:id/accept', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const result = await acceptRecommendation(id, userId);

    res.json(result);
  } catch (error: any) {
    if (error.message === 'Recommendation not found') {
      res.status(404).json({
        error: {
          code: 'RECOMMENDATION_NOT_FOUND',
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
        message: 'Failed to accept recommendation',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * POST /api/recommendations/:id/dismiss
 * Dismiss a recommendation
 */
router.post('/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const success = await dismissRecommendation(id, userId);

    if (!success) {
      res.status(404).json({
        error: {
          code: 'RECOMMENDATION_NOT_FOUND',
          message: 'Recommendation not found',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to dismiss recommendation',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

export default router;
