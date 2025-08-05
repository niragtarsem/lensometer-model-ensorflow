// utils/deviceId.js
import { v4 as uuidv4 } from 'uuid';

const getDeviceId = () => {
  let deviceId;

  // Check if localStorage is available (not on server side during initial render)
  if (typeof window !== 'undefined') {
    deviceId = localStorage.getItem('deviceId');

    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem('deviceId', deviceId);
    }
  } else {
    // Fallback if localStorage is not available
    deviceId = uuidv4();
  }

  return deviceId;
};

export default getDeviceId;
