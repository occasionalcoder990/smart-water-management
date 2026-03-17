// Mock in-memory database for demo without Docker
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  username: string;
  passwordHash: string;
  email: string;
  createdAt: Date;
  lastLogin: Date | null;
}

interface Zone {
  id: string;
  userId: string;
  name: string;
  type: string;
  maxVolume: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Deployment {
  id: string;
  zoneId: string;
  requestedLiters: number;
  deployedLiters: number;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  errorMessage: string | null;
}

interface UsageRecord {
  id: string;
  zoneId: string;
  deploymentId: string;
  liters: number;
  timestamp: Date;
  cost: number;
}

interface Recommendation {
  id: string;
  userId: string;
  type: string;
  zoneId: string | null;
  title: string;
  description: string;
  suggestedAction: any;
  estimatedSavings: number;
  status: string;
  createdAt: Date;
  expiresAt: Date;
}

class MockDatabase {
  private users: Map<string, User> = new Map();
  private zones: Map<string, Zone> = new Map();
  private deployments: Map<string, Deployment> = new Map();
  private usageRecords: Map<string, UsageRecord> = new Map();
  private recommendations: Map<string, Recommendation> = new Map();
  private emergencyMode: boolean = false;

  constructor() {
    // Create a demo user
    const demoUser: User = {
      id: '00000000-0000-0000-0000-000000000001',
      username: 'admin',
      passwordHash: '$2b$10$rBV2kHZ5z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5', // any password works
      email: 'admin@example.com',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      lastLogin: new Date(),
    };
    this.users.set(demoUser.id, demoUser);

    // Create demo zones with realistic data
    const zones = [
      {
        id: uuidv4(),
        userId: demoUser.id,
        name: 'Kitchen Sink',
        type: 'kitchen',
        maxVolume: 500,
        status: 'idle',
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        userId: demoUser.id,
        name: 'Garden Sprinklers',
        type: 'garden',
        maxVolume: 1000,
        status: 'idle',
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        userId: demoUser.id,
        name: 'Master Bathroom',
        type: 'bathroom',
        maxVolume: 300,
        status: 'idle',
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        userId: demoUser.id,
        name: 'Laundry Room',
        type: 'laundry',
        maxVolume: 800,
        status: 'idle',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        userId: demoUser.id,
        name: 'Guest Bathroom',
        type: 'bathroom',
        maxVolume: 250,
        status: 'idle',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    ];

    zones.forEach(zone => this.zones.set(zone.id, zone));

    // Generate realistic usage history for the past 30 days
    const zoneArray = Array.from(this.zones.values());
    const now = Date.now();
    
    for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
      const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
      
      // Generate 3-8 usage records per day
      const recordsPerDay = Math.floor(Math.random() * 6) + 3;
      
      for (let i = 0; i < recordsPerDay; i++) {
        const zone = zoneArray[Math.floor(Math.random() * zoneArray.length)];
        const deploymentId = uuidv4();
        
        // Realistic water amounts based on zone type
        let liters = 0;
        switch (zone.type) {
          case 'kitchen':
            liters = Math.floor(Math.random() * 30) + 10; // 10-40L
            break;
          case 'garden':
            liters = Math.floor(Math.random() * 200) + 100; // 100-300L
            break;
          case 'bathroom':
            liters = Math.floor(Math.random() * 50) + 20; // 20-70L
            break;
          case 'laundry':
            liters = Math.floor(Math.random() * 100) + 50; // 50-150L
            break;
          default:
            liters = Math.floor(Math.random() * 50) + 10;
        }
        
        // Add some time variation within the day
        const timeOffset = Math.floor(Math.random() * 24 * 60 * 60 * 1000);
        const timestamp = new Date(date.getTime() + timeOffset);
        
        const usageRecord: UsageRecord = {
          id: uuidv4(),
          zoneId: zone.id,
          deploymentId,
          liters,
          timestamp,
          cost: liters * 0.002, // $0.002 per liter
        };
        
        this.usageRecords.set(usageRecord.id, usageRecord);
      }
    }

    // Create realistic AI recommendations
    const gardenZone = zoneArray.find(z => z.type === 'garden');
    const kitchenZone = zoneArray.find(z => z.type === 'kitchen');
    
    if (gardenZone) {
      const rec1: Recommendation = {
        id: uuidv4(),
        userId: demoUser.id,
        type: 'volume_optimization',
        zoneId: gardenZone.id,
        title: 'Reduce Garden Water Usage',
        description: 'Your garden is using 15% more water than optimal. Consider reducing deployment volumes.',
        suggestedAction: { suggestedVolume: 180, currentAverage: 207 },
        estimatedSavings: 810, // liters per month
        status: 'active',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      };
      this.recommendations.set(rec1.id, rec1);
    }

    if (kitchenZone) {
      const rec2: Recommendation = {
        id: uuidv4(),
        userId: demoUser.id,
        type: 'schedule_optimization',
        zoneId: kitchenZone.id,
        title: 'Optimize Kitchen Usage Time',
        description: 'Running water during peak hours increases costs. Consider shifting usage to off-peak times.',
        suggestedAction: { recommendedHours: [6, 7, 8, 22, 23] },
        estimatedSavings: 120, // liters per month
        status: 'active',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      };
      this.recommendations.set(rec2.id, rec2);
    }

    const rec3: Recommendation = {
      id: uuidv4(),
      userId: demoUser.id,
      type: 'seasonal_adjustment',
      zoneId: null,
      title: 'Winter Water Conservation',
      description: 'Winter season detected. Reduce overall water usage by 20% as plants require less water.',
      suggestedAction: { seasonalMultiplier: 0.8 },
      estimatedSavings: 1500, // liters per month
      status: 'active',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    this.recommendations.set(rec3.id, rec3);
  }

  // User methods
  async findUserByUsername(username: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'lastLogin'>): Promise<User> {
    const user: User = {
      id: uuidv4(),
      ...userData,
      createdAt: new Date(),
      lastLogin: null,
    };
    this.users.set(user.id, user);
    return user;
  }

  // Zone methods
  async getZonesByUserId(userId: string): Promise<Zone[]> {
    return Array.from(this.zones.values()).filter(z => z.userId === userId);
  }

  async getZoneById(id: string): Promise<Zone | null> {
    return this.zones.get(id) || null;
  }

  async createZone(zoneData: Omit<Zone, 'id' | 'createdAt' | 'updatedAt'>): Promise<Zone> {
    const zone: Zone = {
      id: uuidv4(),
      ...zoneData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.zones.set(zone.id, zone);
    return zone;
  }

  async updateZone(id: string, updates: Partial<Zone>): Promise<Zone | null> {
    const zone = this.zones.get(id);
    if (!zone) return null;
    
    const updated = { ...zone, ...updates, updatedAt: new Date() };
    this.zones.set(id, updated);
    return updated;
  }

  async deleteZone(id: string): Promise<boolean> {
    return this.zones.delete(id);
  }

  // Deployment methods
  async createDeployment(deploymentData: Omit<Deployment, 'id' | 'startedAt' | 'completedAt' | 'errorMessage'>): Promise<Deployment> {
    const deployment: Deployment = {
      id: uuidv4(),
      ...deploymentData,
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
    };
    this.deployments.set(deployment.id, deployment);
    return deployment;
  }

  async updateDeployment(id: string, updates: Partial<Deployment>): Promise<Deployment | null> {
    const deployment = this.deployments.get(id);
    if (!deployment) return null;
    
    const updated = { ...deployment, ...updates };
    this.deployments.set(id, updated);
    return updated;
  }

  async getActiveDeployments(): Promise<Deployment[]> {
    return Array.from(this.deployments.values()).filter(
      d => d.status === 'in_progress' || d.status === 'pending'
    );
  }

  // Usage methods
  async createUsageRecord(usageData: Omit<UsageRecord, 'id' | 'timestamp'>): Promise<UsageRecord> {
    const record: UsageRecord = {
      id: uuidv4(),
      ...usageData,
      timestamp: new Date(),
    };
    this.usageRecords.set(record.id, record);
    return record;
  }

  async getUsageByTimeRange(startDate: Date, endDate: Date): Promise<UsageRecord[]> {
    return Array.from(this.usageRecords.values()).filter(
      r => r.timestamp >= startDate && r.timestamp <= endDate
    );
  }

  // Recommendation methods
  async getRecommendationsByUserId(userId: string): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values()).filter(
      r => r.userId === userId && r.status === 'active'
    );
  }

  async updateRecommendation(id: string, updates: Partial<Recommendation>): Promise<Recommendation | null> {
    const rec = this.recommendations.get(id);
    if (!rec) return null;
    
    const updated = { ...rec, ...updates };
    this.recommendations.set(id, updated);
    return updated;
  }

  // Emergency mode
  getEmergencyMode(): boolean {
    return this.emergencyMode;
  }

  setEmergencyMode(mode: boolean): void {
    this.emergencyMode = mode;
  }
}

export const mockDb = new MockDatabase();
