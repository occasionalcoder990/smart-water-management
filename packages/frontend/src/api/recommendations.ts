import { apiClient } from './client';

export interface Recommendation {
  id: string;
  userId: string;
  type: 'volume_optimization' | 'schedule_optimization' | 'leak_detection' | 'seasonal_adjustment';
  zoneId: string | null;
  title: string;
  description: string;
  suggestedAction: any;
  estimatedSavings: number;
  status: 'active' | 'accepted' | 'dismissed' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export const recommendationsApi = {
  getAll: async (): Promise<{ recommendations: Recommendation[] }> => {
    const response = await apiClient.get('/api/recommendations');
    return response.data;
  },

  accept: async (id: string): Promise<{ success: boolean; appliedSettings: any }> => {
    const response = await apiClient.post(`/api/recommendations/${id}/accept`);
    return response.data;
  },

  dismiss: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`/api/recommendations/${id}/dismiss`);
    return response.data;
  },
};
