import { apiClient } from './client';

export interface Zone {
  id: string;
  userId: string;
  name: string;
  type: 'kitchen' | 'bathroom' | 'garden' | 'laundry' | 'other';
  maxVolume: number;
  status: 'idle' | 'active' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface CreateZoneRequest {
  name: string;
  type: string;
  maxVolume?: number;
}

export const zonesApi = {
  getAll: async (): Promise<{ zones: Zone[] }> => {
    const response = await apiClient.get('/api/zones');
    return response.data;
  },

  getById: async (zoneId: string): Promise<{ zone: Zone }> => {
    const response = await apiClient.get(`/api/zones/${zoneId}`);
    return response.data;
  },

  create: async (data: CreateZoneRequest): Promise<{ zone: Zone }> => {
    const response = await apiClient.post('/api/zones', data);
    return response.data;
  },

  update: async (zoneId: string, data: Partial<CreateZoneRequest>): Promise<{ zone: Zone }> => {
    const response = await apiClient.put(`/api/zones/${zoneId}`, data);
    return response.data;
  },

  delete: async (zoneId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/api/zones/${zoneId}`);
    return response.data;
  },
};
