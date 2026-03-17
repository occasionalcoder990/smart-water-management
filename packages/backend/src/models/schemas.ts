import { z } from 'zod';
import {
  ZoneType,
  ZoneStatus,
  DeploymentStatus,
  RecommendationType,
  RecommendationStatus,
} from './types';

// Enum schemas
export const ZoneTypeSchema = z.nativeEnum(ZoneType);
export const ZoneStatusSchema = z.nativeEnum(ZoneStatus);
export const DeploymentStatusSchema = z.nativeEnum(DeploymentStatus);
export const RecommendationTypeSchema = z.nativeEnum(RecommendationType);
export const RecommendationStatusSchema = z.nativeEnum(RecommendationStatus);

// User schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(30),
  passwordHash: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
  lastLogin: z.date().nullable(),
});

export const CreateUserSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(8).max(100),
  email: z.string().email(),
});

export const LoginSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string(),
});

// Zone schemas
export const ZoneSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(50),
  type: ZoneTypeSchema,
  maxVolume: z.number().int().min(1).max(1000).default(1000),
  status: ZoneStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateZoneSchema = z.object({
  name: z.string().min(1).max(50),
  type: ZoneTypeSchema,
  maxVolume: z.number().int().min(1).max(1000).optional().default(1000),
});

export const UpdateZoneSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  type: ZoneTypeSchema.optional(),
  maxVolume: z.number().int().min(1).max(1000).optional(),
});

// Deployment schemas
export const DeploymentSchema = z.object({
  id: z.string().uuid(),
  zoneId: z.string().uuid(),
  requestedLiters: z.number().int().min(1).max(1000),
  deployedLiters: z.number().min(0),
  status: DeploymentStatusSchema,
  startedAt: z.date(),
  completedAt: z.date().nullable(),
  errorMessage: z.string().nullable(),
});

export const CreateDeploymentSchema = z.object({
  zoneId: z.string().uuid(),
  liters: z.number().int().min(1).max(1000),
});

// Usage record schemas
export const UsageRecordSchema = z.object({
  id: z.string().uuid(),
  zoneId: z.string().uuid(),
  deploymentId: z.string().uuid(),
  liters: z.number().min(0),
  timestamp: z.date(),
  cost: z.number().min(0).nullable(),
});

export const CreateUsageRecordSchema = z.object({
  zoneId: z.string().uuid(),
  deploymentId: z.string().uuid(),
  liters: z.number().min(0),
  cost: z.number().min(0).optional(),
});

// Recommendation schemas
export const RecommendationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: RecommendationTypeSchema,
  zoneId: z.string().uuid().nullable(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  suggestedAction: z.record(z.any()),
  estimatedSavings: z.number().min(0).nullable(),
  status: RecommendationStatusSchema,
  createdAt: z.date(),
  expiresAt: z.date().nullable(),
});

export const CreateRecommendationSchema = z.object({
  userId: z.string().uuid(),
  type: RecommendationTypeSchema,
  zoneId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  suggestedAction: z.record(z.any()),
  estimatedSavings: z.number().min(0).optional(),
  expiresAt: z.date().optional(),
});

// Baseline schemas
export const BaselineSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  zoneId: z.string().uuid().nullable(),
  averageDailyLiters: z.number().min(0),
  calculatedAt: z.date(),
  periodStart: z.date(),
  periodEnd: z.date(),
});

export const CreateBaselineSchema = z.object({
  userId: z.string().uuid(),
  zoneId: z.string().uuid().optional(),
  averageDailyLiters: z.number().min(0),
  periodStart: z.date(),
  periodEnd: z.date(),
});

// Query parameter schemas
export const TimeRangeSchema = z.enum(['day', 'week', 'month']);

export const UsageQuerySchema = z.object({
  timeRange: TimeRangeSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
