import { pool } from '../database/connection';
import { mockDb } from '../database/mock-db';
import { UsageRecord, Baseline } from '../models/types';

const useMockDb = process.env.USE_MOCK_DB === 'true';

export interface UsageStats {
  total: number;
  byZone: Record<string, number>;
  savings: number;
}

export interface UsageDataPoint {
  timestamp: Date;
  liters: number;
  zoneId?: string;
  zoneName?: string;
}

export interface SavingsData {
  totalSaved: number;
  percentageReduction: number;
  costSavings: number;
}

const WATER_COST_PER_LITER = 0.002; // $0.002 per liter (example rate)

/**
 * Record water usage from a completed deployment
 */
export async function recordUsage(
  zoneId: string,
  deploymentId: string,
  liters: number,
  cost?: number
): Promise<UsageRecord> {
  const calculatedCost = cost !== undefined ? cost : liters * WATER_COST_PER_LITER;

  const query = `
    INSERT INTO usage_records (zone_id, deployment_id, liters, cost)
    VALUES ($1, $2, $3, $4)
    RETURNING id, zone_id, deployment_id, liters, timestamp, cost
  `;

  const result = await pool.query(query, [zoneId, deploymentId, liters, calculatedCost]);
  const row = result.rows[0];

  return {
    id: row.id,
    zoneId: row.zone_id,
    deploymentId: row.deployment_id,
    liters: parseFloat(row.liters),
    timestamp: row.timestamp,
    cost: parseFloat(row.cost),
  };
}

/**
 * Get usage history for a specific zone
 */
export async function getUsageHistory(
  zoneId: string,
  startDate?: Date,
  endDate?: Date
): Promise<UsageDataPoint[]> {
  let query = `
    SELECT ur.timestamp, ur.liters, ur.zone_id, z.name as zone_name
    FROM usage_records ur
    JOIN zones z ON ur.zone_id = z.id
    WHERE ur.zone_id = $1
  `;

  const params: any[] = [zoneId];
  let paramIndex = 2;

  if (startDate) {
    query += ` AND ur.timestamp >= $${paramIndex++}`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND ur.timestamp <= $${paramIndex++}`;
    params.push(endDate);
  }

  query += ' ORDER BY ur.timestamp ASC';

  const result = await pool.query(query, params);

  return result.rows.map((row) => ({
    timestamp: row.timestamp,
    liters: parseFloat(row.liters),
    zoneId: row.zone_id,
    zoneName: row.zone_name,
  }));
}

/**
 * Get current usage statistics
 */
export async function getCurrentUsage(
  userId: string,
  timeRange: 'day' | 'week' | 'month'
): Promise<UsageStats> {
  // Calculate date range
  const now = new Date();
  const startDate = new Date();

  switch (timeRange) {
    case 'day':
      startDate.setDate(now.getDate() - 1);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
  }

  if (useMockDb) {
    const records = await mockDb.getUsageByTimeRange(startDate, now);
    const total = records.reduce((sum, r) => sum + r.liters, 0);
    
    const byZone: Record<string, number> = {};
    records.forEach(r => {
      byZone[r.zoneId] = (byZone[r.zoneId] || 0) + r.liters;
    });

    // Mock baseline for savings calculation
    const daysInRange = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;
    const mockBaseline = 150 * daysInRange; // 150L per day baseline
    const savings = Math.max(0, mockBaseline - total);

    return { total, byZone, savings };
  }

  // Get total usage
  const totalQuery = `
    SELECT COALESCE(SUM(ur.liters), 0) as total
    FROM usage_records ur
    JOIN zones z ON ur.zone_id = z.id
    WHERE z.user_id = $1 AND ur.timestamp >= $2
  `;

  const totalResult = await pool.query(totalQuery, [userId, startDate]);
  const total = parseFloat(totalResult.rows[0].total);

  // Get usage by zone
  const byZoneQuery = `
    SELECT z.id, z.name, COALESCE(SUM(ur.liters), 0) as liters
    FROM zones z
    LEFT JOIN usage_records ur ON z.id = ur.zone_id AND ur.timestamp >= $2
    WHERE z.user_id = $1
    GROUP BY z.id, z.name
  `;

  const byZoneResult = await pool.query(byZoneQuery, [userId, startDate]);
  const byZone: Record<string, number> = {};

  byZoneResult.rows.forEach((row) => {
    byZone[row.id] = parseFloat(row.liters);
  });

  // Calculate savings (compare to baseline)
  const baseline = await getLatestBaseline(userId);
  let savings = 0;

  if (baseline) {
    const daysInRange = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;
    const expectedUsage = baseline.averageDailyLiters * daysInRange;
    savings = Math.max(0, expectedUsage - total);
  }

  return {
    total,
    byZone,
    savings,
  };
}

/**
 * Calculate baseline water usage
 */
export async function calculateBaseline(
  userId: string,
  zoneId?: string,
  periodDays: number = 30
): Promise<Baseline> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - periodDays);

  let query = `
    SELECT COALESCE(SUM(ur.liters), 0) as total_liters
    FROM usage_records ur
    JOIN zones z ON ur.zone_id = z.id
    WHERE z.user_id = $1 AND ur.timestamp >= $2 AND ur.timestamp <= $3
  `;

  const params: any[] = [userId, startDate, endDate];

  if (zoneId) {
    query += ' AND ur.zone_id = $4';
    params.push(zoneId);
  }

  const result = await pool.query(query, params);
  const totalLiters = parseFloat(result.rows[0].total_liters);
  const averageDailyLiters = totalLiters / periodDays;

  // Store baseline
  const insertQuery = `
    INSERT INTO baselines (user_id, zone_id, average_daily_liters, period_start, period_end)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, user_id, zone_id, average_daily_liters, calculated_at, period_start, period_end
  `;

  const insertResult = await pool.query(insertQuery, [
    userId,
    zoneId || null,
    averageDailyLiters,
    startDate,
    endDate,
  ]);

  const row = insertResult.rows[0];

  return {
    id: row.id,
    userId: row.user_id,
    zoneId: row.zone_id,
    averageDailyLiters: parseFloat(row.average_daily_liters),
    calculatedAt: row.calculated_at,
    periodStart: row.period_start,
    periodEnd: row.period_end,
  };
}

/**
 * Get latest baseline for a user
 */
export async function getLatestBaseline(userId: string, zoneId?: string): Promise<Baseline | null> {
  let query = `
    SELECT id, user_id, zone_id, average_daily_liters, calculated_at, period_start, period_end
    FROM baselines
    WHERE user_id = $1
  `;

  const params: any[] = [userId];

  if (zoneId) {
    query += ' AND zone_id = $2';
    params.push(zoneId);
  } else {
    query += ' AND zone_id IS NULL';
  }

  query += ' ORDER BY calculated_at DESC LIMIT 1';

  const result = await pool.query(query, params);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  return {
    id: row.id,
    userId: row.user_id,
    zoneId: row.zone_id,
    averageDailyLiters: parseFloat(row.average_daily_liters),
    calculatedAt: row.calculated_at,
    periodStart: row.period_start,
    periodEnd: row.period_end,
  };
}

/**
 * Calculate water savings
 */
export async function calculateSavings(
  userId: string,
  timeRange: 'day' | 'week' | 'month'
): Promise<SavingsData> {
  if (useMockDb) {
    // Mock savings data
    const usage = await getCurrentUsage(userId, timeRange);
    const daysInRange = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;
    const mockBaseline = 150 * daysInRange; // 150L per day baseline
    
    const totalSaved = Math.max(0, mockBaseline - usage.total);
    const percentageReduction = mockBaseline > 0 ? (totalSaved / mockBaseline) * 100 : 0;
    const costSavings = totalSaved * WATER_COST_PER_LITER;

    return {
      totalSaved,
      percentageReduction,
      costSavings,
    };
  }

  const baseline = await getLatestBaseline(userId);

  if (!baseline) {
    return {
      totalSaved: 0,
      percentageReduction: 0,
      costSavings: 0,
    };
  }

  const usage = await getCurrentUsage(userId, timeRange);
  const daysInRange = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;
  const expectedUsage = baseline.averageDailyLiters * daysInRange;

  const totalSaved = Math.max(0, expectedUsage - usage.total);
  const percentageReduction = expectedUsage > 0 ? (totalSaved / expectedUsage) * 100 : 0;
  const costSavings = totalSaved * WATER_COST_PER_LITER;

  return {
    totalSaved,
    percentageReduction,
    costSavings,
  };
}

/**
 * Get usage data for chart visualization
 */
export async function getUsageChartData(
  userId: string,
  startDate: Date,
  endDate: Date,
  groupBy: 'hour' | 'day' = 'day'
): Promise<UsageDataPoint[]> {
  const dateFormat = groupBy === 'hour' 
    ? "DATE_TRUNC('hour', ur.timestamp)" 
    : "DATE_TRUNC('day', ur.timestamp)";

  const query = `
    SELECT ${dateFormat} as timestamp, SUM(ur.liters) as liters
    FROM usage_records ur
    JOIN zones z ON ur.zone_id = z.id
    WHERE z.user_id = $1 AND ur.timestamp >= $2 AND ur.timestamp <= $3
    GROUP BY ${dateFormat}
    ORDER BY timestamp ASC
  `;

  const result = await pool.query(query, [userId, startDate, endDate]);

  return result.rows.map((row) => ({
    timestamp: row.timestamp,
    liters: parseFloat(row.liters),
  }));
}

/**
 * Get usage by zone for comparison
 */
export async function getUsageByZone(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ zoneId: string; zoneName: string; liters: number }>> {
  const query = `
    SELECT z.id as zone_id, z.name as zone_name, COALESCE(SUM(ur.liters), 0) as liters
    FROM zones z
    LEFT JOIN usage_records ur ON z.id = ur.zone_id 
      AND ur.timestamp >= $2 AND ur.timestamp <= $3
    WHERE z.user_id = $1
    GROUP BY z.id, z.name
    ORDER BY liters DESC
  `;

  const result = await pool.query(query, [userId, startDate, endDate]);

  return result.rows.map((row) => ({
    zoneId: row.zone_id,
    zoneName: row.zone_name,
    liters: parseFloat(row.liters),
  }));
}
