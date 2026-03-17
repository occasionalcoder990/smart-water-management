// Enum types matching PostgreSQL enums

export enum ZoneType {
  KITCHEN = 'kitchen',
  BATHROOM = 'bathroom',
  GARDEN = 'garden',
  LAUNDRY = 'laundry',
  OTHER = 'other',
}

export enum ZoneStatus {
  IDLE = 'idle',
  ACTIVE = 'active',
  ERROR = 'error',
}

export enum DeploymentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum RecommendationType {
  VOLUME_OPTIMIZATION = 'volume_optimization',
  SCHEDULE_OPTIMIZATION = 'schedule_optimization',
  LEAK_DETECTION = 'leak_detection',
  SEASONAL_ADJUSTMENT = 'seasonal_adjustment',
}

export enum RecommendationStatus {
  ACTIVE = 'active',
  ACCEPTED = 'accepted',
  DISMISSED = 'dismissed',
  EXPIRED = 'expired',
}

// Data model interfaces

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  email: string;
  createdAt: Date;
  lastLogin: Date | null;
}

export interface Zone {
  id: string;
  userId: string;
  name: string;
  type: ZoneType;
  maxVolume: number;
  status: ZoneStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deployment {
  id: string;
  zoneId: string;
  requestedLiters: number;
  deployedLiters: number;
  status: DeploymentStatus;
  startedAt: Date;
  completedAt: Date | null;
  errorMessage: string | null;
}

export interface UsageRecord {
  id: string;
  zoneId: string;
  deploymentId: string;
  liters: number;
  timestamp: Date;
  cost: number | null;
}

export interface Recommendation {
  id: string;
  userId: string;
  type: RecommendationType;
  zoneId: string | null;
  title: string;
  description: string;
  suggestedAction: Record<string, any>;
  estimatedSavings: number | null;
  status: RecommendationStatus;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface Baseline {
  id: string;
  userId: string;
  zoneId: string | null;
  averageDailyLiters: number;
  calculatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
}
