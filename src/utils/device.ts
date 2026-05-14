// src/utils/device.ts

/**
 * Retrieves a persistent unique identifier for the browser instance.
 * If one doesn't exist, it generates a new UUID and stores it.
 */
export const getDeviceId = (): string => {
  // Check if we are in a browser environment to avoid SSR errors
  if (typeof window === 'undefined') return 'server-side';

  let deviceId = localStorage.getItem('unique_device_id');
  
  if (!deviceId) {
    // Generate a new random UUID
    deviceId = crypto.randomUUID(); 
    localStorage.setItem('unique_device_id', deviceId);
  }
  
  return deviceId;
};