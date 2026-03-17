import { pool } from '../database/connection';
import { redisClient } from '../database/redis';
import { mockDb } from '../database/mock-db';
import { Deployment, DeploymentStatus, ZoneStatus } from '../models/types';
import { CreateDeploymentSchema } from '../models/schemas';
import { updateZoneStatus } from './zone.service';
import { recordUsage } from './usage.service';
import {
  broadcastDeploymentProgress,
  broadcastDeploymentComplete,
  broadcastDeploymentFailed,
  broadcastZoneStatusChange,
  broadcastEmergencyActivated,
} from './websocket.service';

const DEPLOYMENT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const useMockDb = process.env.USE_MOCK_DB === 'true';

interface DeploymentProgress {
  deploymentId: string;
  zoneId: string;
  requestedLiters: number;
  deployedLiters: number;
  status: DeploymentStatus;
  progress: number;
}

/**
 * Create a new water deployment
 */
export async function deployWater(
  zoneId: string,
  liters: number,
  userId: string
): Promise<Deployment> {
  // Validate input
  const validated = CreateDeploymentSchema.parse({ zoneId, liters });

  if (useMockDb) {
    // Mock database implementation
    const zone = await mockDb.getZoneById(validated.zoneId);
    
    if (!zone) {
      throw new Error('Zone not found');
    }

    if (zone.userId !== userId) {
      throw new Error('Unauthorized access to zone');
    }

    if (zone.status === 'active') {
      throw new Error('Zone already has an active deployment');
    }

    if (mockDb.getEmergencyMode()) {
      throw new Error('Emergency mode is active. Cannot start new deployments.');
    }

    // Create deployment
    const deployment = await mockDb.createDeployment({
      zoneId: validated.zoneId,
      requestedLiters: validated.liters,
      deployedLiters: 0,
      status: 'in_progress',
    });

    // Update zone status
    await mockDb.updateZone(validated.zoneId, { status: 'active' });

    // Simulate deployment completion after 2 seconds
    setTimeout(async () => {
      await completeDeployment(deployment.id);
    }, 2000);

    return {
      id: deployment.id,
      zoneId: deployment.zoneId,
      requestedLiters: deployment.requestedLiters,
      deployedLiters: deployment.deployedLiters,
      status: deployment.status as DeploymentStatus,
      startedAt: deployment.startedAt,
      completedAt: deployment.completedAt,
      errorMessage: deployment.errorMessage,
    };
  }

  // Real database implementation
  const zoneQuery = 'SELECT id, user_id, status FROM zones WHERE id = $1';
  const zoneResult = await pool.query(zoneQuery, [validated.zoneId]);

  if (zoneResult.rows.length === 0) {
    throw new Error('Zone not found');
  }

  if (zoneResult.rows[0].user_id !== userId) {
    throw new Error('Unauthorized access to zone');
  }

  if (zoneResult.rows[0].status === 'active') {
    throw new Error('Zone already has an active deployment');
  }

  const emergencyMode = await redisClient.get('emergency:mode');
  if (emergencyMode === 'active') {
    throw new Error('Emergency mode is active. Cannot start new deployments.');
  }

  const query = `
    INSERT INTO deployments (zone_id, requested_liters, status)
    VALUES ($1, $2, 'pending')
    RETURNING id, zone_id, requested_liters, deployed_liters, status, started_at, completed_at, error_message
  `;

  const result = await pool.query(query, [validated.zoneId, validated.liters]);
  const row = result.rows[0];

  const deployment: Deployment = {
    id: row.id,
    zoneId: row.zone_id,
    requestedLiters: row.requested_liters,
    deployedLiters: parseFloat(row.deployed_liters),
    status: row.status as DeploymentStatus,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorMessage: row.error_message,
  };

  await updateZoneStatus(validated.zoneId, ZoneStatus.ACTIVE);

  await redisClient.setEx(
    `deployment:${deployment.id}`,
    DEPLOYMENT_TIMEOUT_MS / 1000,
    JSON.stringify({
      deploymentId: deployment.id,
      zoneId: deployment.zoneId,
      requestedLiters: deployment.requestedLiters,
      deployedLiters: 0,
      status: 'in_progress',
      progress: 0,
    })
  );

  await updateDeploymentStatus(deployment.id, DeploymentStatus.IN_PROGRESS);

  return { ...deployment, status: DeploymentStatus.IN_PROGRESS };
}

/**
 * Stop an active deployment
 */
export async function stopDeployment(deploymentId: string, userId: string): Promise<boolean> {
  // Get deployment
  const deployment = await getDeployment(deploymentId);

  if (!deployment) {
    throw new Error('Deployment not found');
  }

  // Verify user owns the zone
  const zoneQuery = 'SELECT user_id FROM zones WHERE id = $1';
  const zoneResult = await pool.query(zoneQuery, [deployment.zoneId]);

  if (zoneResult.rows.length === 0 || zoneResult.rows[0].user_id !== userId) {
    throw new Error('Unauthorized');
  }

  // Check if deployment is active
  if (deployment.status !== DeploymentStatus.IN_PROGRESS && deployment.status !== DeploymentStatus.PENDING) {
    throw new Error('Deployment is not active');
  }

  // Update deployment status to cancelled
  await updateDeploymentStatus(deploymentId, DeploymentStatus.CANCELLED);

  // Update zone status to idle
  await updateZoneStatus(deployment.zoneId, ZoneStatus.IDLE);

  // Remove from Redis
  await redisClient.del(`deployment:${deploymentId}`);

  return true;
}

/**
 * Emergency stop - halt all active deployments
 */
export async function emergencyStop(userId: string): Promise<string[]> {
  if (useMockDb) {
    // Mock database implementation
    mockDb.setEmergencyMode(true);
    
    const activeDeployments = await mockDb.getActiveDeployments();
    const stoppedDeployments: string[] = [];

    for (const deployment of activeDeployments) {
      await mockDb.updateDeployment(deployment.id, {
        status: 'cancelled',
        completedAt: new Date(),
      });
      await mockDb.updateZone(deployment.zoneId, { status: 'idle' });
      stoppedDeployments.push(deployment.id);
    }

    broadcastEmergencyActivated({
      userId,
      stoppedDeployments,
      timestamp: new Date().toISOString(),
    });

    return stoppedDeployments;
  }

  // Real database implementation
  await redisClient.set('emergency:mode', 'active');

  const query = `
    SELECT d.id, d.zone_id
    FROM deployments d
    JOIN zones z ON d.zone_id = z.id
    WHERE z.user_id = $1 AND d.status IN ('pending', 'in_progress')
  `;

  const result = await pool.query(query, [userId]);
  const stoppedDeployments: string[] = [];

  for (const row of result.rows) {
    await updateDeploymentStatus(row.id, DeploymentStatus.CANCELLED);
    await updateZoneStatus(row.zone_id, ZoneStatus.IDLE);
    await redisClient.del(`deployment:${row.id}`);
    stoppedDeployments.push(row.id);
  }

  broadcastEmergencyActivated({
    userId,
    stoppedDeployments,
    timestamp: new Date().toISOString(),
  });

  return stoppedDeployments;
}

/**
 * Deactivate emergency mode
 */
export async function deactivateEmergency(userId: string): Promise<void> {
  if (useMockDb) {
    mockDb.setEmergencyMode(false);
  } else {
    await redisClient.del('emergency:mode');
  }
}

/**
 * Get deployment by ID
 */
export async function getDeployment(deploymentId: string): Promise<Deployment | null> {
  const query = `
    SELECT id, zone_id, requested_liters, deployed_liters, status, started_at, completed_at, error_message
    FROM deployments
    WHERE id = $1
  `;

  const result = await pool.query(query, [deploymentId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    zoneId: row.zone_id,
    requestedLiters: row.requested_liters,
    deployedLiters: parseFloat(row.deployed_liters),
    status: row.status as DeploymentStatus,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorMessage: row.error_message,
  };
}

/**
 * Get deployment status and progress
 */
export async function getDeploymentStatus(deploymentId: string): Promise<DeploymentProgress | null> {
  // Try to get from Redis first
  const cached = await redisClient.get(`deployment:${deploymentId}`);

  if (cached) {
    return JSON.parse(cached);
  }

  // Fall back to database
  const deployment = await getDeployment(deploymentId);

  if (!deployment) {
    return null;
  }

  const progress = deployment.requestedLiters > 0
    ? (deployment.deployedLiters / deployment.requestedLiters) * 100
    : 0;

  return {
    deploymentId: deployment.id,
    zoneId: deployment.zoneId,
    requestedLiters: deployment.requestedLiters,
    deployedLiters: deployment.deployedLiters,
    status: deployment.status,
    progress: Math.min(progress, 100),
  };
}

/**
 * Update deployment status
 */
export async function updateDeploymentStatus(
  deploymentId: string,
  status: DeploymentStatus,
  deployedLiters?: number,
  errorMessage?: string
): Promise<void> {
  const updates: string[] = ['status = $1'];
  const values: any[] = [status];
  let paramIndex = 2;

  if (deployedLiters !== undefined) {
    updates.push(`deployed_liters = $${paramIndex++}`);
    values.push(deployedLiters);
  }

  if (status === DeploymentStatus.COMPLETED || status === DeploymentStatus.FAILED || status === DeploymentStatus.CANCELLED) {
    updates.push(`completed_at = CURRENT_TIMESTAMP`);
  }

  if (errorMessage !== undefined) {
    updates.push(`error_message = $${paramIndex++}`);
    values.push(errorMessage);
  }

  values.push(deploymentId);

  const query = `
    UPDATE deployments
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
  `;

  await pool.query(query, values);
}

/**
 * Update deployment progress in Redis
 */
export async function updateDeploymentProgress(
  deploymentId: string,
  deployedLiters: number
): Promise<void> {
  const cached = await redisClient.get(`deployment:${deploymentId}`);

  if (!cached) {
    return;
  }

  const progress: DeploymentProgress = JSON.parse(cached);
  progress.deployedLiters = deployedLiters;
  progress.progress = (deployedLiters / progress.requestedLiters) * 100;

  await redisClient.setEx(
    `deployment:${deploymentId}`,
    DEPLOYMENT_TIMEOUT_MS / 1000,
    JSON.stringify(progress)
  );

  // Also update database
  await updateDeploymentStatus(deploymentId, DeploymentStatus.IN_PROGRESS, deployedLiters);

  // Broadcast progress update via WebSocket
  broadcastDeploymentProgress({
    deploymentId,
    zoneId: progress.zoneId,
    progress: progress.progress,
    litersDeployed: deployedLiters,
    litersRemaining: progress.requestedLiters - deployedLiters,
  });
}

/**
 * Complete a deployment
 */
export async function completeDeployment(deploymentId: string): Promise<void> {
  if (useMockDb) {
    // Mock database implementation
    const deployment = await mockDb.updateDeployment(deploymentId, {
      status: 'completed',
      deployedLiters: 0, // Will be set below
      completedAt: new Date(),
    });

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    // Update deployed liters to match requested
    await mockDb.updateDeployment(deploymentId, {
      deployedLiters: deployment.requestedLiters,
    });

    // Record usage
    await mockDb.createUsageRecord({
      zoneId: deployment.zoneId,
      deploymentId: deployment.id,
      liters: deployment.requestedLiters,
      cost: deployment.requestedLiters * 0.002,
    });

    // Update zone status to idle
    await mockDb.updateZone(deployment.zoneId, { status: 'idle' });

    // Broadcast completion
    broadcastDeploymentComplete({
      deploymentId,
      zoneId: deployment.zoneId,
      totalLiters: deployment.requestedLiters,
    });

    broadcastZoneStatusChange({
      zoneId: deployment.zoneId,
      status: 'idle',
      timestamp: new Date().toISOString(),
    });

    return;
  }

  // Real database implementation
  const deployment = await getDeployment(deploymentId);

  if (!deployment) {
    throw new Error('Deployment not found');
  }

  await updateDeploymentStatus(
    deploymentId,
    DeploymentStatus.COMPLETED,
    deployment.requestedLiters
  );

  await recordUsage(
    deployment.zoneId,
    deploymentId,
    deployment.requestedLiters
  );

  await updateZoneStatus(deployment.zoneId, ZoneStatus.IDLE);

  await redisClient.del(`deployment:${deploymentId}`);

  broadcastDeploymentComplete({
    deploymentId,
    zoneId: deployment.zoneId,
    totalLiters: deployment.requestedLiters,
  });

  broadcastZoneStatusChange({
    zoneId: deployment.zoneId,
    status: 'idle',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Fail a deployment
 */
export async function failDeployment(deploymentId: string, errorMessage: string): Promise<void> {
  const deployment = await getDeployment(deploymentId);

  if (!deployment) {
    throw new Error('Deployment not found');
  }

  // Update deployment status
  await updateDeploymentStatus(
    deploymentId,
    DeploymentStatus.FAILED,
    deployment.deployedLiters,
    errorMessage
  );

  // Update zone status to error
  await updateZoneStatus(deployment.zoneId, ZoneStatus.ERROR);

  // Remove from Redis
  await redisClient.del(`deployment:${deploymentId}`);

  // Broadcast failure via WebSocket
  broadcastDeploymentFailed({
    deploymentId,
    zoneId: deployment.zoneId,
    error: errorMessage,
  });

  broadcastZoneStatusChange({
    zoneId: deployment.zoneId,
    status: 'error',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Check if emergency mode is active
 */
export async function isEmergencyMode(): Promise<boolean> {
  if (useMockDb) {
    return mockDb.getEmergencyMode();
  }
  const mode = await redisClient.get('emergency:mode');
  return mode === 'active';
}
