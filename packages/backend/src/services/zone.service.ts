import { pool } from '../database/connection';
import { mockDb } from '../database/mock-db';
import { Zone, ZoneType, ZoneStatus } from '../models/types';
import { CreateZoneSchema, UpdateZoneSchema } from '../models/schemas';

const MAX_ZONES_PER_USER = 20;
const useMockDb = process.env.USE_MOCK_DB === 'true';

/**
 * Get all zones for a user
 */
export async function getZones(userId: string): Promise<Zone[]> {
  if (useMockDb) {
    return mockDb.getZonesByUserId(userId) as any;
  }

  const query = `
    SELECT id, user_id, name, type, max_volume, status, created_at, updated_at
    FROM zones
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query, [userId]);

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type as ZoneType,
    maxVolume: row.max_volume,
    status: row.status as ZoneStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Get a single zone by ID
 */
export async function getZone(zoneId: string, userId: string): Promise<Zone | null> {
  const query = `
    SELECT id, user_id, name, type, max_volume, status, created_at, updated_at
    FROM zones
    WHERE id = $1 AND user_id = $2
  `;

  const result = await pool.query(query, [zoneId, userId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type as ZoneType,
    maxVolume: row.max_volume,
    status: row.status as ZoneStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create a new zone
 */
export async function createZone(
  userId: string,
  name: string,
  type: ZoneType,
  maxVolume?: number
): Promise<Zone> {
  // Validate input
  const validated = CreateZoneSchema.parse({ name, type, maxVolume });

  // Check if user has reached maximum zones
  const countQuery = 'SELECT COUNT(*) FROM zones WHERE user_id = $1';
  const countResult = await pool.query(countQuery, [userId]);
  const zoneCount = parseInt(countResult.rows[0].count);

  if (zoneCount >= MAX_ZONES_PER_USER) {
    throw new Error(`Maximum ${MAX_ZONES_PER_USER} zones per user exceeded`);
  }

  // Insert zone
  const query = `
    INSERT INTO zones (user_id, name, type, max_volume)
    VALUES ($1, $2, $3, $4)
    RETURNING id, user_id, name, type, max_volume, status, created_at, updated_at
  `;

  const result = await pool.query(query, [
    userId,
    validated.name,
    validated.type,
    validated.maxVolume,
  ]);

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type as ZoneType,
    maxVolume: row.max_volume,
    status: row.status as ZoneStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Update a zone
 */
export async function updateZone(
  zoneId: string,
  userId: string,
  updates: { name?: string; type?: ZoneType; maxVolume?: number }
): Promise<Zone | null> {
  // Validate input
  const validated = UpdateZoneSchema.parse(updates);

  // Check if zone exists and belongs to user
  const existingZone = await getZone(zoneId, userId);
  if (!existingZone) {
    return null;
  }

  // Build dynamic update query
  const updateFields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (validated.name !== undefined) {
    updateFields.push(`name = $${paramIndex++}`);
    values.push(validated.name);
  }

  if (validated.type !== undefined) {
    updateFields.push(`type = $${paramIndex++}`);
    values.push(validated.type);
  }

  if (validated.maxVolume !== undefined) {
    updateFields.push(`max_volume = $${paramIndex++}`);
    values.push(validated.maxVolume);
  }

  if (updateFields.length === 0) {
    return existingZone; // No updates
  }

  // Add zone ID and user ID to values
  values.push(zoneId, userId);

  const query = `
    UPDATE zones
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
    RETURNING id, user_id, name, type, max_volume, status, created_at, updated_at
  `;

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type as ZoneType,
    maxVolume: row.max_volume,
    status: row.status as ZoneStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Delete a zone
 */
export async function deleteZone(zoneId: string, userId: string): Promise<boolean> {
  // Check if zone has active deployments
  const activeDeploymentQuery = `
    SELECT COUNT(*) FROM deployments
    WHERE zone_id = $1 AND status IN ('pending', 'in_progress')
  `;

  const activeResult = await pool.query(activeDeploymentQuery, [zoneId]);
  const activeCount = parseInt(activeResult.rows[0].count);

  if (activeCount > 0) {
    throw new Error('Cannot delete zone with active deployments');
  }

  // Delete zone
  const query = `
    DELETE FROM zones
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;

  const result = await pool.query(query, [zoneId, userId]);

  return result.rows.length > 0;
}

/**
 * Update zone status
 */
export async function updateZoneStatus(
  zoneId: string,
  status: ZoneStatus
): Promise<Zone | null> {
  const query = `
    UPDATE zones
    SET status = $1
    WHERE id = $2
    RETURNING id, user_id, name, type, max_volume, status, created_at, updated_at
  `;

  const result = await pool.query(query, [status, zoneId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type as ZoneType,
    maxVolume: row.max_volume,
    status: row.status as ZoneStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get zone count for a user
 */
export async function getZoneCount(userId: string): Promise<number> {
  const query = 'SELECT COUNT(*) FROM zones WHERE user_id = $1';
  const result = await pool.query(query, [userId]);
  return parseInt(result.rows[0].count);
}
