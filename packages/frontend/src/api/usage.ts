import { apiClient } from './client';

export interface UsageStats {
  total: number;
  byZone: Record<string, number>;
  savings: number;
}

export interface UsageDataPoint {
  timestamp: string;
  liters: number;
  zoneName?: string;
}

export interface SavingsData {
  totalSaved: number;
  percentageReduction: number;
  costSavings: number;
}

export const usageApi = {
  getCurrent: async (timeRange: 'day' | 'week' | 'month'): Promise<UsageStats> => {
    const response = await apiClient.get('/api/usage/current', {
      params: { timeRange },
    });
    return response.data;
  },

  getHistory: async (zoneId: string, startDate: string, endDate: string): Promise<{ data: UsageDataPoint[] }> => {
    const response = await apiClient.get(`/api/usage/history/${zoneId}`, {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getSavings: async (): Promise<SavingsData> => {
    const response = await apiClient.get('/api/usage/savings');
    return response.data;
  },
};
