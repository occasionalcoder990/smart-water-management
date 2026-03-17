import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getCurrentUsage,
  getUsageHistory,
  calculateBaseline,
  calculateSavings,
  getUsageChartData,
  getUsageByZone,
} from '../services/usage.service';

const router = Router();

// All usage routes require authentication
router.use(authenticate);

/**
 * GET /api/usage/current
 * Get current usage statistics
 */
router.get('/current', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const timeRange = (req.query.timeRange as 'day' | 'week' | 'month') || 'day';

    if (!['day', 'week', 'month'].includes(timeRange)) {
      res.status(400).json({
        error: {
          code: 'INVALID_TIME_RANGE',
          message: 'Time range must be day, week, or month',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    const usage = await getCurrentUsage(userId, timeRange);

    res.json(usage);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get current usage',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * GET /api/usage/history/:zoneId
 * Get usage history for a specific zone
 */
router.get('/history/:zoneId', async (req: Request, res: Response) => {
  try {
    const { zoneId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const history = await getUsageHistory(zoneId, start, end);

    res.json({ data: history });
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get usage history',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * GET /api/usage/savings
 * Get water savings data
 */
router.get('/savings', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const timeRange = (req.query.timeRange as 'day' | 'week' | 'month') || 'month';

    if (!['day', 'week', 'month'].includes(timeRange)) {
      res.status(400).json({
        error: {
          code: 'INVALID_TIME_RANGE',
          message: 'Time range must be day, week, or month',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    const savings = await calculateSavings(userId, timeRange);

    res.json(savings);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to calculate savings',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * POST /api/usage/baseline
 * Calculate and store baseline usage
 */
router.post('/baseline', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { zoneId, periodDays } = req.body;

    const baseline = await calculateBaseline(
      userId,
      zoneId,
      periodDays || 30
    );

    res.status(201).json({ baseline });
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to calculate baseline',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * GET /api/usage/chart
 * Get usage data formatted for charts
 */
router.get('/chart', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { startDate, endDate, groupBy } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        error: {
          code: 'MISSING_DATES',
          message: 'Start date and end date are required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const group = (groupBy as 'hour' | 'day') || 'day';

    const data = await getUsageChartData(userId, start, end, group);

    res.json({ data });
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get chart data',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * GET /api/usage/by-zone
 * Get usage comparison by zone
 */
router.get('/by-zone', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        error: {
          code: 'MISSING_DATES',
          message: 'Start date and end date are required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const data = await getUsageByZone(userId, start, end);

    res.json({ data });
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get usage by zone',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

export default router;
