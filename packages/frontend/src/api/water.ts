import { apiClient } from './client';

export interface DeployWaterRequest {
  zoneId: string;
  liters: number;
}

export interface DeploymentStatus {
  deploymentId: string;
  zoneId: string;
  requestedLiters: number;
  deployedLiters: number;
  status: string;
  progress: number;
}

export const waterApi = {
  deploy: async (data: DeployWaterRequest): Promise<any> => {
    const response = await apiClient.post('/api/water/deploy', data);
    return response.data;
  },

  stop: async (deploymentId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post('/api/water/stop', { deploymentId });
    return response.data;
  },

  emergencyStop: async (): Promise<{ success: boolean; stoppedDeployments: string[] }> => {
    const response = await apiClient.post('/api/water/emergency-stop');
    return response.data;
  },

  emergencyDeactivate: async (): Promise<{ success: boolean }> => {
    const response = await apiClient.post('/api/water/emergency-deactivate');
    return response.data;
  },

  getStatus: async (deploymentId: string): Promise<DeploymentStatus> => {
    const response = await apiClient.get(`/api/water/status/${deploymentId}`);
    return response.data;
  },

  getEmergencyStatus: async (): Promise<{ emergencyMode: boolean }> => {
    const response = await apiClient.get('/api/water/emergency-status');
    return response.data;
  },
};
