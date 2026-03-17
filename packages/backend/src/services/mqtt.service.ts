import mqtt, { MqttClient } from 'mqtt';
import dotenv from 'dotenv';
import {
  updateDeploymentProgress,
  completeDeployment,
  failDeployment,
  getDeployment,
} from './water.service';
import { mqttCircuitBreaker } from '../utils/circuit-breaker';
import { logger } from '../utils/logger';

dotenv.config();

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID || 'water-management-backend';
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;
const COMMAND_TIMEOUT_MS = 30000;

let mqttClient: MqttClient | null = null;
const pendingCommands = new Map<string, NodeJS.Timeout>();

/**
 * Connect to MQTT broker
 */
export async function connectMQTT(): Promise<void> {
  return new Promise((resolve, reject) => {
    mqttClient = mqtt.connect(MQTT_BROKER_URL, {
      clientId: MQTT_CLIENT_ID,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
    });

    mqttClient.on('connect', () => {
      console.log('✓ MQTT broker connected');
      
      // Subscribe to status topics
      mqttClient!.subscribe('house/+/zone/+/status', (err) => {
        if (err) {
          console.error('Failed to subscribe to status topics:', err);
        } else {
          console.log('✓ Subscribed to zone status updates');
        }
      });

      resolve();
    });

    mqttClient.on('error', (error) => {
      console.error('MQTT connection error:', error);
      reject(error);
    });

    mqttClient.on('message', handleMQTTMessage);

    mqttClient.on('offline', () => {
      console.warn('MQTT client offline');
    });

    mqttClient.on('reconnect', () => {
      console.log('MQTT client reconnecting...');
    });
  });
}

/**
 * Disconnect from MQTT broker
 */
export async function disconnectMQTT(): Promise<void> {
  if (mqttClient) {
    await mqttClient.endAsync();
    mqttClient = null;
    console.log('MQTT connection closed');
  }
}

/**
 * Handle incoming MQTT messages
 */
async function handleMQTTMessage(topic: string, message: Buffer): Promise<void> {
  try {
    const payload = JSON.parse(message.toString());
    
    // Parse topic: house/{houseId}/zone/{zoneId}/status
    const parts = topic.split('/');
    if (parts.length !== 5 || parts[0] !== 'house' || parts[2] !== 'zone' || parts[4] !== 'status') {
      console.warn('Invalid topic format:', topic);
      return;
    }

    const houseId = parts[1];
    const zoneId = parts[3];
    const { deploymentId, status, litersDeployed, error } = payload;

    if (!deploymentId) {
      console.warn('Missing deploymentId in status message');
      return;
    }

    // Clear timeout for this command
    const timeoutId = pendingCommands.get(deploymentId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      pendingCommands.delete(deploymentId);
    }

    // Handle different status updates
    switch (status) {
      case 'in_progress':
        if (litersDeployed !== undefined) {
          await updateDeploymentProgress(deploymentId, litersDeployed);
        }
        break;

      case 'completed':
        await completeDeployment(deploymentId);
        break;

      case 'failed':
      case 'error':
        await failDeployment(deploymentId, error || 'Device reported failure');
        break;

      default:
        console.warn('Unknown status:', status);
    }
  } catch (error) {
    console.error('Error handling MQTT message:', error);
  }
}

/**
 * Send deployment command to IoT device
 */
export async function sendDeploymentCommand(
  houseId: string,
  zoneId: string,
  deploymentId: string,
  liters: number,
  retryCount = 0
): Promise<void> {
  return mqttCircuitBreaker.execute(async () => {
    if (!mqttClient || !mqttClient.connected) {
      throw new Error('MQTT client not connected');
    }

    const topic = `house/${houseId}/zone/${zoneId}/command`;
    const command = {
      action: 'deploy',
      deploymentId,
      liters,
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      mqttClient!.publish(topic, JSON.stringify(command), { qos: 1 }, async (error) => {
        if (error) {
          logger.error('Failed to publish MQTT command', { error: error.message, topic });

          // Retry with exponential backoff
          if (retryCount < RETRY_ATTEMPTS) {
            const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
            logger.info(`Retrying MQTT command in ${delay}ms`, { attempt: retryCount + 1 });
            
            setTimeout(async () => {
              try {
                await sendDeploymentCommand(houseId, zoneId, deploymentId, liters, retryCount + 1);
                resolve();
              } catch (retryError) {
                reject(retryError);
              }
            }, delay);
          } else {
            reject(new Error('Failed to send command after retries'));
          }
          return;
        }

        // Set timeout for device response
        const timeoutId = setTimeout(async () => {
          pendingCommands.delete(deploymentId);
          await failDeployment(deploymentId, 'Device did not respond within timeout');
        }, COMMAND_TIMEOUT_MS);

        pendingCommands.set(deploymentId, timeoutId);
        resolve();
      });
    });
  });
}

/**
 * Send stop command to IoT device
 */
export async function sendStopCommand(
  houseId: string,
  zoneId: string,
  deploymentId: string
): Promise<void> {
  if (!mqttClient || !mqttClient.connected) {
    throw new Error('MQTT client not connected');
  }

  const topic = `house/${houseId}/zone/${zoneId}/command`;
  const command = {
    action: 'stop',
    deploymentId,
    timestamp: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    mqttClient!.publish(topic, JSON.stringify(command), { qos: 1 }, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Send emergency stop command to all zones
 */
export async function sendEmergencyStopAll(houseId: string): Promise<void> {
  if (!mqttClient || !mqttClient.connected) {
    throw new Error('MQTT client not connected');
  }

  const topic = `house/${houseId}/emergency`;
  const command = {
    action: 'emergency_stop',
    timestamp: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    mqttClient!.publish(topic, JSON.stringify(command), { qos: 1 }, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// Handle process termination
process.on('SIGINT', async () => {
  await disconnectMQTT();
});

process.on('SIGTERM', async () => {
  await disconnectMQTT();
});
