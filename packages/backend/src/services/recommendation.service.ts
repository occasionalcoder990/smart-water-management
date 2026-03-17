import { pool } from '../database/connection';
import { mockDb } from '../database/mock-db';
import { Recommendation, RecommendationType, RecommendationStatus, Zone } from '../models/types';
import { getZones } from './zone.service';
import { getUsageHistory } from './usage.service';

const useMockDb = process.env.USE_MOCK_DB === 'true';

interface UsageStats {
  average: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
}

/**
 * Calculate statistics for usage data
 */
function calculateStats(values: number[]): UsageStats {
  if (values.length === 0) {
    return { average: 0, stdDev: 0, min: 0, max: 0, count: 0 };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const average = sum / values.length;

  const squaredDiffs = values.map((value) => Math.pow(value - average, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const min = Math.min(...values);
  const max = Math.max(...values);

  return { average, stdDev, min, max, count: values.length };
}

/**
 * Check if there's an anomaly in recent usage
 */
function hasAnomaly(recentValues: number[], average: number, stdDev: number): boolean {
  if (recentValues.length === 0 || stdDev === 0) {
    return false;
  }

  // Check if any recent value is more than 3 standard deviations from the mean
  return recentValues.some((value) => Math.abs(value - average) > 3 * stdDev);
}

/**
 * Detect seasonal patterns in usage data
 */
function detectSeasonalPattern(monthlyAverages: number[]): boolean {
  if (monthlyAverages.length < 4) {
    return false;
  }

  const stats = calculateStats(monthlyAverages);
  
  // If variance is more than 30% of the mean, consider it seasonal
  return stats.stdDev > stats.average * 0.3;
}

/**
 * Generate recommendations for a user
 */
export async function generateRecommendations(userId: string): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];
  const zones = await getZones(userId);

  // Analyze each zone
  for (const zone of zones) {
    // Get last 30 days of usage
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const usageHistory = await getUsageHistory(zone.id, startDate, endDate);

    if (usageHistory.length === 0) {
      continue; // Skip zones with no usage data
    }

    const litersArray = usageHistory.map((u) => u.liters);
    const stats = calculateStats(litersArray);

    // 1. Volume Optimization: Check for consistent over-deployment
    const optimalVolume = zone.maxVolume * 0.7; // Assume 70% of max is optimal
    if (stats.average > optimalVolume * 1.2) {
      const estimatedSavings = (stats.average - optimalVolume) * 30; // Monthly savings

      recommendations.push({
        id: '', // Will be set when inserted
        userId,
        type: RecommendationType.VOLUME_OPTIMIZATION,
        zoneId: zone.id,
        title: `Reduce water usage in ${zone.name}`,
        description: `Your average water deployment to ${zone.name} is ${stats.average.toFixed(1)}L, which is ${((stats.average / optimalVolume - 1) * 100).toFixed(0)}% higher than optimal. Consider reducing deployment volumes.`,
        suggestedAction: {
          currentAverage: stats.average,
          suggestedVolume: optimalVolume,
          zoneId: zone.id,
          zoneName: zone.name,
        },
        estimatedSavings,
        status: RecommendationStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: null,
      });
    }

    // 2. Leak Detection: Check for anomalies
    const last24Hours = usageHistory.filter((u) => {
      const hoursDiff = (endDate.getTime() - u.timestamp.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 24;
    });

    const recentLiters = last24Hours.map((u) => u.liters);
    if (hasAnomaly(recentLiters, stats.average, stats.stdDev)) {
      recommendations.push({
        id: '',
        userId,
        type: RecommendationType.LEAK_DETECTION,
        zoneId: zone.id,
        title: `Unusual water usage detected in ${zone.name}`,
        description: `Recent water usage in ${zone.name} shows unusual patterns that may indicate a leak or malfunction. Please inspect the zone.`,
        suggestedAction: {
          severity: 'high',
          zoneId: zone.id,
          zoneName: zone.name,
          recentAverage: calculateStats(recentLiters).average,
          normalAverage: stats.average,
        },
        estimatedSavings: null,
        status: RecommendationStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: null,
      });
    }

    // 3. Seasonal Adjustment: Check for seasonal patterns
    if (usageHistory.length >= 90) {
      // Need at least 3 months of data
      const monthlyAverages: number[] = [];
      
      for (let i = 0; i < 3; i++) {
        const monthStart = new Date();
        monthStart.setMonth(endDate.getMonth() - i - 1);
        const monthEnd = new Date();
        monthEnd.setMonth(endDate.getMonth() - i);

        const monthData = usageHistory.filter(
          (u) => u.timestamp >= monthStart && u.timestamp < monthEnd
        );

        if (monthData.length > 0) {
          const monthStats = calculateStats(monthData.map((u) => u.liters));
          monthlyAverages.push(monthStats.average);
        }
      }

      if (detectSeasonalPattern(monthlyAverages)) {
        const currentMonth = monthlyAverages[0];
        const previousMonth = monthlyAverages[1];
        const trend = currentMonth > previousMonth ? 'increasing' : 'decreasing';

        recommendations.push({
          id: '',
          userId,
          type: RecommendationType.SEASONAL_ADJUSTMENT,
          zoneId: zone.id,
          title: `Seasonal pattern detected in ${zone.name}`,
          description: `Water usage in ${zone.name} shows seasonal variation. Usage is ${trend}. Consider adjusting deployment volumes based on seasonal needs.`,
          suggestedAction: {
            zoneId: zone.id,
            zoneName: zone.name,
            trend,
            monthlyAverages,
            suggestedVolume: currentMonth,
          },
          estimatedSavings: null,
          status: RecommendationStatus.ACTIVE,
          createdAt: new Date(),
          expiresAt: null,
        });
      }
    }
  }

  // Store recommendations in database
  const storedRecommendations: Recommendation[] = [];
  for (const rec of recommendations) {
    const stored = await createRecommendation(rec);
    storedRecommendations.push(stored);
  }

  return storedRecommendations;
}

/**
 * Create a recommendation
 */
export async function createRecommendation(
  recommendation: Omit<Recommendation, 'id' | 'createdAt'>
): Promise<Recommendation> {
  const query = `
    INSERT INTO recommendations (
      user_id, type, zone_id, title, description, 
      suggested_action, estimated_savings, status, expires_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, user_id, type, zone_id, title, description, 
              suggested_action, estimated_savings, status, created_at, expires_at
  `;

  const result = await pool.query(query, [
    recommendation.userId,
    recommendation.type,
    recommendation.zoneId,
    recommendation.title,
    recommendation.description,
    JSON.stringify(recommendation.suggestedAction),
    recommendation.estimatedSavings,
    recommendation.status,
    recommendation.expiresAt,
  ]);

  const row = result.rows[0];

  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as RecommendationType,
    zoneId: row.zone_id,
    title: row.title,
    description: row.description,
    suggestedAction: row.suggested_action,
    estimatedSavings: row.estimated_savings ? parseFloat(row.estimated_savings) : null,
    status: row.status as RecommendationStatus,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

/**
 * Get active recommendations for a user
 */
export async function getRecommendations(userId: string): Promise<Recommendation[]> {
  if (useMockDb) {
    return mockDb.getRecommendationsByUserId(userId) as any;
  }

  const query = `
    SELECT id, user_id, type, zone_id, title, description, 
           suggested_action, estimated_savings, status, created_at, expires_at
    FROM recommendations
    WHERE user_id = $1 AND status = 'active'
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query, [userId]);

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    type: row.type as RecommendationType,
    zoneId: row.zone_id,
    title: row.title,
    description: row.description,
    suggestedAction: row.suggested_action,
    estimatedSavings: row.estimated_savings ? parseFloat(row.estimated_savings) : null,
    status: row.status as RecommendationStatus,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

/**
 * Accept a recommendation and apply suggested settings
 */
export async function acceptRecommendation(
  recommendationId: string,
  userId: string
): Promise<{ success: boolean; appliedSettings: any }> {
  if (useMockDb) {
    // Mock database implementation
    const recommendations = await mockDb.getRecommendationsByUserId(userId);
    const recommendation = recommendations.find(r => r.id === recommendationId);

    if (!recommendation) {
      throw new Error('Recommendation not found');
    }

    // Apply suggested action based on type
    const appliedSettings: any = {};

    if (recommendation.type === 'volume_optimization') {
      const action = recommendation.suggestedAction;
      appliedSettings.zoneId = recommendation.zoneId;
      appliedSettings.newOptimalVolume = action.suggestedVolume;
    } else if (recommendation.type === 'schedule_optimization') {
      appliedSettings.zoneId = recommendation.zoneId;
      appliedSettings.recommendedHours = recommendation.suggestedAction.recommendedHours;
    } else if (recommendation.type === 'seasonal_adjustment') {
      appliedSettings.seasonalMultiplier = recommendation.suggestedAction.seasonalMultiplier;
    }

    // Update recommendation status
    await mockDb.updateRecommendation(recommendationId, { status: 'accepted' });

    return {
      success: true,
      appliedSettings,
    };
  }

  // Real database implementation
  const recQuery = `
    SELECT id, user_id, type, zone_id, suggested_action
    FROM recommendations
    WHERE id = $1 AND user_id = $2
  `;

  const recResult = await pool.query(recQuery, [recommendationId, userId]);

  if (recResult.rows.length === 0) {
    throw new Error('Recommendation not found');
  }

  const recommendation = recResult.rows[0];

  const appliedSettings: any = {};

  if (recommendation.type === RecommendationType.VOLUME_OPTIMIZATION) {
    const action = recommendation.suggested_action;
    appliedSettings.zoneId = action.zoneId;
    appliedSettings.newOptimalVolume = action.suggestedVolume;
  }

  await pool.query(
    'UPDATE recommendations SET status = $1 WHERE id = $2',
    [RecommendationStatus.ACCEPTED, recommendationId]
  );

  return {
    success: true,
    appliedSettings,
  };
}

/**
 * Dismiss a recommendation
 */
export async function dismissRecommendation(
  recommendationId: string,
  userId: string
): Promise<boolean> {
  if (useMockDb) {
    // Mock database implementation
    const recommendations = await mockDb.getRecommendationsByUserId(userId);
    const recommendation = recommendations.find(r => r.id === recommendationId);

    if (!recommendation) {
      return false;
    }

    await mockDb.updateRecommendation(recommendationId, { status: 'dismissed' });
    return true;
  }

  // Real database implementation
  const query = `
    UPDATE recommendations
    SET status = $1
    WHERE id = $2 AND user_id = $3
    RETURNING id
  `;

  const result = await pool.query(query, [
    RecommendationStatus.DISMISSED,
    recommendationId,
    userId,
  ]);

  return result.rows.length > 0;
}

/**
 * Expire old recommendations
 */
export async function expireOldRecommendations(): Promise<number> {
  const query = `
    UPDATE recommendations
    SET status = $1
    WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
    RETURNING id
  `;

  const result = await pool.query(query, [RecommendationStatus.EXPIRED]);

  return result.rows.length;
}
